import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin, TenantMixin, UUIDPrimaryKeyMixin
from app.models.account import str_enum

if TYPE_CHECKING:
    from app.models.order import Order


class DeliveryMethod(enum.StrEnum):
    SELLER_DELIVERY = "seller_delivery"
    PICKUP = "pickup"


class DeliveryStatus(enum.StrEnum):
    """02_TECHNICAL.md section 7.3; transitions live in app/services/delivery.py."""

    NOT_ASSIGNED = "not_assigned"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    FAILED = "failed"


class Delivery(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    """The delivery (or pickup) of one order, 1:1. Its status is its own
    state machine: nothing here follows the order's or the payment's
    status, or the other way round (CLAUDE.md hard rule 2).

    store_id is denormalized from the order so RLS covers deliveries
    directly, as on payment.
    """

    __tablename__ = "delivery"
    __mapper_args__ = {"eager_defaults": True}

    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("order.id", ondelete="CASCADE"), unique=True
    )
    method: Mapped[DeliveryMethod] = mapped_column(str_enum(DeliveryMethod, "method"))
    status: Mapped[DeliveryStatus] = mapped_column(
        str_enum(DeliveryStatus, "status"),
        default=DeliveryStatus.NOT_ASSIGNED,
        server_default="not_assigned",
    )
    # The courier the customer chose ("VET Express"), as the seller had
    # named it then; null for the seller's own delivery and for pickup.
    courier: Mapped[str | None] = mapped_column(Text)
    # Free text, e.g. "Sokha delivering, 012 999 888". No courier integration.
    assignee_note: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    order: Mapped["Order"] = relationship(back_populates="delivery")
