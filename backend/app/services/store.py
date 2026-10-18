import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import clock
from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.models import Store
from app.schemas.store import StoreUpdate
from app.services.delivery import (
    check_delivery_settings,
    check_discount_settings,
    follow_currency,
)
from app.services.payment import check_payment_settings

REQUIRED_FIELDS = {
    "name",
    "currency",
    "order_confirmation_mode",
    "orders_paused",
    "low_stock_alert",
    "color",
}
# Each saved whole (below), not field by field.
SETTINGS = {"payment_settings", "delivery_settings", "discount_settings"}


def logo_prefix(store_id: uuid.UUID) -> str:
    return f"{get_settings().r2_public_url}/stores/{store_id}/logo/"


def cover_prefix(store_id: uuid.UUID) -> str:
    return f"{get_settings().r2_public_url}/stores/{store_id}/cover/"


def _own_upload(url: str | None, prefix: str) -> bool:
    """Null (removing it), or a picture uploaded for this store."""
    return url is None or bool(get_settings().r2_public_url and url.startswith(prefix))


async def get_store(db: AsyncSession, store_id: uuid.UUID) -> Store:
    store = await db.get(Store, store_id)
    if store is None:
        raise NotFound("STORE_NOT_FOUND", "Shop not found.")
    return store


async def update_store(db: AsyncSession, store_id: uuid.UUID, data: StoreUpdate) -> Store:
    store = await get_store(db, store_id)
    # Only a logo or cover uploaded for this store (POST /seller/store/logo,
    # /cover), or the one it has: Settings sends both with every save.
    if data.logo_url != store.logo_url and not _own_upload(data.logo_url, logo_prefix(store_id)):
        raise AppError(422, "INVALID_IMAGE", "Invalid logo image.", "logo_url")
    if data.cover_url != store.cover_url and not _own_upload(
        data.cover_url, cover_prefix(store_id)
    ):
        raise AppError(422, "INVALID_IMAGE", "Invalid cover photo.", "cover_url")
    currency = store.currency
    for field, value in data.model_dump(exclude_unset=True, exclude=SETTINGS).items():
        if value is None and field in REQUIRED_FIELDS:
            continue  # null on a required field means "leave it"
        setattr(store, field, value)
    if store.currency != currency:
        follow_currency(store)
    if not store.orders_paused:
        store.orders_resume_on = None
    elif "orders_resume_on" in data.model_fields_set and (
        store.orders_resume_on is not None and store.orders_resume_on <= clock.today()
    ):
        raise AppError(422, "INVALID_RESUME_DATE", "Choose a day after today.", "orders_resume_on")
    if data.payment_settings is not None:
        check_payment_settings(data.payment_settings)
        # Stored whole, defaults included, so parts left out of the request
        # are reset rather than half-kept.
        store.payment_config = data.payment_settings.model_dump(mode="json")
    if data.delivery_settings is not None:
        check_delivery_settings(data.delivery_settings)
        store.delivery_config = data.delivery_settings.model_dump(mode="json")
    if data.discount_settings is not None:
        check_discount_settings(data.discount_settings)
        store.discount_config = data.discount_settings.model_dump(mode="json")
    await db.commit()
    return store
