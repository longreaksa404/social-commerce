"""Sellers paying Oak Order through ABA PayWay (01_PRODUCT.md §33.1).

Pay now: a pending payment and PayWay's checkout form, which the seller's
browser posts; they pay on PayWay's page. Then PayWay calls back (POST
/payway/callback), the seller comes back to Settings → Plan, and the daily
run looks again. Each of these only makes us ask PayWay about the
transaction (payway.check_transaction), and only PayWay's answer marks a
payment paid, so a forged callback pays for nothing.

Auto-charge, monthly: a Pay now with `auto_charge` is a PayWay
subscription, which saves the seller's ABA account or card. PayWay sends
the token (POST /payway/token-callback); we ask PayWay for it again before
saving it. The daily run (POST /billing/run, called by cron-job.org)
charges each shop that has one on its start day, the day after its paid
time ends, and again each day of the 7 days to pay while it fails. The
seller hears on Telegram on the first failure and on day 5 (founder's
pick 3A); on day 8 the shop stops taking new orders (services/plan.py).

Writes go through their own unscoped session, filtered by store_id or
tran_id: app_user may only read plan_payment, and PayWay's callbacks and
the daily run have no tenant.
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.db.session import unscoped_session
from app.models import (
    PlanPayment,
    PlanPaymentMethod,
    PlanPaymentStatus,
    PlanPeriod,
    Seller,
    Store,
)
from app.schemas.plan import CheckoutOut, PlanPaymentOut, PlanStage
from app.services import notifications, payway
from app.services import plan as plan_service
from app.services.telegram import escape

logger = logging.getLogger(__name__)

M = PlanPaymentMethod
S = PlanPaymentStatus
ITEMS = {
    PlanPeriod.MONTH: "Oak Order Standard, 1 month",
    PlanPeriod.YEAR: "Oak Order Standard, 1 year",
}
# A checkout is open for an hour (payway.CHECKOUT_MINUTES); one still
# unpaid after two has been left. A charge PayWay hasn't settled in a day
# counts as failed, and is tried again.
CHECKOUT_GIVE_UP = timedelta(hours=2)
CHARGE_GIVE_UP = timedelta(days=1)
# Telegram after the first failed charge, and on day 5 of the 7 days to pay.
WARN_DAY = 5
CHARGE_FAILED = "plan_charge_failed"


def _not_configured() -> AppError:
    return AppError(
        503, "PAYWAY_NOT_CONFIGURED", "Paying in the app isn't set up yet. Message Oak Order."
    )


def _app_url() -> str:
    settings = get_settings()
    origin = settings.public_app_url or (settings.cors_origins[0] if settings.cors_origins else "")
    return origin.rstrip("/")


def _api_url(path: str) -> str | None:
    """Where PayWay calls back: only on a public address (not localhost);
    without one, the seller coming back and the daily run still settle."""
    base = get_settings().public_api_url.rstrip("/")
    return f"{base}/api/v1{path}" if base.startswith("https://") else None


async def start_checkout(
    store_id: uuid.UUID, period: PlanPeriod, auto_charge: str | None
) -> CheckoutOut:
    """Pay now: a pending payment, and the form for PayWay's checkout.
    `auto_charge` ("aba" or "card", monthly only) makes it a subscription
    that saves that account or card."""
    if not get_settings().payway_configured:
        raise _not_configured()
    async with unscoped_session() as db:
        store = await db.scalar(select(Store).where(Store.id == store_id).with_for_update())
        if store is None:
            raise NotFound("STORE_NOT_FOUND", "Store not found.")
        subscribe = None
        if auto_charge:
            if store.payway_ctid is None:
                store.payway_ctid = payway.new_ctid()
            subscribe = (store.payway_ctid, "abapay" if auto_charge == "aba" else "cards")
        payment = PlanPayment(
            store_id=store_id,
            period=period,
            amount=plan_service.PRICES[period],
            method=M.PAYWAY_SUBSCRIBE if auto_charge else M.PAYWAY,
            status=S.PENDING,
            tran_id=payway.new_tran_id(),
        )
        db.add(payment)
        await db.flush()
        plan_page = f"{_app_url()}/dashboard/settings/plan"
        form = payway.checkout_form(
            tran_id=payment.tran_id or "",
            amount=payment.amount,
            item=ITEMS[period],
            callback_url=_api_url("/payway/callback"),
            continue_url=f"{plan_page}?payment={payment.id}",
            cancel_url=plan_page,
            subscribe=subscribe,
        )
        await db.commit()
    return CheckoutOut(payment_id=payment.id, action=form.action, fields=form.fields)


def _given_up(payment: PlanPayment) -> bool:
    waited = datetime.now(UTC) - payment.created_at
    limit = CHARGE_GIVE_UP if payment.method is M.PAYWAY_AUTO else CHECKOUT_GIVE_UP
    return waited > limit


async def settle(tran_id: str) -> PlanPaymentStatus | None:
    """Ask PayWay about a pending payment and record its answer: paid (the
    shop is extended at once), failed, or still pending. Returns the
    payment's status after (None: not ours)."""
    async with unscoped_session() as db:
        payment = await db.scalar(select(PlanPayment).where(PlanPayment.tran_id == tran_id))
        if payment is None or payment.status is not S.PENDING:
            return None if payment is None else payment.status
    try:
        found = await payway.check_transaction(tran_id)
    except payway.PaywayError as exc:
        logger.warning("PayWay check failed: %s", exc)
        return S.PENDING
    async with unscoped_session() as db:
        # Locked and read again: a callback and the seller's page may ask together.
        payment = await db.scalar(
            select(PlanPayment).where(PlanPayment.tran_id == tran_id).with_for_update()
        )
        assert payment is not None
        if payment.status is not S.PENDING:
            return payment.status
        if found.state == "approved":
            if found.amount is not None and (
                found.amount != payment.amount or found.currency not in (None, "USD")
            ):
                payment.status = S.FAILED
                payment.failure = f"PayWay says {found.amount} {found.currency}, not this price"
                logger.error("PayWay amount mismatch on %s", tran_id)
            else:
                store = await db.scalar(
                    select(Store).where(Store.id == payment.store_id).with_for_update()
                )
                assert store is not None
                plan_service.mark_paid(payment, store)
        elif found.state == "declined":
            payment.status = S.FAILED
            payment.failure = payment.failure or "Payment was declined"
        elif _given_up(payment):
            payment.status = S.FAILED
            payment.failure = payment.failure or "Not paid"
        await db.commit()
        status, method = payment.status, payment.method
    if status is S.PAID and method is M.PAYWAY_SUBSCRIBE:
        # The token callback may come late, or not at all: fetch it.
        await save_token(tran_id)
    return status


