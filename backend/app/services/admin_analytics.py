"""The admin's Analytics page: how Oak Order grows, month by month, from
what is already recorded (shops, orders, plan payments). Nothing new is
tracked for it, so a number the records can't answer isn't shown.

Oak Order's money (plan payments) and the sellers' sales (their orders)
stay apart: orders are counted, never added up as money here.

Months are Phnom Penh months; the current one runs to today. Test shops
(Tools → Make a test shop: an `test-…@example.com` login) are left out of
every number.

Definitions (also on the page):
- Paying shops: on the month's last day (today for this month), shops
  that had paid (more than $0) for a period not over yet, including one
  paid during the trial that starts after it. Monthly value: what they
  pay a month, a year's price / 12. Unlike Home's "If all renew", shops
  in their 7 days to pay after their period ended aren't counted.
- Trial to paid: of the shops whose free time has ended or that have
  paid, those that paid (more than $0) at least once. Free time given
  with a $0 payment is not paying.
- Renewed: of the paid periods that ended in the range, more than 7 days
  ago (the days to pay), those followed by another paid period.
- Quiet: open shops past setup with no order in 30 days.
"""

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.models import Order, PlanPayment, PlanPaymentStatus, PlanPeriod, Seller, Store
from app.schemas.admin import AdminAnalyticsOut, AdminMonthOut
from app.services import plan as plan_service
from app.services.admin_tools import is_test_login

QUIET_DAYS = 30
CENTS = Decimal("0.01")


def _pp_month(column):
    """A timestamp's month in Phnom Penh, "2026-11". Zone and format are
    written in the SQL, not bound, so GROUP BY matches the selection."""
    return func.to_char(
        func.timezone(literal_column("'Asia/Phnom_Penh'"), column), literal_column("'YYYY-MM'")
    )


def _month_starts(today: date, months: int) -> list[date]:
    first = today.replace(day=1)
    starts = [first]
    for _ in range(months - 1):
        first = (first - timedelta(days=1)).replace(day=1)
        starts.append(first)
    return starts[::-1]


def _month_end(start: date, today: date) -> date:
    following = (start + timedelta(days=32)).replace(day=1)
    return min(following - timedelta(days=1), today)


def _monthly(payment: PlanPayment) -> Decimal:
    return payment.amount if payment.period is PlanPeriod.MONTH else payment.amount / 12


@dataclass
class _Covered:
    shops: int
    month_plans: int
    year_plans: int
    value: Decimal


def _covered(paid: list[PlanPayment], day: date) -> _Covered:
    """The shops that have paid by `day` for a period not over on it, by
    the newest such payment."""
    by_store: dict[uuid.UUID, PlanPayment] = {}
    for p in paid:
        if p.paid_on <= day <= p.covers_until:
            current = by_store.get(p.store_id)
            if current is None or p.created_at > current.created_at:
                by_store[p.store_id] = p
    periods = list(by_store.values())
    return _Covered(
        shops=len(periods),
        month_plans=sum(p.period is PlanPeriod.MONTH for p in periods),
        year_plans=sum(p.period is PlanPeriod.YEAR for p in periods),
        value=sum((_monthly(p) for p in periods), Decimal("0")).quantize(CENTS),
    )


async def analytics(db: AsyncSession, months: int) -> AdminAnalyticsOut:
    today = clock.today()
    starts = _month_starts(today, months)
    since = datetime.combine(starts[0], datetime.min.time(), clock.PHNOM_PENH)

    stores = (
        await db.execute(
            select(
                Store.id, Store.created_at, Store.paid_until, Seller.email, Seller.is_active
            ).join(Seller, Seller.id == Store.seller_id)
        )
    ).all()
    test = {s.id for s in stores if is_test_login(s.email or "")}
    real = [s for s in stores if s.id not in test]

    def not_test(column):
        return column.not_in(test) if test else literal_column("true")

    signups = dict(
        (
            await db.execute(
                select(_pp_month(Store.created_at), func.count())
                .where(Store.created_at >= since, not_test(Store.id))
                .group_by(_pp_month(Store.created_at))
            )
        ).all()
    )
    order_rows = {
        month: (count, shops)
        for month, count, shops in (
            await db.execute(
                select(
                    _pp_month(Order.created_at),
                    func.count(),
                    func.count(func.distinct(Order.store_id)),
                )
                .where(Order.created_at >= since, not_test(Order.store_id))
                .group_by(_pp_month(Order.created_at))
            )
        ).all()
    }

    paid = [
        p
        for p in await db.scalars(
            select(PlanPayment).where(
                PlanPayment.status == PlanPaymentStatus.PAID, PlanPayment.amount > 0
            )
        )
        if p.store_id not in test
    ]
    collected: dict[str, dict[PlanPeriod, Decimal]] = defaultdict(
        lambda: {PlanPeriod.MONTH: Decimal("0"), PlanPeriod.YEAR: Decimal("0")}
    )
    counted: dict[str, int] = defaultdict(int)
    for p in paid:
        key = f"{p.paid_on:%Y-%m}"
        collected[key][p.period] += p.amount
        counted[key] += 1

    out_months = []
    for start in starts:
        key = f"{start:%Y-%m}"
        covered = _covered(paid, _month_end(start, today))
        orders, active = order_rows.get(key, (0, 0))
        out_months.append(
            AdminMonthOut(
                month=key,
                signups=signups.get(key, 0),
                orders=orders,
                active_shops=active,
                collected=collected[key][PlanPeriod.MONTH] + collected[key][PlanPeriod.YEAR],
                collected_month_plans=collected[key][PlanPeriod.MONTH],
                collected_year_plans=collected[key][PlanPeriod.YEAR],
                payments=counted[key],
                paying=covered.shops,
                monthly_value=covered.value,
            )
        )

    # Trial to paid: shops that paid, over those that paid or whose free
    # time is over.
    paid_shops = {p.store_id for p in paid}
    trial_over = {
        s.id for s in real if s.paid_until is not None and s.paid_until < today
    } - paid_shops
    # Renewals: paid periods ended in the range, their days to pay over.
    decided = today - timedelta(days=plan_service.GRACE_DAYS)
    ended = [p for p in paid if starts[0] <= p.covers_until < decided]
    renewed = sum(
        any(q.store_id == p.store_id and q.covers_from > p.covers_from for q in paid) for p in ended
    )
    # Quiet shops: open, past setup, no order in 30 days.
    quiet_since = datetime.combine(
        today - timedelta(days=QUIET_DAYS - 1), datetime.min.time(), clock.PHNOM_PENH
    )
    recent = set(
        await db.scalars(select(Order.store_id).where(Order.created_at >= quiet_since).distinct())
    )
    running = [s for s in real if s.is_active and s.paid_until is not None]
    now = _covered(paid, today)
    return AdminAnalyticsOut(
        through=today,
        months=out_months,
        trial_over=len(trial_over) + len(paid_shops),
        converted=len(paid_shops),
        renewals_due=len(ended),
        renewed=renewed,
        paying_month=now.month_plans,
        paying_year=now.year_plans,
        monthly_value=now.value,
        open_shops=sum(s.is_active for s in real),
        quiet_shops=sum(s.id not in recent for s in running),
        test_shops=len(test),
    )
