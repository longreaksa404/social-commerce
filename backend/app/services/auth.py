"""Seller accounts and tokens. Runs on an unscoped session: no tenant is
known yet, so every query filters by seller explicitly."""

import logging
import uuid
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import ColumnElement, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import get_settings
from app.core.errors import AppError
from app.db.session import unscoped_session
from app.models import Currency, RefreshToken, Seller, SellerRole, Store
from app.schemas.auth import LoginIn, PasswordResetConfirm, RegisterIn, TelegramLoginIn, TokenPair
from app.services import bot_texts, delivery, phone_check, telegram
from app.services.phone import normalize_phone
from app.services.slugs import new_store_slug

logger = logging.getLogger(__name__)

# A refresh token shown again this soon after it was swapped is the same
# phone retrying: on a weak connection the answer with the new pair can be
# lost after the server saved it. Later than this, it's a copy (theft).
REUSE_GRACE = timedelta(seconds=60)


def _invalid_credentials() -> AppError:
    return AppError(401, "INVALID_CREDENTIALS", "Wrong phone number or password.")


def _phone_taken() -> AppError:
    return AppError(
        409,
        "PHONE_TAKEN",
        "This phone number already has an account. Log in instead.",
        "phone_check",
    )


def login_filter(login: str) -> ColumnElement[bool] | None:
    """The account a login form names: a phone number, typed any way, or
    the email of an account from before phone sign-up (2026-10-09). None
    if it's neither."""
    login = login.strip()
    if "@" in login:
        return Seller.email == login.lower()
    try:
        return Seller.phone == normalize_phone(login)
    except ValueError:
        return None


def _slug_taken() -> AppError:
    return AppError(409, "SLUG_TAKEN", "This shop link is already taken. Try another.", "slug")


def _invalid_refresh() -> AppError:
    return AppError(401, "INVALID_TOKEN", "Your session has ended. Please log in again.")


def _token_id(payload: dict) -> uuid.UUID:
    try:
        return uuid.UUID(payload["jti"])
    except (KeyError, ValueError) as exc:
        raise _invalid_refresh() from exc


async def create_shop(
    db: AsyncSession,
    *,
    phone_check_id: uuid.UUID,
    full_name: str | None,
    store_name: str,
    password_hash: str | None,
) -> tuple[Seller, Store]:
    """A new seller and their store together (1:1 in the MVP), with the
    phone number the seller shared with the bot. That chat with the bot
    also gets the shop's order alerts from now on (Settings → Alerts can
    change it), so a new shop starts with them on. The shop's link is a
    short code (`slugs.new_store_slug`). Without `full_name`,
    the seller's name is their Telegram name (else the shop's). Flushed,
    not committed."""
    check = await phone_check.use(db, phone_check_id)
    if await phone_check.phone_taken(db, check.phone):
        raise _phone_taken()

    full_name = full_name or check.telegram_name or store_name
    seller = Seller(phone=check.phone, password_hash=password_hash, full_name=full_name)
    db.add(seller)
    try:
        await db.flush()
    except IntegrityError as exc:  # the same number signed up meanwhile
        raise _phone_taken() from exc
    store = Store(
        seller_id=seller.id,
        name=store_name,
        slug=await new_store_slug(db),
        telegram_chat_id=str(check.telegram_user_id),
        currency=Currency.USD,
        delivery_config=delivery.new_shop_delivery(Currency.USD),
    )
    db.add(store)
    try:
        await db.flush()
    except IntegrityError as exc:  # the same link taken meanwhile
        raise _slug_taken() from exc
    return seller, store


async def register(db: AsyncSession, data: RegisterIn) -> TokenPair:
    seller, store = await create_shop(
        db,
        phone_check_id=data.phone_check,
        full_name=data.full_name,
        store_name=data.store_name,
        password_hash=await security.hash_password(data.password),
    )
    tokens = await _issue_tokens(db, seller, store.id)
    await db.commit()
    return tokens


