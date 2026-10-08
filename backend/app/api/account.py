from fastapi import APIRouter

from app.api.deps import Seller, UnscopedDb
from app.schemas.account import AccountOut, AccountUpdate, PasswordChange
from app.schemas.auth import TokenPair
from app.services import account as account_service

# The seller table isn't tenant-scoped: the service filters by the seller
# id from the access token.
router = APIRouter(prefix="/seller/account", tags=["account"])


@router.get("", response_model=AccountOut)
async def get_account(seller: Seller, db: UnscopedDb) -> AccountOut:
    return await account_service.get_account(db, seller.seller_id)


@router.patch("", response_model=AccountOut)
async def update_account(data: AccountUpdate, seller: Seller, db: UnscopedDb) -> AccountOut:
    return await account_service.update_account(db, seller.seller_id, data)


@router.post("/password", response_model=TokenPair)
async def change_password(data: PasswordChange, seller: Seller, db: UnscopedDb) -> TokenPair:
    """Logs out every other phone; this one carries on with the new pair."""
    return await account_service.change_password(db, seller.seller_id, seller.store_id, data)
