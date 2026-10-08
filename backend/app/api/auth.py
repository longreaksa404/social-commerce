from fastapi import APIRouter, BackgroundTasks, Request, status

from app.api.deps import UnscopedDb
from app.core.ratelimit import limiter
from app.schemas.auth import (
    LoginIn,
    PasswordResetConfirm,
    PasswordResetIn,
    RefreshIn,
    RegisterIn,
    TokenPair,
)
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, data: RegisterIn, db: UnscopedDb) -> TokenPair:
    return await auth_service.register(db, data)


@router.post("/login", response_model=TokenPair)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginIn, db: UnscopedDb) -> TokenPair:
    return await auth_service.login(db, data)


@router.post("/refresh", response_model=TokenPair)
@limiter.limit("30/minute")
async def refresh(request: Request, data: RefreshIn, db: UnscopedDb) -> TokenPair:
    return await auth_service.refresh(db, data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(data: RefreshIn, db: UnscopedDb) -> None:
    await auth_service.logout(db, data.refresh_token)


@router.post("/password-reset", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/minute")
async def request_password_reset(
    request: Request, data: PasswordResetIn, background: BackgroundTasks
) -> None:
    """Forgot password? Sends a link to the shop's Telegram, if it has one.
    Answers the same either way, so it can't be used to test emails."""
    background.add_task(auth_service.send_password_reset, data.email)


@router.post("/password-reset/confirm", response_model=TokenPair)
@limiter.limit("10/minute")
async def reset_password(request: Request, data: PasswordResetConfirm, db: UnscopedDb) -> TokenPair:
    return await auth_service.reset_password(db, data)
