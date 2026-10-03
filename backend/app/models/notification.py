import enum
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, UUIDPrimaryKeyMixin
from app.models.account import str_enum


class NotificationChannel(enum.StrEnum):
    WEB = "web"  # the dashboard's notification list
    TELEGRAM = "telegram"


class NotificationStatus(enum.StrEnum):
    SENT = "sent"
    FAILED = "failed"


class NotificationLog(UUIDPrimaryKeyMixin, TenantMixin, Base):
    """One row per notification the store was sent, or that failed
    (02_TECHNICAL.md section 5.2). Not the source of truth for anything.

    The web rows are the dashboard's notification list.
    """

    __tablename__ = "notification_log"
    __table_args__ = (
        # The dashboard's list (newest first) and its unread count.
        Index("ix_notification_log_store_id_channel_sent_at", "store_id", "channel", "sent_at"),
    )

    channel: Mapped[NotificationChannel] = mapped_column(str_enum(NotificationChannel, "channel"))
    event_type: Mapped[str] = mapped_column(Text)  # e.g. "new_order", "low_stock"
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    status: Mapped[NotificationStatus] = mapped_column(str_enum(NotificationStatus, "status"))
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # Web only: when the seller opened the list with it in, on any device
    # (decided 2026-10-03). Null = unread, which the bell counts.
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
