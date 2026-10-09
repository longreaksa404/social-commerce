from typing import Literal

from fastapi import APIRouter, Response, status

from app.api.deps import Owner, Seller, UnscopedDb
from app.api.session_cookie import start_session
from app.core import google, oauth
from app.models import LoginProvider
from app.schemas.account import (
    AccountOut,
    AccountUpdate,
    CloseShopIn,
    PasswordChange,
    PhoneChange,
)
from app.schemas.auth import AccessOut, GoogleIn, OAuthIn
from app.services import account as account_service
from app.services import social as social_service

# The seller table isn't tenant-scoped: the service filters by the seller
# id from the access token.
router = APIRouter(prefix="/seller/account", tags=["account"])


@router.get("", response_model=AccountOut)
async def get_account(seller: Seller, db: UnscopedDb) -> AccountOut:
    return await account_service.describe(
        db, await account_service.get_account(db, seller.seller_id)
    )


@router.patch("", response_model=AccountOut)
async def update_account(data: AccountUpdate, seller: Seller, db: UnscopedDb) -> AccountOut:
    return await account_service.describe(
        db, await account_service.update_account(db, seller.seller_id, data)
    )


@router.post("/phone", response_model=AccountOut)
async def change_phone(data: PhoneChange, seller: Seller, db: UnscopedDb) -> AccountOut:
    """The login number, from a phone check (POST /auth/phone-checks)."""
    return await account_service.describe(
        db, await account_service.change_phone(db, seller.seller_id, data.phone_check)
    )


@router.post("/google", response_model=AccountOut)
async def connect_google(data: GoogleIn, seller: Seller, db: UnscopedDb) -> AccountOut:
    """Log in with this Google account too ("Continue with Google")."""
    await social_service.connect(db, seller.seller_id, await google.verify(data.credential))
    return await account_service.describe(
        db, await account_service.get_account(db, seller.seller_id)
    )


@router.post("/oauth/{provider}", response_model=AccountOut)
async def connect_oauth(
    provider: Literal["facebook", "tiktok"], data: OAuthIn, seller: Seller, db: UnscopedDb
) -> AccountOut:
    """Log in with this Facebook or TikTok account too: the code it sent
    the browser back with (/auth/<provider>/callback)."""
    exchange = oauth.facebook if provider == LoginProvider.FACEBOOK else oauth.tiktok
    account = await exchange(data.code, data.redirect_uri)
    await social_service.connect(db, seller.seller_id, account)
    return await account_service.describe(
        db, await account_service.get_account(db, seller.seller_id)
    )


@router.post("/password", response_model=AccessOut)
async def change_password(
    data: PasswordChange, seller: Seller, response: Response, db: UnscopedDb
) -> AccessOut:
    """Logs out every other phone; this one carries on with the new pair."""
    tokens = await account_service.change_password(db, seller.seller_id, seller.store_id, data)
    return start_session(response, tokens)


@router.post("/close-shop", status_code=status.HTTP_204_NO_CONTENT)
async def close_shop(data: CloseShopIn, seller: Owner, db: UnscopedDb) -> None:
    """Closes the shop and logs out everywhere; nothing is erased."""
    await account_service.close_shop(db, seller.seller_id, seller.store_id, data.password)