async def login(db: AsyncSession, data: LoginIn) -> TokenPair:
    where = login_filter(data.login)
    seller = await db.scalar(select(Seller).where(where)) if where is not None else None
    # An account made with Google may have no password: it can't log in
    # with one (until it adds one in Settings).
    if seller is None or seller.password_hash is None:
        await security.verify_password(data.password, security.DUMMY_PASSWORD_HASH)
        raise _invalid_credentials()
    if not await security.verify_password(data.password, seller.password_hash):
        raise _invalid_credentials()
    return await log_in(db, seller)


async def telegram_login(db: AsyncSession, data: TelegramLoginIn) -> TokenPair:
    """ "Log in with Telegram" (founder's test list #30, 2026-10-24): the
    number the owner just shared with the bot proves it's them, as at
    sign-up. Owners only: staff log in with their phone and password
    (#25, "no"). Refused, the check isn't used up, so the page can offer
    Create your shop with it."""
    check = await phone_check.use(db, data.phone_check)
    seller = await db.scalar(select(Seller).where(Seller.phone == check.phone))
    if seller is None:
        await db.rollback()
        raise AppError(404, "NO_SHOP_FOR_PHONE", "No shop uses this number yet.", "phone_check")
    if seller.role is SellerRole.STAFF:
        await db.rollback()
        raise AppError(
            403,
            "STAFF_USE_PASSWORD",
            "Staff log in with their phone number and password.",
            "phone_check",
        )
    return await log_in(db, seller)


async def log_in(db: AsyncSession, seller: Seller) -> TokenPair:
    """A new session for someone who proved who they are. Commits."""
    if not seller.is_active:
        # Closed by the seller (Settings → Close shop) or by the founder.
        raise AppError(
            403, "ACCOUNT_DISABLED", "This shop is closed. Message Oak Order to open it again."
        )
    tokens = await _issue_tokens(db, seller, await shop_of(db, seller))
    await db.commit()
    return tokens


async def refresh(db: AsyncSession, refresh_token: str) -> TokenPair:
    """Rotate: the presented token is used up and a new pair is issued.

    A token shown again within REUSE_GRACE of being used is a retry and
    gets a new pair too. Later, it means someone kept a copy, so every
    session of that seller is ended.

    revoked_at is set only here, when a token is swapped: logging out and
    ending sessions delete the rows instead, so a token they ended is
    simply unknown and never falls in the grace window.
    """
    payload = security.decode_token(refresh_token, "refresh")
    row = await db.scalar(
        select(RefreshToken).where(RefreshToken.id == _token_id(payload)).with_for_update()
    )
    if row is None or str(row.seller_id) != payload["sub"]:
        raise _invalid_refresh()

    now = datetime.now(UTC)
    if row.revoked_at is not None and now - row.revoked_at > REUSE_GRACE:
        await _end_all_sessions(db, row.seller_id)
        await db.commit()
        raise _invalid_refresh()
    if row.expires_at <= now:
        raise _invalid_refresh()

    seller = await db.get(Seller, row.seller_id)
    if seller is None or not seller.is_active:
        raise _invalid_refresh()

    # A retry keeps the first swap's time, so the window doesn't stretch.
    row.revoked_at = row.revoked_at or now
    tokens = await _issue_tokens(db, seller, await shop_of(db, seller))
    await db.commit()
    return tokens


async def logout(db: AsyncSession, refresh_token: str) -> None:
    """End this session. An invalid or expired token is ignored: the
    client is logging out either way."""
    try:
        token_id = _token_id(security.decode_token(refresh_token, "refresh"))
    except AppError:
        return
    await db.execute(delete(RefreshToken).where(RefreshToken.id == token_id))
    await db.commit()


