"""Logging in with a Google, Facebook or TikTok account (founder's choice
2026-10-09). Who the account is comes from app/core/google.py (Google's ID
token) or app/core/oauth.py (Facebook's and TikTok's codes).

"Continue with ..." logs in the seller that account belongs to
(seller_login). Someone new gets a signup token instead and finishes with
a shop name and a phone number checked in Telegram, like any sign-up, so
every shop still has a real phone number.

An account is never joined to an existing shop by its email or phone
number alone: whoever is logged in to the shop connects it in Settings →
Your account (connect).

Runs on an unscoped session (seller and seller_login aren't tenant
tables): every query filters explicitly.
"""

import uuid

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.errors import AppError
from app.core.oauth import SocialAccount
from app.models import LoginProvider, Seller, SellerLogin
from app.schemas.account import LoginOut
from app.schemas.auth import SignupStart, SocialRegisterIn, TokenPair
from app.services import auth


def _taken_at_signup() -> AppError:
    return AppError(409, "SOCIAL_TAKEN", "This account already has a shop. Log in with it.")


async def _seller_of(db: AsyncSession, provider: LoginProvider, user_id: str) -> Seller | None:
    return await db.scalar(
        select(Seller)
        .join(SellerLogin, SellerLogin.seller_id == Seller.id)
        .where(SellerLogin.provider == provider, SellerLogin.provider_user_id == user_id)
    )


async def sign_in(db: AsyncSession, account: SocialAccount) -> TokenPair | SignupStart:
    """The seller this account logs in to, or the start of a sign-up for
    someone new."""
    seller = await _seller_of(db, account.provider, account.user_id)
    if seller is not None:
        return await auth.log_in(db, seller)
    return SignupStart(
        provider=account.provider,
        signup_token=security.create_signup_token(
            account.provider.value, account.user_id, account.email, account.name
        ),
        full_name=account.name,
        email=account.email,
    )


def _signup_expired() -> AppError:
    return AppError(400, "SIGNUP_EXPIRED", "This sign-up took too long. Please start again.")


async def register(db: AsyncSession, data: SocialRegisterIn) -> TokenPair:
    """Finish signing up: the shop, a phone number checked in Telegram, and
    no password (one can be added in Settings later)."""
    try:
        payload = security.decode_token(data.signup_token, "signup")
        provider = LoginProvider(payload["provider"])
    except (AppError, KeyError, ValueError) as exc:
        raise _signup_expired() from exc
    if await _seller_of(db, provider, payload["sub"]) is not None:
        raise _taken_at_signup()

    seller, _ = await auth.create_shop(
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
            name=payload.get("name") or None,
        )
    )
    try:
        await db.flush()
    except IntegrityError as exc:  # the same account signed up meanwhile
        raise _taken_at_signup() from exc
    return await auth.log_in(db, seller)


async def connect(db: AsyncSession, seller_id: uuid.UUID, account: SocialAccount) -> None:
    """Settings → Your account: log in with this account from now on too.
    Replaces an account of the same kind connected before."""
    owner = await _seller_of(db, account.provider, account.user_id)
    taken = AppError(409, "SOCIAL_TAKEN", "This account already logs in to another shop.")
    if owner is not None and owner.id != seller_id:
        raise taken
    if owner is not None:
        return
    await db.execute(
        delete(SellerLogin).where(
            SellerLogin.seller_id == seller_id, SellerLogin.provider == account.provider
        )
    )
    db.add(
        SellerLogin(
            seller_id=seller_id,
            provider=account.provider,
            provider_user_id=account.user_id,
            email=account.email,
            name=account.name or None,
        )
    )
    try:
        await db.commit()
    except IntegrityError as exc:  # connected to another shop meanwhile
        await db.rollback()
        raise taken from exc


async def logins(db: AsyncSession, seller_id: uuid.UUID) -> list[LoginOut]:
    """The accounts that log in to this seller, Google first."""
    order = list(LoginProvider)
    rows = await db.scalars(select(SellerLogin).where(SellerLogin.seller_id == seller_id))
    return [
        LoginOut(provider=row.provider, label=row.email or row.name)
        for row in sorted(rows, key=lambda row: order.index(row.provider))
    ]
