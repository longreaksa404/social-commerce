"""Payments (02_TECHNICAL.md sections 7.2 and 10): the payment state
machine, the seller's payment settings, and what the customer is shown to
pay with.

No payment method is integrated with a provider in the MVP: the seller
checks their bank app or counts the cash and records it by hand.

The payment's status follows only its own state machine; nothing here
reads or sets the order's status (CLAUDE.md hard rule 2).
"""

from datetime import UTC, datetime

from app.core.errors import AppError
from app.models import Order, OrderStatus, Payment, PaymentMethod, PaymentStatus, Store
from app.schemas.payment import PaymentSettings, ShopBankAccount, ShopKhqr, ShopPaymentOut
from app.services.khqr import individual_khqr

P = PaymentStatus

ALLOWED_PAYMENT_TRANSITIONS: dict[PaymentStatus, frozenset[PaymentStatus]] = {
    P.PENDING: frozenset({P.PAID, P.FAILED}),
    # "Not paid after all" (founder's pick 2C, 2026-10-09): a wrong tap, or
    # a transfer that never arrived, goes back to pending at any time.
    # paid -> refunded is in the schema but not in the MVP (02 section 7.2).
    P.PAID: frozenset({P.PENDING}),
    P.FAILED: frozenset({P.PENDING}),
    P.REFUNDED: frozenset(),
}

# Nothing to pay for any more, so no payment details are shown.
ORDER_IS_OFF = frozenset({OrderStatus.REJECTED, OrderStatus.CANCELLED})


def check_transition(current: PaymentStatus, target: PaymentStatus) -> None:
    if target not in ALLOWED_PAYMENT_TRANSITIONS[current]:
        raise AppError(
            409,
            "INVALID_PAYMENT_TRANSITION",
            f"This payment is {current.value}, so it can't be marked {target.value}.",
            "status",
        )


def next_statuses(payment: Payment) -> list[PaymentStatus]:
    """What the seller can record now, in state-machine order."""
    return [s for s in P if s in ALLOWED_PAYMENT_TRANSITIONS[payment.status]]


def record(payment: Payment, target: PaymentStatus, reference: str | None) -> None:
    """The one place a payment's status changes. The caller locks the order
    first and commits after."""
    check_transition(payment.status, target)
    payment.status = target
    if target is P.PAID:
        payment.paid_at = datetime.now(UTC)
    if target is P.PENDING:
        # Back to not paid: the time and the note were about what's undone.
        payment.paid_at = None
        payment.reference = None
    if reference:
        payment.reference = reference


def payment_settings(store: Store) -> PaymentSettings:
    return PaymentSettings.model_validate(store.payment_config)


def check_payment_settings(settings: PaymentSettings) -> None:
    """A method can only be on with the details a customer needs for it,
    and a shop must take at least one."""
    required = {
        "bank_transfer": (
            settings.bank_transfer.enabled,
            {
                "bank_name": "Enter the bank's name.",
                "account_name": "Enter the name on the account.",
                "account_number": "Enter the account number.",
            },
        ),
        "khqr": (
            settings.khqr.enabled,
            {
                "bakong_account_id": "Enter your Bakong ID.",
                "merchant_name": "Enter the name customers will see.",
            },
        ),
    }
    for method, (enabled, fields) in required.items():
        if not enabled:
            continue
        for field, message in fields.items():
            if not getattr(getattr(settings, method), field):
                field_path = f"payment_settings.{method}.{field}"
                raise AppError(422, "VALIDATION_ERROR", message, field_path)
    if not settings.enabled_methods():
        raise AppError(
            422, "VALIDATION_ERROR", "Turn on at least one way to pay.", "payment_settings"
        )


def check_method_available(store: Store, method: PaymentMethod) -> None:
    """At checkout: the seller may have turned this method off since the
    customer opened the page."""
    if method not in payment_settings(store).enabled_methods():
        raise AppError(
            409,
            "PAYMENT_METHOD_UNAVAILABLE",
            "This shop doesn't take this way to pay any more. Choose another.",
            "payment_method",
        )


def shop_payment_out(store: Store, order: Order) -> ShopPaymentOut:
    payment = order.payment
    out = ShopPaymentOut(method=payment.method, status=payment.status, amount=payment.amount)
    if payment.status is not PaymentStatus.PENDING or order.status in ORDER_IS_OFF:
        return out

    # The store's current details, not a copy from when the order was
    # placed: an account the seller has since replaced may be closed.
    settings = payment_settings(store)
    if payment.method is PaymentMethod.BANK_TRANSFER and settings.bank_transfer.enabled:
        bank = settings.bank_transfer
        out.bank_account = ShopBankAccount(
            bank_name=bank.bank_name,
            account_name=bank.account_name,
            account_number=bank.account_number,
        )
    if payment.method is PaymentMethod.KHQR and settings.khqr.enabled:
        code = individual_khqr(
            bakong_account_id=settings.khqr.bakong_account_id,
            merchant_name=settings.khqr.merchant_name,
            currency=order.currency,
            amount=payment.amount,
            bill_number=f"#{order.number}",
            now=datetime.now(UTC),
        )
        if code is not None:
            out.khqr = ShopKhqr(code=code, merchant_name=settings.khqr.merchant_name)
    return out
