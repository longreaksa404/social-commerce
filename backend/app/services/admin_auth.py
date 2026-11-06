"""The admin's own login (01_PRODUCT.md §22.11, founder 2026-10-28): the
system owner's account, not a shop's.

1. The admin's number, shared with Oak's bot like a seller's phone check
   (app/services/phone_check.py), gives a step token for that number,
   good for 5 minutes (telegram; founder 2026-11-06: Telegram first, then
   only the password, no phone to type).
2. With that token, the account's password (login): logged in. Neither
   alone is enough.
3. The first time, step 2 sets the password instead (setup).

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
from app.schemas.admin_auth import AdminLoginIn, AdminSetupIn, AdminStepOut, AdminTelegramIn
from app.schemas.auth import TokenPair
from app.services import admin_log, phone_check
from app.services.admin import admin_phones
from app.services.auth import REUSE_GRACE

# How long the password typed again opens the critical actions.
PASSWORD_AGAIN = timedelta(minutes=10)


def _invalid_refresh() -> AppError:
    return AppError(401, "INVALID_TOKEN", "Invalid authentication token.")


def _not_admin() -> AppError:
    return AppError(403, "ADMIN_ONLY", "This number isn't an Oak Order admin.", "phone_check")


def allowed(account: AdminAccount | None) -> bool:
    return account is not None and account.is_active and account.phone in admin_phones()


async def telegram(db: AsyncSession, data: AdminTelegramIn) -> AdminStepOut:
    """Step 1: a finished phone check of a number in ADMIN_PHONES. Used up
    only then; another number keeps it."""
    check = await phone_check.use(db, data.phone_check)
    account = await _account(db, check.phone)
    if check.phone not in admin_phones() or (account is not None and not allowed(account)):
        await db.rollback()
        raise _not_admin()
    await db.commit()
    return AdminStepOut(
        step_token=security.create_admin_step_token(check.phone, check.telegram_user_id),
        phone=check.phone,
        new=account is None,
    )


async def login(db: AsyncSession, data: AdminLoginIn) -> TokenPair:
    """Step 2: the password. A wrong one can be typed again while the step
    lasts (the 10/minute limit applies)."""
    phone, telegram_user_id = _step(data.step_token)
    account = await _account(db, phone)
    if not allowed(account):
        raise _not_admin()
    if not await security.verify_password(data.password, account.password_hash):
        raise _wrong_password()
    account.telegram_user_id = telegram_user_id
    admin_log.record(db, account.id, "admin_login")
    return await _start(db, account)


async def setup(db: AsyncSession, data: AdminSetupIn) -> TokenPair:
    """The first time, step 2: the password it will log in with."""
    phone, telegram_user_id = _step(data.step_token)
    if phone not in admin_phones():
        raise _not_admin()
    if await _account(db, phone):
        raise AppError(
            409,
            "ADMIN_EXISTS",
            "This number already has an admin account. Log in with its password.",
        )
    account = AdminAccount(
        phone=phone,
        password_hash=await security.hash_password(data.password),
        telegram_user_id=telegram_user_id,
    )
    db.add(account)
    await db.flush()
    admin_log.record(db, account.id, "admin_setup")
    return await _start(db, account)


def _step(token: str) -> tuple[str, int]:
    """The number a step token proved, and the Telegram account that
    shared it."""
    payload = security.decode_token(token, "admin_step")
    telegram_user_id = payload.get("tg")
    if not isinstance(telegram_user_id, int):
        raise _invalid_refresh()
    return payload["sub"], telegram_user_id


async def _account(db: AsyncSession, phone: str) -> AdminAccount | None:
    return await db.scalar(select(AdminAccount).where(AdminAccount.phone == phone))


def _wrong_password() -> AppError:
    return AppError(422, "WRONG_PASSWORD", "That's not your password.", "password")


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
        raise _wrong_password()
    session.password_at = datetime.now(UTC)
    await db.commit()


async def check_password(db: AsyncSession, admin_id: uuid.UUID, password: str) -> None:
    """The password in the request itself, for what asks every time
    (removing a customer's details, erasing a shop): 422 WRONG_PASSWORD."""
    account = await db.get(AdminAccount, admin_id)
    if account is None or not await security.verify_password(password, account.password_hash):
        raise _wrong_password()


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
