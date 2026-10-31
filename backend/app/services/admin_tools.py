"""The admin's tools (01_PRODUCT.md §22.11): a test shop in one tap (part
29), and erasing a closed shop for good after typing its link name and the
admin's password (founder's pick D4B). The same code serves the founder's
commands (`python -m app.admin test-shop`, `erase-shop`)."""

import secrets
import uuid
from dataclasses import dataclass

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.errors import AppError, NotFound
from app.models import Customer, Order, Product, Seller, Store
from app.models.account import trial_end
from app.services import admin_auth, admin_log, platform
from app.services.admin_people import temporary_password
from app.services.slugs import slugify, unique_store_slug

# A test shop's login: an email, so it never takes a real phone number.
TEST_EMAIL = "test-{}@example.com"


@dataclass(frozen=True)
class TestShop:
    store: Store
    email: str
    password: str


async def create_test_shop(db: AsyncSession, name: str) -> TestShop:
    """A shop to try things on, open at once (its trial started), logging
    in with an email and no phone: signing up in the app needs a phone
    number checked in Telegram, one shop per number. Not committed."""
    email = TEST_EMAIL.format(secrets.token_hex(4))
    password = temporary_password()
    seller = Seller(
        email=email, password_hash=await security.hash_password(password), full_name="Test"
    )
    db.add(seller)
    await db.flush()
    store = Store(
        seller_id=seller.id,
        name=name,
        slug=await unique_store_slug(db, slugify(name)),
        paid_until=trial_end((await platform.load(db)).trial_days),
    )
    db.add(store)
    await db.flush()
    return TestShop(store, email, password)


def is_test_login(login: str) -> bool:
    return login.startswith("test-") and login.endswith("@example.com")


async def test_shop(db: AsyncSession, admin_id: uuid.UUID, name: str | None) -> TestShop:
    """Part 29: a test shop from the admin, logged."""
    made = await create_test_shop(db, name or f"Test shop {secrets.token_hex(2)}")
    admin_log.record(db, admin_id, "test_shop", store=made.store, login=made.email)
    await db.commit()
    return made


async def erase_store(db: AsyncSession, seller_id: uuid.UUID) -> None:
    """A plain DELETE of the owner, so Postgres cascades it: the store from
    the seller, every tenant table from the store. (session.delete() would
    try to blank store.seller_id instead.) Not committed; its photos are
    the caller's to delete (images.delete_store_files)."""
    await db.execute(delete(Seller).where(Seller.id == seller_id))


async def erase(
    db: AsyncSession, admin_id: uuid.UUID, store_id: uuid.UUID, slug: str, password: str
) -> Store:
    """D4B: a closed shop and everything in it, for good, after its link
    name and the admin's password. The log keeps its name and what went;
    the nightly backup still holds it 30 days."""
    await admin_auth.check_password(db, admin_id, password)
    store = await db.scalar(select(Store).where(Store.id == store_id).with_for_update())
    if store is None:
        raise NotFound("STORE_NOT_FOUND", "Shop not found.")
    owner = await db.get(Seller, store.seller_id)
    if owner.is_active:
        raise AppError(409, "SHOP_NOT_CLOSED", "Close the shop first, then erase it.")
    if slug.strip() != store.slug:
        raise AppError(422, "SLUG_MISMATCH", "That isn't the shop's link name.", "slug")

    async def count(model: type[Product | Order | Customer]) -> int:
        return await db.scalar(
            select(func.count()).select_from(model).where(model.store_id == store.id)
        )

    admin_log.record(
        db,
        admin_id,
        "erase_shop",
        store=store,
        slug=store.slug,
        products=await count(Product),
        orders=await count(Order),
        customers=await count(Customer),
    )
    await erase_store(db, owner.id)
    await db.commit()
    return store