async def check_payment(
    db: AsyncSession, store_id: uuid.UUID, payment_id: uuid.UUID
) -> PlanPaymentOut:
    """The seller back from PayWay's page: asks PayWay if it's still pending."""
    payment = await db.scalar(
        select(PlanPayment).where(PlanPayment.id == payment_id, PlanPayment.store_id == store_id)
    )
    if payment is None:
        raise NotFound("PAYMENT_NOT_FOUND", "Payment not found.")
    if payment.status is S.PENDING and payment.tran_id and get_settings().payway_configured:
        await settle(payment.tran_id)
        await db.refresh(payment)
    return PlanPaymentOut.model_validate(payment)


async def save_token(request_id: str) -> bool:
    """Save the ABA account or card a subscription (our tran_id) linked:
    asked of PayWay, never taken from a callback's body. Replaces the
    shop's earlier one, which is then removed at PayWay."""
    try:
        token = await payway.token_details(request_id)
    except payway.PaywayError as exc:
        logger.warning("PayWay token details failed: %s", exc)
        return False
    if token is None or not token.active:
        return False
    async with unscoped_session() as db:
        payment = await db.scalar(
            select(PlanPayment).where(
                PlanPayment.tran_id == request_id, PlanPayment.method == M.PAYWAY_SUBSCRIBE
            )
        )
        if payment is None:
            return False
        store = await db.scalar(select(Store).where(Store.id == payment.store_id).with_for_update())
        assert store is not None
        if store.payway_ctid != token.ctid:
            logger.error("PayWay token for another customer id on %s", request_id)
            return False
        old = store.payway_token
        if old != token.pwt:
            store.payway_token = token.pwt
            store.payway_token_label = token.label
            await db.commit()
    if old and old != token.pwt:
        await _remove_at_payway(token.ctid, old)
    return True


