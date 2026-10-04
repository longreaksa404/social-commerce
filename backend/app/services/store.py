import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.models import Store
from app.schemas.store import StoreUpdate
from app.services.delivery import check_delivery_settings, check_discount_settings
from app.services.payment import check_payment_settings

REQUIRED_FIELDS = {"name", "slug", "currency", "order_confirmation_mode"}
# Each saved whole (below), not field by field.
SETTINGS = {"payment_settings", "delivery_settings", "discount_settings"}


def logo_prefix(store_id: uuid.UUID) -> str:
    return f"{get_settings().r2_public_url}/stores/{store_id}/logo/"


async def get_store(db: AsyncSession, store_id: uuid.UUID) -> Store:
    store = await db.get(Store, store_id)
    if store is None:
        raise NotFound("STORE_NOT_FOUND", "Store not found.")
    return store


async def update_store(db: AsyncSession, store_id: uuid.UUID, data: StoreUpdate) -> Store:
    store = await get_store(db, store_id)
    if data.logo_url is not None and not (
        get_settings().r2_public_url and data.logo_url.startswith(logo_prefix(store_id))
    ):
        # Only a logo uploaded for this store (POST /seller/store/logo).
        raise AppError(422, "INVALID_IMAGE", "Invalid logo image.", "logo_url")
    for field, value in data.model_dump(exclude_unset=True, exclude=SETTINGS).items():
        if value is None and field in REQUIRED_FIELDS:
            continue  # null on a required field means "leave it"
        setattr(store, field, value)
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
    try:
        await db.commit()
    except IntegrityError as exc:
        # Other stores are invisible under RLS, so the unique index is the check.
        await db.rollback()
        raise AppError(409, "SLUG_TAKEN", "This store link is already taken.", "slug") from exc
    return store
