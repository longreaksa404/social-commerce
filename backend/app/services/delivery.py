"""Delivery (02_TECHNICAL.md section 7.3): the seller's delivery and
discount settings, and the delivery choice at checkout.

No courier integration in the MVP: the seller delivers (or sends
someone) and records each step by hand.
"""

from app.core.errors import AppError
from app.models import DeliveryMethod, Order, Store
from app.schemas.delivery import (
    DeliveryArea,
    DeliverySettings,
    DiscountSettings,
    ShopDeliveryOptions,
    ShopDeliveryOut,
    ShopPickup,
    ShopSellerDelivery,
)
from app.services.payment import ORDER_IS_OFF


def delivery_settings(store: Store) -> DeliverySettings:
    return DeliverySettings.model_validate(store.delivery_config)


def discount_settings(store: Store) -> DiscountSettings:
    return DiscountSettings.model_validate(store.discount_config)


def check_delivery_settings(settings: DeliverySettings) -> None:
    """Pickup needs an address to send customers to, area names must tell
    the areas apart, and a shop must offer at least one way."""
    if settings.pickup.enabled and not settings.pickup.address:
        raise AppError(
            422,
            "VALIDATION_ERROR",
            "Enter where customers pick up their orders.",
            "delivery_settings.pickup.address",
        )
    seen: set[str] = set()
    for index, area in enumerate(settings.seller_delivery.areas):
        key = area.name.casefold()
        if key in seen:
            raise AppError(
                422,
                "VALIDATION_ERROR",
                "Another area already has this name.",
                f"delivery_settings.seller_delivery.areas.{index}.name",
            )
        seen.add(key)
    if not settings.enabled_methods():
        raise AppError(422, "VALIDATION_ERROR", "Turn on delivery or pickup.", "delivery_settings")


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
    seller = settings.seller_delivery
    return ShopDeliveryOptions(
        seller_delivery=ShopSellerDelivery(
            areas=seller.areas,
            free_from_amount=seller.free_from_amount,
            free_from_items=seller.free_from_items,
        )
        if seller.enabled
        else None,
        pickup=ShopPickup(address=settings.pickup.address) if settings.pickup.enabled else None,
    )


def checkout_area(
    settings: DeliverySettings, method: DeliveryMethod, area_name: str | None
) -> DeliveryArea | None:
    """The method and area the customer chose, checked against the shop's
    current settings: the seller may have changed them since the customer
    opened the page."""
    if method not in settings.enabled_methods():
        raise AppError(
            409,
            "DELIVERY_METHOD_UNAVAILABLE",
            "This shop doesn't offer this any more. Choose another way to get your order.",
            "delivery_method",
        )
    areas = settings.seller_delivery.areas
    if method is DeliveryMethod.PICKUP or (not areas and area_name is None):
        return None
    if area_name is None:
        raise AppError(422, "VALIDATION_ERROR", "Choose where to deliver.", "delivery_area")
    area = next((a for a in areas if a.name == area_name), None)
    if area is None:
        raise AppError(
            409,
            "DELIVERY_AREA_UNAVAILABLE",
            "The shop changed its delivery areas. Choose again.",
            "delivery_area",
        )
    return area


def shop_delivery_out(store: Store, order: Order) -> ShopDeliveryOut:
    out = ShopDeliveryOut.model_validate(order.delivery)
    # The shop's current pickup address, like payment details: the seller
    # may have moved. Gone if they've turned pickup off since.
    pickup = delivery_settings(store).pickup
    if order.delivery.method is DeliveryMethod.PICKUP and order.status not in ORDER_IS_OFF:
        out.pickup_address = pickup.address if pickup.enabled else None
    return out
