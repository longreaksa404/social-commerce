from fastapi import APIRouter

from app.api.deps import Owner, Seller, TenantDb
from app.core.config import get_settings
from app.core.errors import AppError
from app.schemas.store import StoreOut, StoreUpdate, TelegramLinkOut
from app.schemas.upload import ImageUploadIn, ImageUploadOut
from app.services import images as image_service
from app.services import store as store_service
from app.services import telegram

router = APIRouter(prefix="/seller/store", tags=["store"])


# Reading is for staff too (the dashboard shows the shop's name, link and
# currency); changing anything is the owner's (Settings).
@router.get("", response_model=StoreOut)
async def get_store(seller: Seller, db: TenantDb) -> StoreOut:
    return await store_service.get_store(db, seller.store_id)


@router.patch("", response_model=StoreOut)
async def update_store(data: StoreUpdate, seller: Owner, db: TenantDb) -> StoreOut:
    return await store_service.update_store(db, seller.store_id, data)


@router.post("/logo", response_model=ImageUploadOut)
async def create_logo_upload(data: ImageUploadIn, seller: Owner) -> ImageUploadOut:
    """Step 1 of a logo upload: PUT the file, then PATCH logo_url."""
    return image_service.create_logo_upload(seller.store_id, data)


@router.post("/telegram/link", response_model=TelegramLinkOut)
async def telegram_link(seller: Owner) -> TelegramLinkOut:
    """The link that connects a Telegram chat to this store's order alerts."""
    if not get_settings().telegram_configured:
        raise AppError(503, "TELEGRAM_NOT_CONFIGURED", "Telegram alerts aren't set up yet.")
    url, expires_at = telegram.connect_link(seller.store_id)
    return TelegramLinkOut(url=url, expires_at=expires_at)


@router.delete("/telegram", response_model=StoreOut)
async def telegram_disconnect(seller: Owner, db: TenantDb) -> StoreOut:
    """Stop sending order alerts to Telegram."""
    store = await store_service.get_store(db, seller.store_id)
    store.telegram_chat_id = None
    await db.commit()
    return store
