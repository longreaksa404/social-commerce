import enum
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, UUIDPrimaryKeyMixin
from app.models.account import str_enum


class NotificationChannel(enum.StrEnum):
    WEB = "web"  # Phase 7
    TELEGRAM = "telegram"


class NotificationStatus(enum.StrEnum):
    SENT = "sent"
    FAILED = "failed"


class NotificationLog(UUIDPrimaryKeyMixin, TenantMixin, Base):
    """One row per notification the store was sent, or that failed
    (02_TECHNICAL.md section 5.2). Not the source of truth for anything."""

    __tablename__ = "notification_log"

    channel: Mapped[NotificationChannel] = mapped_column(str_enum(NotificationChannel, "channel"))
    event_type: Mapped[str] = mapped_column(Text)  # e.g. "new_order", "low_stock"
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    status: Mapped[NotificationStatus] = mapped_column(str_enum(NotificationStatus, "status"))
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
