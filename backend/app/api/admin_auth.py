"""The admin's own login (01_PRODUCT.md §22.11, founder 2026-10-28): the
password, then the Telegram step; the first time, Telegram then a new
password. Its own cookie (session_cookie.py), so it sits beside a shop's
login in the same browser."""

from fastapi import APIRouter, Request, Response, status

from app.api.deps import Admin, UnscopedDb
from app.api.session_cookie import AdminRefreshCookie, end_admin_session, start_admin_session
from app.core.ratelimit import limiter
from app.models import AdminAccount
from app.schemas.admin_auth import (
    AdminConfirmIn,
    AdminLoginIn,
    AdminMeOut,
    AdminPasswordIn,
    AdminSetupIn,
    AdminStepOut,
)
from app.schemas.auth import AccessOut
from app.services import admin_auth

router = APIRouter(prefix="/admin/auth", tags=["admin"])


@router.post("/login", response_model=AdminStepOut)
@limiter.limit("10/minute")
async def login(request: Request, data: AdminLoginIn, db: UnscopedDb) -> AdminStepOut:
    """Step 1: the password. Next, the Telegram step (/confirm)."""
    return await admin_auth.login(db, data)


@router.post("/confirm", response_model=AccessOut)
@limiter.limit("10/minute")
async def confirm(
    request: Request, response: Response, data: AdminConfirmIn, db: UnscopedDb
) -> AccessOut:
    """Step 2: the admin's own number, shared with Oak's bot. 403
    ADMIN_PHONE_MISMATCH for another number; 401 TOKEN_EXPIRED after 5
    minutes (log in again)."""
    return start_admin_session(response, await admin_auth.confirm(db, data))


@router.post("/setup", response_model=AccessOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def setup(
    request: Request, response: Response, data: AdminSetupIn, db: UnscopedDb
) -> AccessOut:
    """The first time: a number in ADMIN_PHONES, shared with the bot, and
    its password. 403 ADMIN_ONLY, 409 ADMIN_EXISTS."""
    return start_admin_session(response, await admin_auth.setup(db, data))


@router.post("/refresh", response_model=AccessOut)
@limiter.limit("30/minute")
async def refresh(
    request: Request, response: Response, db: UnscopedDb, refresh_token: AdminRefreshCookie = ""
) -> AccessOut:
    return start_admin_session(response, await admin_auth.refresh(db, refresh_token))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response, db: UnscopedDb, refresh_token: AdminRefreshCookie = ""
) -> None:
    await admin_auth.logout(db, refresh_token)
    end_admin_session(response)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def password_again(
    request: Request, data: AdminPasswordIn, admin: Admin, db: UnscopedDb
) -> None:
    """The password again: the critical actions are open for 10 minutes in
    this browser. 422 WRONG_PASSWORD."""
    await admin_auth.password_again(db, admin.admin_id, admin.session_id, data.password)


@router.get("/me", response_model=AdminMeOut)
async def me(admin: Admin, db: UnscopedDb) -> AdminMeOut:
    account = await db.get(AdminAccount, admin.admin_id)
    return AdminMeOut(phone=account.phone, telegram=account.telegram_user_id is not None)
