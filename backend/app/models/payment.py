import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin, TenantMixin, UUIDPrimaryKeyMixin
from app.models.account import str_enum
from app.models.catalog import Money

if TYPE_CHECKING:
    from app.models.order import Order


class PaymentMethod(enum.StrEnum):
    """02_TECHNICAL.md section 10. None of them is integrated with a
    provider: the seller confirms every payment by hand."""

    COD = "cod"
    BANK_TRANSFER = "bank_transfer"
    KHQR = "khqr"


class PaymentStatus(enum.StrEnum):
    """02_TECHNICAL.md section 7.2; transitions live in app/services/payment.py."""

    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    """The payment of one order (1:1 in the MVP). Its status is its own
    state machine: nothing here follows the order's status, or the other
    way round (CLAUDE.md hard rule 2).

    store_id is denormalized from the order so RLS covers payments
    directly, as on order_item.
    """

    __tablename__ = "payment"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (CheckConstraint("amount >= 0", name="amount_not_negative"),)

    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("order.id", ondelete="CASCADE"), unique=True
    )
    method: Mapped[PaymentMethod] = mapped_column(str_enum(PaymentMethod, "method"))
    status: Mapped[PaymentStatus] = mapped_column(
        str_enum(PaymentStatus, "status"),
        default=PaymentStatus.PENDING,
        server_default="pending",
    )
    amount: Mapped[Decimal] = mapped_column(Money)  # the order total, in the order's currency
    # The seller's note when recording it, e.g. "ABA, 14:05, last digits 123".
    reference: Mapped[str | None] = mapped_column(Text)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order: Mapped["Order"] = relationship(back_populates="payment")
