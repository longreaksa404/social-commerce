"""Logging in with a Google account (founder's choice 2026-10-09; Facebook
and TikTok to follow, as more LoginProvider values).

"Continue with Google" logs in the seller that Google account belongs to
(seller_login). Someone new gets a signup token instead and finishes with
a shop name and a phone number checked in Telegram, like any sign-up, so
every shop still has a real phone number.

A Google account is never joined to an existing shop by its email or
phone number alone: whoever is logged in to the shop connects it in
Settings → Your account (connect_google).

Runs on an unscoped session (seller and seller_login aren't tenant
tables): every query filters explicitly.
"""

import uuid

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import google, security
from app.core.errors import AppError
from app.models import LoginProvider, Seller, SellerLogin
from app.schemas.auth import SignupStart, SocialRegisterIn, TokenPair
from app.services import auth


def _google_taken() -> AppError:
    return AppError(
        409, "GOOGLE_TAKEN", "This Google account already has a shop. Log in with Google."
    )


async def _seller_of(db: AsyncSession, provider: LoginProvider, user_id: str) -> Seller | None:
    return await db.scalar(
        select(Seller)
        .join(SellerLogin, SellerLogin.seller_id == Seller.id)
        .where(SellerLogin.provider == provider, SellerLogin.provider_user_id == user_id)
    )


async def google_sign_in(db: AsyncSession, credential: str) -> TokenPair | SignupStart:
    """The seller this Google account logs in to, or the start of a
    sign-up for someone new."""
    account = await google.verify(credential)
    seller = await _seller_of(db, LoginProvider.GOOGLE, account.sub)
    if seller is not None:
        return await auth.log_in(db, seller)
    return SignupStart(
        signup_token=security.create_signup_token(
            LoginProvider.GOOGLE.value, account.sub, account.email
        ),
        full_name=account.name,
        email=account.email,
    )


def _signup_expired() -> AppError:
    return AppError(
        400,
        "SIGNUP_EXPIRED",
        "This sign-up took too long. Tap Continue with Google again.",
    )


async def register(db: AsyncSession, data: SocialRegisterIn) -> TokenPair:
    """Finish signing up with Google: the shop, a phone number checked in
    Telegram, and no password (one can be added in Settings later)."""
    try:
        payload = security.decode_token(data.signup_token, "signup")
        provider = LoginProvider(payload["provider"])
    except (AppError, KeyError, ValueError) as exc:
        raise _signup_expired() from exc
    if await _seller_of(db, provider, payload["sub"]) is not None:
        raise _google_taken()

    seller, store = await auth.create_shop(
        db,
        phone_check_id=data.phone_check,
        full_name=data.full_name,
        store_name=data.store_name,
        password_hash=None,
    )
    db.add(
        SellerLogin(
            seller_id=seller.id,
            provider=provider,
            provider_user_id=payload["sub"],
            email=payload.get("email"),
        )
    )
    try:
        await db.flush()
    except IntegrityError as exc:  # the same Google account signed up meanwhile
        raise _google_taken() from exc
    return await auth.log_in(db, seller)


async def connect_google(db: AsyncSession, seller_id: uuid.UUID, credential: str) -> None:
    """Settings → Your account: log in with this Google account from now
    on too. Replaces a Google account connected before."""
    account = await google.verify(credential)
    owner = await _seller_of(db, LoginProvider.GOOGLE, account.sub)
    if owner is not None and owner.id != seller_id:
        raise AppError(409, "GOOGLE_TAKEN", "This Google account already logs in to another shop.")
    if owner is not None:
        return
    await db.execute(
        delete(SellerLogin).where(
            SellerLogin.seller_id == seller_id, SellerLogin.provider == LoginProvider.GOOGLE
        )
    )
    db.add(
        SellerLogin(
            seller_id=seller_id,
            provider=LoginProvider.GOOGLE,
            provider_user_id=account.sub,
            email=account.email,
        )
    )
    try:
        await db.commit()
    except IntegrityError as exc:  # connected to another shop meanwhile
        await db.rollback()
        raise _google_taken() from exc


async def google_email(db: AsyncSession, seller_id: uuid.UUID) -> tuple[bool, str | None]:
    """Whether a Google account logs in to this seller, and its email."""
    row = (
        await db.execute(
            select(SellerLogin.email).where(
                SellerLogin.seller_id == seller_id, SellerLogin.provider == LoginProvider.GOOGLE
            )
        )
    ).first()
    return (row is not None, row.email if row else None)
