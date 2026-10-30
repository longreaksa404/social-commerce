"""The admin's own login (01_PRODUCT.md §22.11, founder 2026-10-28): the
system owner's account, not a shop's.

1. Phone and password (login) give a step token, good for 5 minutes.
2. The admin's own number, shared with Oak's bot like a seller's phone
   check (app/services/phone_check.py), with that token (confirm): logged
   in. Neither alone is enough.
3. The first time (setup): a number in ADMIN_PHONES, shared with the bot,
   and the password it will use.

Only phones in ADMIN_PHONES (set on Render, not in the app) get in, at
each step and on each request (api/deps.py), so taking a number off the
list stops it at once. Sessions are admin_session rows, swapped on
refresh like a seller's refresh tokens (app/services/auth.py).
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.errors import AppError
from app.models import AdminAccount, AdminSession
from app.schemas.admin_auth import AdminConfirmIn, AdminLoginIn, AdminSetupIn, AdminStepOut
from app.schemas.auth import TokenPair
from app.services import phone_check
from app.services.admin import admin_phones
from app.services.auth import REUSE_GRACE
from app.services.phone import normalize_phone

# How long the password typed again opens the critical actions.
PASSWORD_AGAIN = timedelta(minutes=10)


def _invalid_credentials() -> AppError:
    return AppError(401, "INVALID_CREDENTIALS", "Wrong phone number or password.")


def _invalid_refresh() -> AppError:
    return AppError(401, "INVALID_TOKEN", "Invalid authentication token.")


def _not_admin() -> AppError:
    return AppError(403, "ADMIN_ONLY", "This number isn't an Oak Order admin.", "phone_check")


def allowed(account: AdminAccount | None) -> bool:
    return account is not None and account.is_active and account.phone in admin_phones()


async def login(db: AsyncSession, data: AdminLoginIn) -> AdminStepOut:
    try:
        phone = normalize_phone(data.phone)
    except ValueError:
        phone = None
    account = (
        await db.scalar(select(AdminAccount).where(AdminAccount.phone == phone)) if phone else None
    )
    if not allowed(account):
        # As long as a wrong password, so it can't be used to test numbers.
        await security.verify_password(data.password, security.DUMMY_PASSWORD_HASH)
        raise _invalid_credentials()
    if not await security.verify_password(data.password, account.password_hash):
        raise _invalid_credentials()
    return AdminStepOut(step_token=security.create_admin_step_token(account.id))


async def confirm(db: AsyncSession, data: AdminConfirmIn) -> TokenPair:
    """The Telegram step. The check is used up only when it's the admin's
    own number."""
    payload = security.decode_token(data.step_token, "admin_step")
    account = await db.get(AdminAccount, uuid.UUID(payload["sub"]))
    if not allowed(account):
        raise _invalid_credentials()
    check = await phone_check.use(db, data.phone_check)
    if check.phone != account.phone:
        await db.rollback()
        raise AppError(
            403,
            "ADMIN_PHONE_MISMATCH",
            "This Telegram account's number isn't this admin's.",
            "phone_check",
        )
    account.telegram_user_id = check.telegram_user_id
    return await _start(db, account)


async def setup(db: AsyncSession, data: AdminSetupIn) -> TokenPair:
    check = await phone_check.use(db, data.phone_check)
    if check.phone not in admin_phones():
        await db.rollback()
        raise _not_admin()
    if await db.scalar(select(AdminAccount.id).where(AdminAccount.phone == check.phone)):
        await db.rollback()
        raise AppError(
            409,
            "ADMIN_EXISTS",
            "This number already has an admin account. Log in with its password.",
            "phone_check",
        )
    account = AdminAccount(
        phone=check.phone,
        password_hash=await security.hash_password(data.password),
        telegram_user_id=check.telegram_user_id,
    )
    db.add(account)
    await db.flush()
    return await _start(db, account)


async def refresh(db: AsyncSession, refresh_token: str) -> TokenPair:
    """Rotate, as for sellers: a token shown again after REUSE_GRACE means
    someone kept a copy, and every session of that admin ends."""
    payload = security.decode_token(refresh_token, "admin_refresh")
    try:
        session_id = uuid.UUID(payload["jti"])
    except (KeyError, ValueError) as exc:
        raise _invalid_refresh() from exc
    row = await db.scalar(
        select(AdminSession).where(AdminSession.id == session_id).with_for_update()
    )
    if row is None or str(row.admin_id) != payload["sub"]:
        raise _invalid_refresh()
    now = datetime.now(UTC)
    if row.revoked_at is not None and now - row.revoked_at > REUSE_GRACE:
        await db.execute(delete(AdminSession).where(AdminSession.admin_id == row.admin_id))
        await db.commit()
        raise _invalid_refresh()
    if row.expires_at <= now:
        raise _invalid_refresh()
    account = await db.get(AdminAccount, row.admin_id)
    if not allowed(account):
        raise _invalid_refresh()
    row.revoked_at = row.revoked_at or now
    # The password-again window belongs to this browser: it carries over.
    return await _start(db, account, password_at=row.password_at, login=False)


async def logout(db: AsyncSession, refresh_token: str) -> None:
    try:
        payload = security.decode_token(refresh_token, "admin_refresh")
        session_id = uuid.UUID(payload["jti"])
    except (AppError, KeyError, ValueError):
        return
    await db.execute(delete(AdminSession).where(AdminSession.id == session_id))
    await db.commit()


async def password_again(
    db: AsyncSession, admin_id: uuid.UUID, session_id: uuid.UUID, password: str
) -> None:
    """The password typed again: the critical actions are open for
    PASSWORD_AGAIN in this browser."""
    account = await db.get(AdminAccount, admin_id)
    session = await db.get(AdminSession, session_id)
    if account is None or session is None or session.admin_id != admin_id:
        raise _invalid_refresh()
    if not await security.verify_password(password, account.password_hash):
        raise AppError(422, "WRONG_PASSWORD", "That's not your password.", "password")
    session.password_at = datetime.now(UTC)
    await db.commit()


async def check_password(db: AsyncSession, admin_id: uuid.UUID, password: str) -> None:
    """The password in the request itself, for what asks every time
    (removing a customer's details, erasing a shop): 422 WRONG_PASSWORD."""
    account = await db.get(AdminAccount, admin_id)
    if account is None or not await security.verify_password(password, account.password_hash):
        raise AppError(422, "WRONG_PASSWORD", "That's not your password.", "password")


def password_recent(session: AdminSession | None) -> bool:
    return (
        session is not None
        and session.password_at is not None
        and datetime.now(UTC) - session.password_at <= PASSWORD_AGAIN
    )


async def _start(
    db: AsyncSession,
    account: AdminAccount,
    *,
    password_at: datetime | None = None,
    login: bool = True,
) -> TokenPair:
    now = datetime.now(UTC)
    row = AdminSession(
        id=uuid.uuid4(),
        admin_id=account.id,
        expires_at=now + security.refresh_token_lifetime(),
        password_at=password_at,
    )
    db.add(row)
    if login:
        account.last_login_at = now
    await db.flush()
    tokens = TokenPair(
        access_token=security.create_admin_access_token(account.id, row.id),
        refresh_token=security.create_admin_refresh_token(account.id, row.id),
    )
    await db.commit()
    return tokens