async def _remove_at_payway(ctid: str, pwt: str) -> None:
    try:
        if not await payway.remove_token(ctid, pwt):
            logger.error("PayWay didn't remove a token for %s", ctid)
    except payway.PaywayError as exc:
        logger.error("PayWay remove token failed: %s", exc)


async def turn_off_auto_charge(store_id: uuid.UUID) -> None:
    """No more charges: forgotten here at once, and removed at PayWay."""
    async with unscoped_session() as db:
        store = await db.scalar(select(Store).where(Store.id == store_id).with_for_update())
        if store is None:
            raise NotFound("STORE_NOT_FOUND", "Store not found.")
        ctid, pwt = store.payway_ctid, store.payway_token
        store.payway_token = None
        store.payway_token_label = None
        await db.commit()
    if ctid and pwt and get_settings().payway_configured:
        await _remove_at_payway(ctid, pwt)


@dataclass
class RunSummary:
    settled: int = 0  # pending payments PayWay answered for
    charged: int = 0  # auto-charges paid
    failed: int = 0  # auto-charges that failed


async def run_daily() -> RunSummary:
    """Once a day (cron-job.org): settle what's pending, then auto-charge
    the shops whose paid time has run out, up to 7 days ago."""
    summary = RunSummary()
    if not get_settings().payway_configured:
        return summary
    async with unscoped_session() as db:
        pending = list(
            await db.scalars(
                select(PlanPayment.tran_id).where(
                    PlanPayment.status == S.PENDING, PlanPayment.tran_id.is_not(None)
                )
            )
        )
    for tran_id in pending:
        if tran_id and await settle(tran_id) is not S.PENDING:
            summary.settled += 1

    today = clock.today()
    async with unscoped_session() as db:
        due = list(
            await db.scalars(
                select(Store.id)
                .join(Seller, Seller.id == Store.seller_id)
                .where(
                    Store.payway_token.is_not(None),
                    Seller.is_active.is_(True),
                    Store.paid_until < today,
                    Store.paid_until >= today - timedelta(days=plan_service.GRACE_DAYS),
                )
            )
        )
    for store_id in due:
        status = await charge(store_id)
        if status is S.PAID:
            summary.charged += 1
        elif status is S.FAILED:
            summary.failed += 1
    logger.info("Billing run: %s", summary)
    return summary


async def charge(store_id: uuid.UUID) -> PlanPaymentStatus | None:
    """One auto-charge, at most one a day, while the shop is in its 7 days
    to pay. Returns its status (None: nothing to do today)."""
    today = clock.today()
    async with unscoped_session() as db:
        store = await db.scalar(select(Store).where(Store.id == store_id).with_for_update())
        if (
            store is None
            or store.payway_ctid is None
            or store.payway_token is None
            or plan_service.stage(store.paid_until, today) is not PlanStage.OVERDUE
        ):
            return None
        tried = await db.scalar(
            select(func.count()).where(
                PlanPayment.store_id == store_id,
                PlanPayment.method == M.PAYWAY_AUTO,
                or_(
                    PlanPayment.status == S.PENDING,
                    PlanPayment.created_at >= plan_service.day_start(today),
                ),
            )
        )
        if tried:
            return None
        payment = PlanPayment(
            store_id=store_id,
            period=PlanPeriod.MONTH,
            amount=plan_service.PRICES[PlanPeriod.MONTH],
            method=M.PAYWAY_AUTO,
            status=S.PENDING,
            tran_id=payway.new_tran_id(),
        )
        db.add(payment)
        await db.commit()
        tran_id, ctid, pwt = payment.tran_id or "", store.payway_ctid, store.payway_token
    try:
        result = await payway.charge_token(
            tran_id=tran_id,
            ctid=ctid,
            pwt=pwt,
            amount=payment.amount,
            callback_url=_api_url("/payway/callback"),
        )
    except payway.PaywayError as exc:
        # No answer: it may have gone through. Settled by the next run.
        logger.warning("PayWay charge failed to send: %s", exc)
        return S.PENDING
    if result.accepted:
        status = await settle(tran_id)
    else:
        status = await _refused(tran_id, result)
    if status is S.FAILED:
        await _tell_failed(store_id, today)
    return status


