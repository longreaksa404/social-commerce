import enum
import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import clock
from app.db.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin


class Currency(enum.StrEnum):
    USD = "USD"
    KHR = "KHR"


class SellerRole(enum.StrEnum):
    """owner: the shop's own account, everything. staff: a helper the owner
    added, everything but Settings (founder's choice 2026-10-08)."""

    OWNER = "owner"
    STAFF = "staff"


class OrderConfirmationMode(enum.StrEnum):
    AUTOMATIC = "automatic"
    MANUAL = "manual"


def str_enum(enum_cls: type[enum.StrEnum], name: str) -> Enum:
    """Stored as text + CHECK constraint, not a native Postgres enum, so new
    values only need the constraint replaced instead of ALTER TYPE."""
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=32,
        values_callable=lambda cls: [member.value for member in cls],
    )


class Seller(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """A login account. Not tenant-scoped: an owner owns the tenant (store),
    a staff login belongs to one."""

    __tablename__ = "seller"
    __table_args__ = (
        CheckConstraint("(role = 'staff') = (store_id IS NOT NULL)", name="staff_has_store"),
    )

    email: Mapped[str] = mapped_column(Text, unique=True)  # stored lowercased
    password_hash: Mapped[str] = mapped_column(Text)
    full_name: Mapped[str] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")
    role: Mapped[SellerRole] = mapped_column(
        str_enum(SellerRole, "seller_role"), default=SellerRole.OWNER, server_default="owner"
    )
    # A staff login's shop (staff only); deleted with it. An owner's shop is
    # the one whose store.seller_id is theirs.
    store_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("store.id", ondelete="CASCADE", use_alter=True), index=True
    )

    store: Mapped["Store"] = relationship(back_populates="seller", foreign_keys="Store.seller_id")


class Store(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """The tenant root: store.id is the store_id on every tenant table."""

    __tablename__ = "store"

    # unique: one store per seller in the MVP (02_TECHNICAL.md section 4.3)
    seller_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("seller.id", ondelete="CASCADE"), unique=True
    )
    name: Mapped[str] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(String(64), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(Text)
    currency: Mapped[Currency] = mapped_column(
        str_enum(Currency, "currency"), default=Currency.USD, server_default="USD"
    )
    # The chat the bot sends this store's order alerts to; set when the
    # seller opens the bot's link from Settings (app/services/telegram.py).
    telegram_chat_id: Mapped[str | None] = mapped_column(Text)
    # The seller's own Telegram account, without the @: "Ask seller" on the
    # shop opens a chat with it. Public.
    telegram_username: Mapped[str | None] = mapped_column(Text)
    # More ways for customers to reach the seller (Settings → Contact), both
    # public: a number to call (stored like customers' phones, "012345678")
    # and a Facebook page's username for Messenger (m.me/<username>).
    contact_phone: Mapped[str | None] = mapped_column(Text)
    messenger_username: Mapped[str | None] = mapped_column(Text)
    payment_config: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    delivery_config: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )
    discount_config: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )
    order_confirmation_mode: Mapped[OrderConfirmationMode] = mapped_column(
        str_enum(OrderConfirmationMode, "order_confirmation_mode"),
        default=OrderConfirmationMode.MANUAL,
        server_default="manual",
    )
    # "Not taking orders" (Settings → Orders): the shop stays open to look
    # around, but checkout is refused. orders_resume_on is the first day it
    # takes orders again (null: until the seller turns it back on).
    orders_paused: Mapped[bool] = mapped_column(default=False, server_default="false")
    # Warn the seller (bell + Telegram) when an order takes a product to
    # this many left or fewer (Settings → Alerts). The shop's own "Only N
    # left" for customers stays at 5.
    low_stock_alert: Mapped[int] = mapped_column(default=5, server_default="5")
    orders_resume_on: Mapped[date | None] = mapped_column(Date)

    seller: Mapped[Seller] = relationship(back_populates="store", foreign_keys=[seller_id])

    @property
    def orders_paused_now(self) -> bool:
        """Paused, and the day it reopens (if set) hasn't started yet in
        Phnom Penh: it reopens by itself, no scheduled job."""
        return self.orders_paused and (
            self.orders_resume_on is None or clock.today() < self.orders_resume_on
        )

    @property
    def orders_resume_on_now(self) -> date | None:
        return self.orders_resume_on if self.orders_paused_now else None


class RefreshToken(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """One row per issued refresh token; the id is the JWT's `jti`.

    A token works once: refreshing sets revoked_at and issues a new one.
    Presenting an already-revoked token means it was copied, so every token
    of that seller is revoked (02_TECHNICAL.md section 13).
    """

    __tablename__ = "refresh_token"

    seller_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("seller.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
