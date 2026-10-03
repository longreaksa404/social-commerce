import enum
import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAtMixin, TenantMixin, UUIDPrimaryKeyMixin
from app.models.account import str_enum


class LinkTarget(enum.StrEnum):
    STORE = "store"
    PRODUCT = "product"
    CATEGORY = "category"


class LinkEventType(enum.StrEnum):
    VIEW = "view"
    ORDER = "order"


class ShareableLink(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    """A link the seller made to share in one place, e.g. the red dress on
    TikTok (02_TECHNICAL.md section 9). Its URL is the page's own address
    plus ?l=<token>; views and orders that came through it are link_events.
    """

    __tablename__ = "shareable_link"
    # Read created_at back on insert (async can't lazy-load it).
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (
        Index("ix_shareable_link_store_id_created_at", "store_id", "created_at"),
        CheckConstraint(
            "(target_type = 'store') = (target_id IS NULL)", name="target_id_matches_type"
        ),
    )

    target_type: Mapped[LinkTarget] = mapped_column(str_enum(LinkTarget, "target_type"))
    # The product or category; null for the whole shop. No foreign key, as
    # it points at either table: a deleted category leaves the link with
    # its stats, and its page shows "not found".
    target_id: Mapped[uuid.UUID | None]
    token: Mapped[str] = mapped_column(Text, unique=True)
    source: Mapped[str | None] = mapped_column(Text)  # where it's posted, e.g. "tiktok"
    campaign: Mapped[str | None] = mapped_column(Text)  # the seller's name for it


class LinkEvent(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    """A view of a page opened through a link, or an order placed within 7
    days of that on the same device. Only counted, never shown one by one.

    store_id is denormalized from the link so RLS covers events directly
    (CLAUDE.md hard rule 1).
    """

    __tablename__ = "link_event"
    __table_args__ = (
        Index("ix_link_event_store_id_link_id", "store_id", "link_id"),
        # An order counts for one link, once.
        Index("uq_link_event_order_id", "order_id", unique=True),
        CheckConstraint(
            "(event_type = 'order') = (order_id IS NOT NULL)", name="order_id_matches_type"
        ),
    )

    link_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shareable_link.id", ondelete="CASCADE"))
    event_type: Mapped[LinkEventType] = mapped_column(str_enum(LinkEventType, "event_type"))
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("order.id", ondelete="CASCADE"))
