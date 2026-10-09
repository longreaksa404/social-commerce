from fastapi import APIRouter, BackgroundTasks, Request, Response, status

from app.api.deps import UnscopedDb
from app.api.session_cookie import RefreshCookie, end_session, start_session
from app.core.ratelimit import limiter
from app.schemas.auth import (
    AccessOut,
    LoginIn,
    PasswordResetConfirm,
    PasswordResetIn,
    RegisterIn,
)
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AccessOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request, response: Response, data: RegisterIn, db: UnscopedDb
) -> AccessOut:
    return start_session(response, await auth_service.register(db, data))


@router.post("/login", response_model=AccessOut)
@limiter.limit("10/minute")
async def login(request: Request, response: Response, data: LoginIn, db: UnscopedDb) -> AccessOut:
    return start_session(response, await auth_service.login(db, data))


@router.post("/refresh", response_model=AccessOut)
@limiter.limit("30/minute")
async def refresh(
    request: Request, response: Response, db: UnscopedDb, refresh_token: RefreshCookie = ""
) -> AccessOut:
    return start_session(response, await auth_service.refresh(db, refresh_token))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, db: UnscopedDb, refresh_token: RefreshCookie = "") -> None:
    await auth_service.logout(db, refresh_token)
    end_session(response)


@router.post("/password-reset", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/minute")
async def request_password_reset(
    request: Request, data: PasswordResetIn, background: BackgroundTasks
) -> None:
    """Forgot password? Sends a link to the shop's Telegram, if it has one.
    Answers the same either way, so it can't be used to test emails."""
    background.add_task(auth_service.send_password_reset, data.email)


@router.post("/password-reset/confirm", response_model=AccessOut)
@limiter.limit("10/minute")
async def reset_password(
    request: Request, response: Response, data: PasswordResetConfirm, db: UnscopedDb
) -> AccessOut:
    return start_session(response, await auth_service.reset_password(db, data))
