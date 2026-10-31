"""The admin's tools (01_PRODUCT.md §22.11): a test shop in one tap (part
29), erasing a closed shop for good after typing its link name and the
admin's password (founder's pick D4B), a Telegram message to every shop,
sent to the admin first (part 30, pick 15A), and the sign-ups that didn't
finish (part 31). The test shop and erasing also serve the founder's
commands (`python -m app.admin test-shop`, `erase-shop`)."""

import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

import httpx
from sqlalchemy import delete, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.models import (
    AdminAccount,
    Customer,
    NotificationLog,
    NotificationStatus,
    Order,
    PhoneCheck,
    Product,
    Seller,
    Store,
)
from app.models.account import trial_end
from app.schemas.admin import AdminBroadcastOut, AdminSignupOut
from app.schemas.plan import PlanStage
from app.services import admin_auth, admin_log, notifications, phone_check, platform, telegram
from app.services.admin import admin_chats, list_shops
from app.services.admin_people import temporary_password
from app.services.slugs import slugify, unique_store_slug
from app.services.telegram import TelegramError, escape

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


Audience = Literal["me", "all", "trial", "paying"]
BROADCAST = "broadcast"  # the shops' notification_log rows


def broadcast_text(text: str) -> str:
    """As typed (English or Khmer), under Oak Order's name."""
    return f"📣 <b>Oak Order</b>\n{escape(text.strip())}"


async def _audience(db: AsyncSession, to: Audience) -> list[Store]:
    """Open shops with Telegram: all of them, those on their free trial,
    or those that have paid."""
    shops = await list_shops(db)
    ids = [
        s.id
        for s in shops
        if s.is_open
        and s.telegram
        and (
            to == "all"
            or (to == "trial" and s.on_trial and s.stage is not PlanStage.SETUP)
            or (to == "paying" and not s.on_trial)
        )
    ]
    return list(await db.scalars(select(Store).where(Store.id.in_(ids)))) if ids else []


async def broadcast(
    db: AsyncSession, admin_id: uuid.UUID, text: str, to: Audience
) -> AdminBroadcastOut:
    """Part 30 (pick 15A): `me` sends it to the admins' own Telegram to read
    first; otherwise to each shop's chat, logged on each shop (its
    Activity) and once in the admin's log, with how many it reached."""
    if not get_settings().telegram_configured:
        raise AppError(
            503, "TELEGRAM_NOT_SET_UP", "Oak's Telegram bot isn't set up on this server."
        )
    message = broadcast_text(text)
    if to == "me":
        sent = failed = 0
        for chat_id in await admin_chats(db):
            try:
                await telegram.send_message(chat_id, message)
                sent += 1
            except (TelegramError, httpx.HTTPError):
                failed += 1
        return AdminBroadcastOut(sent=sent, failed=failed)
    marker = str(uuid.uuid4())
    for store in await _audience(db, to):
        await notifications.send_to_seller(db, store, BROADCAST, {"broadcast": marker}, message)
    counts = dict(
        (
            await db.execute(
                select(NotificationLog.status, func.count())
                .where(
                    NotificationLog.event_type == BROADCAST,
                    NotificationLog.payload["broadcast"].astext == marker,
                )
                .group_by(NotificationLog.status)
            )
        ).all()
    )
    done = AdminBroadcastOut(
        sent=counts.get(NotificationStatus.SENT, 0), failed=counts.get(NotificationStatus.FAILED, 0)
    )
    admin_log.record(
        db, admin_id, BROADCAST, to=to, text=text.strip(), sent=done.sent, failed=done.failed
    )
    await db.commit()
    return done


async def unfinished_signups(db: AsyncSession) -> list[AdminSignupOut]:
    """Part 31: numbers shared with the bot to sign up in the last 30 days
    that never made a shop (no login has them), newest first, once each."""
    since = datetime.now(UTC) - phone_check.KEEP_UNFINISHED
    checks = await db.scalars(
        select(PhoneCheck)
        .where(
            PhoneCheck.code.startswith(phone_check.CODE_PREFIX),
            PhoneCheck.phone.is_not(None),
            PhoneCheck.created_at >= since,
            ~exists(select(Seller.id).where(Seller.phone == PhoneCheck.phone)),
            ~exists(select(AdminAccount.id).where(AdminAccount.phone == PhoneCheck.phone)),
        )
        .order_by(PhoneCheck.created_at.desc())
    )
    found: dict[str, AdminSignupOut] = {}
    for check in checks:
        found.setdefault(
            check.phone,
            AdminSignupOut(
                phone=check.phone,
                telegram_name=check.telegram_name,
                checked_at=check.verified_at or check.created_at,
            ),
        )
    return list(found.values())