async def send_password_reset(login: str) -> None:
    """Forgot password? A "choose a new password" link goes to the shop's
    Telegram chat, the one its order alerts go to (no email in the MVP).

    Runs after the response (BackgroundTasks), so the answer and its timing
    are the same whether or not the account exists or has Telegram.
    """
    where = login_filter(login)
    if not get_settings().telegram_configured or where is None:
        return
    async with unscoped_session() as db:
        row = (
            await db.execute(
                select(Seller, Store.telegram_chat_id)
                .join(Store, Store.seller_id == Seller.id)
                .where(where, Seller.is_active.is_(True))
            )
        ).first()
    if row is None or row.telegram_chat_id is None:
        return
    seller, chat_id = row
    url = f"{get_settings().public_app_url.rstrip('/')}/reset-password#" + (
        security.create_reset_token(seller.id, seller.password_hash)
    )
    texts = await bot_texts.load()
    # Telegram refuses buttons to non-https addresses (localhost): the
    # link goes in the text instead.
    https = url.startswith("https://")
    button = (texts.plain("button.new_password"), url) if https else None
    text = texts.html(
        "password_reset",
        login=seller.phone or seller.email or "",
        minutes=security.RESET_TOKEN_MINUTES,
        link="" if https else url,
    )
    try:
        await telegram.send_message(chat_id, text, button)
    except (telegram.TelegramError, httpx.HTTPError) as exc:
        logger.error("Password reset message failed: %r", exc)


def _invalid_reset_link() -> AppError:
    return AppError(
        400,
        "RESET_LINK_INVALID",
        "This link has expired or was already used. Ask for a new one.",
    )


async def reset_password(db: AsyncSession, data: PasswordResetConfirm) -> TokenPair:
    """The link from Telegram: set the new password, end every other
    session, and log this one in."""
    try:
        payload = security.decode_token(data.token, "reset")
        seller_id = uuid.UUID(payload["sub"])
    except (AppError, KeyError, ValueError) as exc:
        raise _invalid_reset_link() from exc
    seller = await db.scalar(select(Seller).where(Seller.id == seller_id).with_for_update())
    # Used already (the password changed since), or the account is closed.
    if (
        seller is None
        or not seller.is_active
        or payload.get("pwh") != security.password_fingerprint(seller.password_hash)
    ):
        raise _invalid_reset_link()
    seller.password_hash = await security.hash_password(data.new_password)
    return await restart_sessions(db, seller, await shop_of(db, seller))


async def restart_sessions(db: AsyncSession, seller: Seller, store_id: uuid.UUID) -> TokenPair:
    """After a password change: every session of the seller ends (other
    phones are logged out) and the caller gets a fresh pair. Commits.

    The old rows are deleted, not revoked: a revoked token shown later
    reads as stolen and would end the new session too (refresh()).
    """
    await _end_all_sessions(db, seller.id)
    tokens = await _issue_tokens(db, seller, store_id)
    await db.commit()
    return tokens


async def shop_of(db: AsyncSession, seller: Seller) -> uuid.UUID:
    """The shop a login works in: a staff login's own store_id, or the
    store an owner owns."""
    if seller.store_id is not None:
        return seller.store_id
    store_id = await db.scalar(select(Store.id).where(Store.seller_id == seller.id))
    if store_id is None:  # every owner gets a store at registration
        raise AppError(409, "STORE_MISSING", "This account has no shop.")
    return store_id


async def _issue_tokens(db: AsyncSession, seller: Seller, store_id: uuid.UUID) -> TokenPair:
    row = RefreshToken(
        id=uuid.uuid4(),
        seller_id=seller.id,
        expires_at=datetime.now(UTC) + security.refresh_token_lifetime(),
    )
    db.add(row)
    await db.flush()
    return TokenPair(
        access_token=security.create_access_token(seller.id, store_id, seller.role.value),
        refresh_token=security.create_refresh_token(seller.id, row.id),
    )


async def _end_all_sessions(db: AsyncSession, seller_id: uuid.UUID) -> None:
    await db.execute(delete(RefreshToken).where(RefreshToken.seller_id == seller_id))
