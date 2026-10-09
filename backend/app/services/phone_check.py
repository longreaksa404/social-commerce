"""Proving a phone number through the Telegram bot (founder's choice
2026-10-09, instead of paid SMS codes).

1. The page asks for a check (create) and opens its Telegram link,
   t.me/<bot>?start=phone_<code>.
2. The bot (app/services/telegram.py) remembers who opened it (opened) and
   shows a "Share my phone number" button.
3. Telegram sends the bot that account's own number, which Telegram itself
   checked by SMS when the account was made (shared).
4. The page reads the check until it has the number, then hands the
   check's id in with the form that needs the number (register).

phone_check isn't tenant-scoped (no store yet), so this runs on an
unscoped session.
"""

import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.db.session import unscoped_session
from app.models import PhoneCheck, Seller
from app.schemas.auth import PhoneCheckOut
from app.services.phone import normalize_phone

# Time to open Telegram, share the number and finish the form.
CHECK_MINUTES = 30
# Telegram start codes: what the bot tells apart from a store's 43-character
# "Connect Telegram" code (telegram.read_link_code).
CODE_PREFIX = "phone_"


_EXPIRED = "This check has expired. Verify your phone number again."


def _expired() -> AppError:
    return AppError(404, "PHONE_CHECK_EXPIRED", _EXPIRED)


async def create(db: AsyncSession) -> PhoneCheck:
    if not get_settings().telegram_configured:
        raise AppError(
            503, "TELEGRAM_NOT_CONFIGURED", "Phone checks need the Telegram bot, which is off."
        )
    now = datetime.now(UTC)
    # Old checks are of no use to anyone: tidy up as new ones come.
    await db.execute(delete(PhoneCheck).where(PhoneCheck.expires_at < now))
    check = PhoneCheck(
        code=CODE_PREFIX + secrets.token_urlsafe(16),
        expires_at=now + timedelta(minutes=CHECK_MINUTES),
    )
    db.add(check)
    await db.commit()
    return check


async def get(db: AsyncSession, check_id: uuid.UUID) -> PhoneCheck:
    check = await db.get(PhoneCheck, check_id)
    if check is None or check.expires_at <= datetime.now(UTC):
        raise _expired()
    return check


async def describe(db: AsyncSession, check: PhoneCheck) -> PhoneCheckOut:
    taken = check.phone is not None and await phone_taken(db, check.phone)
    return PhoneCheckOut(
        id=check.id,
        telegram_url=f"https://t.me/{get_settings().telegram_bot_username}?start={check.code}",
        expires_at=check.expires_at,
        phone=check.phone,
        taken=taken,
    )


async def phone_taken(db: AsyncSession, phone: str) -> bool:
    return await db.scalar(select(Seller.id).where(Seller.phone == phone)) is not None


async def use(db: AsyncSession, check_id: uuid.UUID) -> PhoneCheck:
    """The verified check a form hands in. Deleted with the caller's
    commit, so it works once."""
    check = await db.scalar(select(PhoneCheck).where(PhoneCheck.id == check_id).with_for_update())
    if check is None or check.expires_at <= datetime.now(UTC):
        raise AppError(422, "PHONE_CHECK_EXPIRED", _EXPIRED, "phone_check")
    if check.phone is None:
        raise AppError(
            422,
            "PHONE_NOT_VERIFIED",
            "Verify your phone number with Telegram first.",
            "phone_check",
        )
    await db.delete(check)
    return check


# The bot's side. Each runs in its own session: the webhook has none.


async def opened(code: str, telegram_user_id: int) -> bool:
    """/start phone_<code>: remember who opened the link. False if the
    check is unknown, expired or already done."""
    async with unscoped_session() as db:
        check = await db.scalar(select(PhoneCheck).where(PhoneCheck.code == code))
        if check is None or check.phone is not None or check.expires_at <= datetime.now(UTC):
            return False
        check.telegram_user_id = telegram_user_id
        await db.commit()
        return True


async def shared(telegram_user_id: int, raw_phone: str) -> str | None:
    """The account's own number, shared with the bot: it completes the
    newest open check that account opened. Returns the number as stored,
    or None if there's no open check (or the number can't be read)."""
    # Telegram writes numbers in international form, usually without the +.
    raw = raw_phone.strip()
    try:
        phone = normalize_phone(raw if raw.startswith("+") else f"+{raw}")
    except ValueError:
        return None
    now = datetime.now(UTC)
    async with unscoped_session() as db:
        check = await db.scalar(
            select(PhoneCheck)
            .where(
                PhoneCheck.telegram_user_id == telegram_user_id,
                PhoneCheck.phone.is_(None),
                PhoneCheck.expires_at > now,
            )
            .order_by(PhoneCheck.created_at.desc())
            .limit(1)
        )
        if check is None:
            return None
        check.phone = phone
        check.verified_at = now
        await db.commit()
    return phone