async def _refused(tran_id: str, result: payway.Charge) -> PlanPaymentStatus:
    async with unscoped_session() as db:
        payment = await db.scalar(
            select(PlanPayment).where(PlanPayment.tran_id == tran_id).with_for_update()
        )
        assert payment is not None
        payment.status = S.FAILED
        payment.failure = result.message or f"PayWay code {result.code}"
        if result.token_dead:
            # Expired or removed: no use trying it again.
            store = await db.scalar(
                select(Store).where(Store.id == payment.store_id).with_for_update()
            )
            assert store is not None
            store.payway_token = None
            store.payway_token_label = None
        await db.commit()
    return S.FAILED


async def _tell_failed(store_id: uuid.UUID, today: date) -> None:
    """Telegram, on the first failure since the paid time ran out and on
    day 5 of the 7 days to pay (founder's pick 3A)."""
    async with unscoped_session() as db:
        store = await db.get(Store, store_id)
        if store is None:
            return
        failures = await db.scalar(
            select(func.count()).where(
                PlanPayment.store_id == store_id,
                PlanPayment.method == M.PAYWAY_AUTO,
                PlanPayment.status == S.FAILED,
                PlanPayment.created_at >= plan_service.day_start(store.paid_until + timedelta(1)),
            )
        )
        day = (today - store.paid_until).days
        if failures != 1 and day != WARN_DAY and store.payway_token is not None:
            return
        text = charge_failed_text(
            label=store.payway_token_label,
            pay_by=plan_service.pay_by(store.paid_until),
            last_warning=day >= WARN_DAY,
        )
        await notifications.send_to_seller(
            db, store, CHARGE_FAILED, {"day": day}, text, _plan_button()
        )


KHMER_MONTHS = (
    "មករា",
    "កុម្ភៈ",
    "មីនា",
    "មេសា",
    "ឧសភា",
    "មិថុនា",
    "កក្កដា",
    "សីហា",
    "កញ្ញា",
    "តុលា",
    "វិច្ឆិកា",
    "ធ្នូ",
)


def khmer_day(day: date) -> str:
    """ "7 ធ្នូ", as the app writes days in Khmer."""
    return f"{day.day} {KHMER_MONTHS[day.month - 1]}"


def charge_failed_text(*, label: str | None, pay_by: date, last_warning: bool) -> str:
    """Khmer only, like every bot message (2026-10-09). `label` None: the
    saved account or card can't be used any more, so auto-charge is off."""
    price = f"${plan_service.PRICES[PlanPeriod.MONTH]}"
    by = khmer_day(pay_by)
    if label is None:
        return (
            "⚠️ <b>Oak Order</b>\n"
            f"គណនី ឬកាតដែលអ្នកបានរក្សាទុក មិនអាចប្រើបានទៀតទេ ដូច្នេះការគិតប្រាក់ {price} "
            "ស្វ័យប្រវត្តិត្រូវបានបិទ។\n"
            f"សូមបង់ត្រឹម {by} ក្នុង ការកំណត់ → គម្រោង ដើម្បីបន្តទទួលការកុម្ម៉ង់។"
        )
    if last_warning:
        return (
            "⚠️ <b>Oak Order</b>\n"
            f"ការគិតប្រាក់ {price} ពី {escape(label)} នៅតែមិនបានសម្រេច។\n"
            f"សូមបង់ត្រឹម {by} ក្នុង ការកំណត់ → គម្រោង បើមិនដូច្នោះទេ "
            "ហាងរបស់អ្នកនឹងឈប់ទទួលការកុម្ម៉ង់ថ្មី។"
        )
    return (
        "⚠️ <b>Oak Order</b>\n"
        f"យើងមិនអាចគិតប្រាក់ {price} ពី {escape(label)} សម្រាប់គម្រោងប្រចាំខែរបស់អ្នកបានទេ។ "
        "យើងនឹងព្យាយាមម្ដងទៀតរៀងរាល់ថ្ងៃ។\n"
        f"ហាងរបស់អ្នកនៅតែទទួលការកុម្ម៉ង់រហូតដល់ {by}។ អ្នកក៏អាចបង់ឥឡូវនេះ ក្នុង ការកំណត់ → គម្រោង។"
    )


def _plan_button() -> tuple[str, str] | None:
    """Telegram refuses buttons to non-https addresses such as localhost."""
    app = _app_url()
    if not app.startswith("https://"):
        return None
    return "បង់ឥឡូវនេះ", f"{app}/dashboard/settings/plan"
