"""Delivery (02_TECHNICAL.md section 7.3): the delivery state machine,
the seller's delivery and discount settings, and the delivery choice at
checkout.

No courier integration in the MVP: the seller delivers (or sends
someone) and records each step by hand.

The delivery's status follows only its own state machine; nothing here
reads or sets the order's or the payment's (CLAUDE.md hard rule 2).
"""

from app.core.errors import AppError
from app.models import Delivery, DeliveryMethod, DeliveryStatus, Order, Store
from app.schemas.delivery import (
    DeliverySettings,
    DiscountSettings,
    ShopDeliveryOptions,
    ShopDeliveryOut,
    ShopPickup,
)
from app.services.payment import ORDER_IS_OFF

D = DeliveryStatus

ALLOWED_DELIVERY_TRANSITIONS: dict[
    DeliveryMethod, dict[DeliveryStatus, frozenset[DeliveryStatus]]
] = {
    # The steps in between are optional (founder's pick 1C, 2026-10-09): a
    # seller who hands it over themselves taps Delivered straight away.
    # Failing needs it to have been sent out.
    DeliveryMethod.SELLER_DELIVERY: {
        D.NOT_ASSIGNED: frozenset({D.ASSIGNED, D.PICKED_UP, D.IN_TRANSIT, D.DELIVERED}),
        D.ASSIGNED: frozenset({D.PICKED_UP, D.IN_TRANSIT, D.DELIVERED, D.FAILED}),
        D.PICKED_UP: frozenset({D.IN_TRANSIT, D.DELIVERED, D.FAILED}),
        D.IN_TRANSIT: frozenset({D.DELIVERED, D.FAILED}),
        D.DELIVERED: frozenset(),
        # Nobody home: try again, maybe with someone else (decided
        # 2026-10-03), or it went through on a second try.
        D.FAILED: frozenset({D.ASSIGNED, D.DELIVERED}),
    },
    # Pickup skips the steps in between: the seller marks it when the
    # customer collects.
    DeliveryMethod.PICKUP: {
        D.NOT_ASSIGNED: frozenset({D.DELIVERED}),
        D.ASSIGNED: frozenset(),
        D.PICKED_UP: frozenset(),
        D.IN_TRANSIT: frozenset(),
        D.DELIVERED: frozenset(),
        D.FAILED: frozenset(),
    },
}


def check_transition(
    method: DeliveryMethod, current: DeliveryStatus, target: DeliveryStatus
) -> None:
    if target not in ALLOWED_DELIVERY_TRANSITIONS[method][current]:
        raise AppError(
            409,
            "INVALID_DELIVERY_TRANSITION",
            f"This delivery is {current.value.replace('_', ' ')}, so it can't be marked "
            f"{target.value.replace('_', ' ')}.",
            "status",
        )


def next_statuses(delivery: Delivery) -> list[DeliveryStatus]:
    """Where the seller can move it now, in state-machine order."""
    allowed = ALLOWED_DELIVERY_TRANSITIONS[delivery.method][delivery.status]
    return [s for s in D if s in allowed]


def record(delivery: Delivery, target: DeliveryStatus, assignee_note: str | None) -> None:
    """The one place a delivery's status changes. The caller locks the
    order first and commits after."""
    check_transition(delivery.method, delivery.status, target)
    delivery.status = target
    if assignee_note:
        delivery.assignee_note = assignee_note


def delivery_settings(store: Store) -> DeliverySettings:
    return DeliverySettings.model_validate(store.delivery_config)


def discount_settings(store: Store) -> DiscountSettings:
    return DiscountSettings.model_validate(store.discount_config)


def check_delivery_settings(settings: DeliverySettings) -> None:
    """Pickup needs an address to send customers to, courier names must
    tell them apart, and a shop must offer at least one way."""
    if settings.pickup.enabled and not settings.pickup.address:
        raise AppError(
            422,
            "VALIDATION_ERROR",
            "Enter where customers pick up their orders.",
            "delivery_settings.pickup.address",
        )
    seen: set[str] = set()
    for index, name in enumerate(settings.couriers):
        if name.casefold() in seen:
            raise AppError(
                422,
                "VALIDATION_ERROR",
                "This courier is already on the list.",
                f"delivery_settings.couriers.{index}",
            )
        seen.add(name.casefold())
    if not settings.enabled_methods():
        raise AppError(
            422,
            "VALIDATION_ERROR",
            "Turn on your own delivery, add a courier, or turn on pickup.",
            "delivery_settings",
        )


def check_discount_settings(settings: DiscountSettings) -> None:
    for index, rule in enumerate(settings.rules):
        field = f"discount_settings.rules.{index}.amount_off"
        if rule.amount_off <= 0:
            raise AppError(422, "VALIDATION_ERROR", "Enter how much to take off.", field)
        if rule.amount_off > rule.min_subtotal:
            raise AppError(
                422,
                "VALIDATION_ERROR",
                "The discount can't be more than the amount it starts from.",
                field,
            )


def shop_delivery_options(store: Store) -> ShopDeliveryOptions:
    settings = delivery_settings(store)
    return ShopDeliveryOptions(
        fee=settings.fee,
        free_from_amount=settings.free_from_amount,
        free_from_items=settings.free_from_items,
        own_delivery=settings.own_delivery.enabled,
        couriers=settings.couriers,
        pickup=ShopPickup(address=settings.pickup.address) if settings.pickup.enabled else None,
    )


def check_checkout_choice(
    settings: DeliverySettings, method: DeliveryMethod, courier: str | None
) -> str | None:
    """The courier for the order (null = the seller's own delivery or
    pickup), checked against the shop's current settings: the seller may
    have changed them since the customer opened the page."""
    if method not in settings.enabled_methods():
        raise AppError(
            409,
            "DELIVERY_METHOD_UNAVAILABLE",
            "This shop doesn't offer this any more. Choose another way to get your order.",
            "delivery_method",
        )
    if method is DeliveryMethod.PICKUP:
        return None
    own_delivery_gone = courier is None and not settings.own_delivery.enabled
    courier_gone = courier is not None and courier not in settings.couriers
    if own_delivery_gone or courier_gone:
        raise AppError(
            409,
            "DELIVERY_OPTION_UNAVAILABLE",
            "The shop changed how it delivers. Choose again.",
            "courier",
        )
    return courier


def shop_delivery_out(store: Store, order: Order) -> ShopDeliveryOut:
    out = ShopDeliveryOut.model_validate(order.delivery)
    # The shop's current pickup address, like payment details: the seller
    # may have moved. Gone if they've turned pickup off since.
    pickup = delivery_settings(store).pickup
    if order.delivery.method is DeliveryMethod.PICKUP and order.status not in ORDER_IS_OFF:
        out.pickup_address = pickup.address if pickup.enabled else None
    return out
