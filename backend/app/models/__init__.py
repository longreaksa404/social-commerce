"""Import every model here so Base.metadata is complete for Alembic."""

from app.models.account import (
    Currency,
    LoginProvider,
    OrderConfirmationMode,
    PhoneCheck,
    RefreshToken,
    Seller,
    SellerLogin,
    SellerRole,
    Store,
    StoreOldSlug,
)
from app.models.catalog import Category, Product, ProductStatus, ProductVariant
from app.models.delivery import Delivery, DeliveryMethod, DeliveryStatus
from app.models.link import LinkEvent, LinkEventType, LinkTarget, ShareableLink
from app.models.notification import (
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
)
from app.models.order import Customer, Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.plan import PlanPayment, PlanPaymentMethod, PlanPaymentStatus, PlanPeriod

__all__ = [
    "Category",
    "Currency",
    "Customer",
    "Delivery",
    "DeliveryMethod",
    "DeliveryStatus",
    "LinkEvent",
    "LinkEventType",
    "LinkTarget",
    "LoginProvider",
    "NotificationChannel",
    "NotificationLog",
    "NotificationStatus",
    "Order",
    "OrderConfirmationMode",
    "OrderItem",
    "OrderStatus",
    "Payment",
    "PaymentMethod",
    "PaymentStatus",
    "PhoneCheck",
    "PlanPayment",
    "PlanPaymentMethod",
    "PlanPaymentStatus",
    "PlanPeriod",
    "Product",
    "ProductStatus",
    "ProductVariant",
    "RefreshToken",
    "Seller",
    "SellerLogin",
    "SellerRole",
    "ShareableLink",
    "Store",
    "StoreOldSlug",
]
