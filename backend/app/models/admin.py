"""The system owner's own login for the admin panel (01_PRODUCT.md §22.11,
founder 2026-10-28: "im the system owner if i also want to have shop in my
system i can create shop like other seller"). Not a seller: no shop, so
the same phone can also own a shop. Only a phone in ADMIN_PHONES may have
one. Not tenant data: no RLS, no app_user grant."""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin


class AdminAccount(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "admin_account"

    # Normalized like a seller's (app/services/phone.py).
    phone: Mapped[str] = mapped_column(Text, unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    # The account that shared the phone in its Telegram step: Oak Order's
    # alerts ("I've paid") go to this chat with the bot.
    telegram_user_id: Mapped[int | None] = mapped_column(BigInteger)
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AdminSession(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """One per logged-in browser; the id is the refresh JWT's `jti`, swapped
    like a seller's refresh_token. password_at: when the password was last
    typed again, which opens the critical actions for 10 minutes."""

    __tablename__ = "admin_session"

    admin_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("admin_account.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    password_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
