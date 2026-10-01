from fastapi import APIRouter, Request, status

from app.api.deps import UnscopedDb
from app.core.ratelimit import limiter
from app.schemas.auth import LoginIn, RefreshIn, RegisterIn, TokenPair
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
