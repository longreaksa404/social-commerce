import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin, TenantMixin, UUIDPrimaryKeyMixin
from app.models.account import Currency, str_enum
from app.models.catalog import Money
from app.models.delivery import Delivery, DeliveryMethod
from app.models.payment import Payment


class OrderStatus(enum.StrEnum):
    """02_TECHNICAL.md section 7.1; transitions live in app/services/order.py."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    PROCESSING = "processing"
    READY = "ready"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class Customer(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    """A guest customer of one store, matched by phone at checkout
    (02_TECHNICAL.md section 5.4). No login."""

    __tablename__ = "customer"
    __table_args__ = (UniqueConstraint("store_id", "phone"),)

    name: Mapped[str] = mapped_column(Text)  # as typed at their latest order
    phone: Mapped[str] = mapped_column(Text)  # normalized, see app/services/phone.py
    address: Mapped[str | None] = mapped_column(Text)  # their latest delivery address
    telegram_user_id: Mapped[str | None] = mapped_column(Text)


class Order(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    """Payment and delivery are separate tables with their own state
    machines; nothing here mirrors their status. total = subtotal -
    discount + delivery_fee."""

    __tablename__ = "order"
    # Read the DB-generated timestamps back (async can't lazy-load them).
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (
        UniqueConstraint("store_id", "number"),
        Index("ix_order_store_id_status", "store_id", "status"),
        Index("ix_order_store_id_created_at", "store_id", "created_at"),
        Index("ix_order_store_id_customer_id", "store_id", "customer_id"),
        CheckConstraint(
            "(delivery_lat IS NULL) = (delivery_lng IS NULL)", name="location_complete"
        ),
        CheckConstraint(
            "subtotal >= 0 AND discount >= 0 AND delivery_fee >= 0 AND total >= 0",
            name="money_not_negative",
        ),
    )

    # #1001, #1002, ... per store: what sellers and customers say in chat.
    # The id stays the real key and is what the tracking link uses.
    number: Mapped[int]
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customer.id"))
    status: Mapped[OrderStatus] = mapped_column(
        str_enum(OrderStatus, "status"), default=OrderStatus.PENDING, server_default="pending"
    )
    # The store's currency when the order was placed, so changing the
    # store's currency later doesn't relabel old totals.
    currency: Mapped[Currency] = mapped_column(str_enum(Currency, "currency"))
    subtotal: Mapped[Decimal] = mapped_column(Money)
    # The shop's bill discount, off the subtotal (app/services/pricing.py).
    discount: Mapped[Decimal] = mapped_column(Money, default=Decimal("0.00"), server_default="0")
    delivery_fee: Mapped[Decimal] = mapped_column(
        Money, default=Decimal("0.00"), server_default="0"
    )
    total: Mapped[Decimal] = mapped_column(Money)
    delivery_method: Mapped[DeliveryMethod] = mapped_column(
        str_enum(DeliveryMethod, "delivery_method")
    )
    # Null for pickup. A delivery has the typed address, the GPS location,
    # or both.
    delivery_address: Mapped[str | None] = mapped_column(Text)
    delivery_lat: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    delivery_lng: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    # For the driver, e.g. "blue gate, next to Wat Phnom".
    delivery_address_note: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(Text)  # link tracking, Phase 8
    notes: Mapped[str | None] = mapped_column(Text)  # from the customer
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped[Customer] = relationship(lazy="raise")
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="(OrderItem.product_name_snapshot, OrderItem.variant_name_snapshot)",
        lazy="raise",
    )
    # Every order has one, created with it at checkout.
    payment: Mapped[Payment] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="raise"
    )
    # Every order has one too, created with it at checkout.
    delivery: Mapped[Delivery] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="raise"
    )


class OrderItem(UUIDPrimaryKeyMixin, TenantMixin, Base):
    """One line of an order. The snapshots are what was bought: product
    names and prices may change, and variants may be deleted, later.

    store_id is denormalized from the order so RLS covers items directly
    (CLAUDE.md hard rule 1), as on product_variant.
    """

    __tablename__ = "order_item"
    __table_args__ = (
        Index("ix_order_item_store_id_order_id", "store_id", "order_id"),
        # For the ON DELETE SET NULL when a seller removes a variant.
        Index("ix_order_item_variant_id", "variant_id"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price_snapshot >= 0", name="price_not_negative"),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("order.id", ondelete="CASCADE"))
    # Products are only ever deactivated, never deleted (02 section 6.2).
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product.id"))
    # Variants removed from a product are deleted; the line keeps its
    # snapshots and loses only the link (decided 2026-10-02).
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("product_variant.id", ondelete="SET NULL")
    )
    product_name_snapshot: Mapped[str] = mapped_column(Text)
    variant_name_snapshot: Mapped[str | None] = mapped_column(Text)
    unit_price_snapshot: Mapped[Decimal] = mapped_column(Money)
    quantity: Mapped[int]
    line_total: Mapped[Decimal] = mapped_column(Money)

    order: Mapped[Order] = relationship(back_populates="items")
