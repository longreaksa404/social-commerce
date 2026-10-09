"""The shop's numbers on the Orders tab (founder's picks 8B and 9B,
2026-10-09): orders, sales and what's still to collect for today, the last
7 days or this month, with sales per day for a small chart. Owner only.

Counts every order placed in the period except rejected and cancelled
ones (like a customer's "spent"). Days are Phnom Penh days. Each order
keeps the currency it was placed in, so money is per currency; the chart
uses the shop's current one.
"""

import uuid
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.clock import PHNOM_PENH
from app.models import Currency, Order, OrderStatus, Payment, PaymentStatus
from app.schemas.customer import AmountOut
from app.schemas.stats import DayOut, StatsOut

Period = Literal["today", "week", "month"]

NOT_SALES = (OrderStatus.REJECTED, OrderStatus.CANCELLED)


def _start_of(day: date) -> datetime:
    return datetime.combine(day, time(), PHNOM_PENH)


def period_days(period: Period, today: date) -> tuple[date, date, date]:
    """(first day counted, first day charted, last day): today and the week
    chart the last 7 days; the month charts its own days so far."""
    week_start = today - timedelta(days=6)
    if period == "today":
        return today, week_start, today
    if period == "week":
        return week_start, week_start, today
    month_start = today.replace(day=1)
    return month_start, month_start, today


def _amounts(totals: dict[Currency, Decimal]) -> list[AmountOut]:
    return [AmountOut(currency=c, amount=a) for c, a in sorted(totals.items()) if a]


async def shop_stats(
    db: AsyncSession, store_id: uuid.UUID, currency: Currency, period: Period
) -> StatsOut:
    today = clock.today()
    first, chart_first, last = period_days(period, today)
    rows = await db.execute(
        select(Order.created_at, Order.currency, Order.total, Payment.status, Payment.amount)
        .join(Payment, Payment.order_id == Order.id)
        .where(
            Order.store_id == store_id,
            Order.created_at >= _start_of(min(first, chart_first)),
            Order.created_at < _start_of(last + timedelta(days=1)),
            Order.status.not_in(NOT_SALES),
        )
    )
    orders = 0
    sales: dict[Currency, Decimal] = defaultdict(Decimal)
    to_collect: dict[Currency, Decimal] = defaultdict(Decimal)
    per_day: dict[date, tuple[int, Decimal]] = {}
    for created_at, order_currency, total, payment_status, payment_amount in rows:
        day = created_at.astimezone(PHNOM_PENH).date()
        if day >= first:
            orders += 1
            sales[order_currency] += total
            if payment_status is PaymentStatus.PENDING:
                to_collect[order_currency] += payment_amount
        if order_currency is currency:
            count, amount = per_day.get(day, (0, Decimal("0")))
            per_day[day] = (count + 1, amount + total)

    days = []
    day = chart_first
    while day <= last:
        count, amount = per_day.get(day, (0, Decimal("0")))
        days.append(DayOut(date=day, orders=count, sales=amount))
        day += timedelta(days=1)
    return StatsOut(
        period=period,
        first=first,
        last=last,
        currency=currency,
        orders=orders,
        sales=_amounts(sales),
        to_collect=_amounts(to_collect),
        days=days,
    )
