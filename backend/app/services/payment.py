"""Payments (02_TECHNICAL.md sections 7.2 and 10): the seller's payment
settings and what the customer is shown to pay with.

No payment method is integrated with a provider in the MVP: the seller
checks their bank app or counts the cash and records it by hand.
"""

from app.core.errors import AppError
from app.models import Order, OrderStatus, PaymentMethod, PaymentStatus, Store
from app.schemas.payment import PaymentSettings, ShopBankAccount, ShopPaymentOut

# Nothing to pay for any more, so no payment details are shown.
ORDER_IS_OFF = frozenset({OrderStatus.REJECTED, OrderStatus.CANCELLED})


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
    return out
