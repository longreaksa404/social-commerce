"""Customers log in with Telegram (founder, 2026-10-20: "almost 80% of
people with a smartphone have Telegram").

"Continue with Telegram" at checkout works like a seller's phone check
(app/services/phone_check.py): the page makes a check ahead (create, with
the cart), opens t.me/<bot>?start=login_<code>, the customer shares their
phone with Oak's bot (opened, then phone_check.shared), and the page reads
the check (describe) until it holds a customer token. The device keeps the
token: no password, no profile, no account across shops; each shop still
knows its customers by phone (02 section 5.4). An order placed with the
token turns on Telegram updates for that customer, as "Get updates on
Telegram" does (app/services/customer_updates.py).

The check keeps the shop and the cart (phone_check.cart), so the bot can
open the same checkout inside Telegram as a mini app. phone_check isn't
tenant-scoped: it is read and written on an unscoped session, always by
its id or code; what the shop knows about the customer is read on the
shop's own tenant session.
"""

import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.core.security import create_customer_token, decode_token
from app.db.session import tenant_session, unscoped_session
from app.models import Customer, Order, PhoneCheck, Seller, Store
from app.schemas.customer_login import (
    CartLineIn,
    CustomerSessionOut,
    MiniAppLoginOut,
    MyShopOut,
    ShopCustomerOut,
    TelegramLoginIn,
    TelegramLoginOut,
)
from app.services import phone_check, telegram

CODE_PREFIX = phone_check.LOGIN_PREFIX

# What the customer reads in the bot, in Khmer like every bot message. The
# shop's button is បន្តជាមួយ Telegram (Continue with Telegram).
# "To log in at <shop>, tap Share my phone number below. <shop> will see
# the number, to reach you about your orders."
ASK_TEXT = (
    "📱 ដើម្បីចូលនៅ <b>{shop}</b> សូមចុចប៊ូតុង “ចែករំលែកលេខទូរស័ព្ទ” ខាងក្រោម។\n\n"
    "<b>{shop}</b> នឹងឃើញលេខនេះ ដើម្បីទាក់ទងអ្នកអំពីការកុម្ម៉ង់។"
)
# "Done. You're logged in with <phone>. Go back to the shop to finish your
# order. News of your orders will come here."
DONE_TEXT = (
    "✅ រួចរាល់។ អ្នកបានចូលដោយលេខ <b>{phone}</b>។\n\n"
    "សូមត្រឡប់ទៅហាងវិញ ដើម្បីបញ្ចប់ការកុម្ម៉ង់។ ដំណឹងអំពីការកុម្ម៉ង់របស់អ្នកនឹងមកទីនេះ។"
)
# With the mini app (an https address): "Done. You're logged in with
# <phone>. News of your orders will come here.", then "Finish your order at
# <shop> here, or go back to the shop page you were on." [Open checkout]
DONE_SHORT_TEXT = "✅ រួចរាល់។ អ្នកបានចូលដោយលេខ <b>{phone}</b>។ ដំណឹងអំពីការកុម្ម៉ង់របស់អ្នកនឹងមកទីនេះ។"
OPEN_TEXT = "🛍 បញ្ចប់ការកុម្ម៉ង់នៅ <b>{shop}</b> នៅទីនេះ ឬត្រឡប់ទៅទំព័រហាងដែលអ្នកកំពុងបើកវិញ។"
OPEN_BUTTON = "🛍 បើកការកុម្ម៉ង់"  # Open checkout
_NOT_TELEGRAM = "This didn't come from Telegram."
# "This link has expired. Go back to the shop and tap Continue with
# Telegram again."
EXPIRED_TEXT = "តំណនេះផុតកំណត់ហើយ។ សូមត្រឡប់ទៅហាងវិញ ហើយចុច “បន្តជាមួយ Telegram” ម្ដងទៀត។"

_EXPIRED = "This has expired. Tap Continue with Telegram again."


@dataclass(frozen=True)
class TelegramCustomer:
    """Who a customer token says the customer is."""

    telegram_user_id: int
    phone: str
    name: str


def read_token(token: str | None) -> TelegramCustomer | None:
    """The customer a token was made for, or None (none, forged, expired,
    or another kind of token)."""
    if not token:
        return None
    try:
        claims = decode_token(token, "customer")
        return TelegramCustomer(
            int(claims["sub"]), str(claims["phone"]), str(claims.get("name") or "")
        )
    except (AppError, KeyError, ValueError):
        return None


def _cart(store: Store, data: TelegramLoginIn) -> dict:
    return {
        "store_id": str(store.id),
        "lines": [line.model_dump(mode="json") for line in data.lines],
    }


async def create(store: Store, data: TelegramLoginIn) -> PhoneCheck:
    """A new check for this shop's checkout, with its cart."""
    if not get_settings().telegram_configured:
        raise AppError(503, "TELEGRAM_NOT_CONFIGURED", "Updates on Telegram are off.")
    now = datetime.now(UTC)
    async with unscoped_session() as db:
        await db.execute(delete(PhoneCheck).where(phone_check.stale(now)))
        check = PhoneCheck(
            code=CODE_PREFIX + secrets.token_urlsafe(16),
            expires_at=now + timedelta(minutes=phone_check.CHECK_MINUTES),
            cart=_cart(store, data),
        )
        db.add(check)
        await db.commit()
        return check


async def _get(db: AsyncSession, store: Store, check_id: uuid.UUID) -> PhoneCheck:
    """This shop's live check (another shop's reads as gone)."""
    check = await db.get(PhoneCheck, check_id)
    if (
        check is None
        or check.expires_at <= datetime.now(UTC)
        or not check.code.startswith(CODE_PREFIX)
        or (check.cart or {}).get("store_id") != str(store.id)
    ):
        raise NotFound("LOGIN_EXPIRED", _EXPIRED)
    return check


async def get(store: Store, check_id: uuid.UUID) -> PhoneCheck:
    async with unscoped_session() as db:
        return await _get(db, store, check_id)


async def set_cart(store: Store, check_id: uuid.UUID, data: TelegramLoginIn) -> None:
    """The cart as it was when the customer tapped the button (it can
    change on the page after the check was made)."""
    async with unscoped_session() as db:
        check = await _get(db, store, check_id)
        check.cart = _cart(store, data)
        await db.commit()


async def shop_customer(
    shop_db: AsyncSession, store: Store, who: TelegramCustomer
) -> ShopCustomerOut:
    """What checkout fills in: this shop's name and address for that phone
    if it knows them, else the name from Telegram."""
    customer = await shop_db.scalar(
        select(Customer).where(Customer.store_id == store.id, Customer.phone == who.phone)
    )
    return ShopCustomerOut(
        name=(customer.name if customer else None) or who.name,
        phone=who.phone,
        address=customer.address if customer else None,
    )


async def describe(shop_db: AsyncSession, store: Store, check: PhoneCheck) -> TelegramLoginOut:
    out = TelegramLoginOut(
        id=check.id,
        telegram_url=f"https://t.me/{get_settings().telegram_bot_username}?start={check.code}",
        expires_at=check.expires_at,
    )
    if check.phone is not None and check.telegram_user_id is not None:
        name = check.telegram_name or ""
        who = TelegramCustomer(check.telegram_user_id, check.phone, name)
        known = await shop_customer(shop_db, store, who)
        token = create_customer_token(who.telegram_user_id, who.phone, name)
        out.customer = CustomerSessionOut(token=token, **known.model_dump())
    return out


# The bot's side


async def opened(code: str, telegram_user_id: int) -> str | None:
    """/start login_<code>: remember who opened it, and the text asking for
    their phone. None if it's unknown, done or expired."""
    async with unscoped_session() as db:
        check = await db.scalar(select(PhoneCheck).where(PhoneCheck.code == code))
        if (
            check is None
            or check.phone is not None
            or check.expires_at <= datetime.now(UTC)
            or not check.cart
        ):
            return None
        check.telegram_user_id = telegram_user_id
        store_id = uuid.UUID(check.cart["store_id"])
        await db.commit()
    async with tenant_session(store_id) as db:
        store = await db.get(Store, store_id)
        return ASK_TEXT.format(shop=telegram.escape(store.name)) if store else None


async def finished(check: PhoneCheck) -> list[dict]:
    """The bot's answers once the phone is shared, as Bot API method calls
    in order: "Done" (and the share button goes), then "Open checkout",
    which opens the same checkout inside Telegram as a mini app, logged in
    and with the cart. Without an https address (a laptop), only "Done"
    with "go back to the shop"."""
    phone = telegram.escape(check.phone or "")
    remove = {"remove_keyboard": True}
    app_url = get_settings().public_app_url.rstrip("/")
    store = None
    if app_url.startswith("https://") and check.cart:
        store_id = uuid.UUID(check.cart["store_id"])
        async with tenant_session(store_id) as db:
            store = await db.get(Store, store_id)
    chat_id = check.telegram_user_id
    if store is None:
        return [
            {
                "method": "sendMessage",
                **telegram.message(chat_id, DONE_TEXT.format(phone=phone)),
                "reply_markup": remove,
            }
        ]
    url = f"{app_url}/shop/{store.slug}/cart?tg={check.id}"
    return [
        # The button beside the message box opens this shop from now on.
        {
            "method": "setChatMenuButton",
            "chat_id": chat_id,
            "menu_button": telegram.shop_button(store),
        },
        {
            "method": "sendMessage",
            **telegram.message(chat_id, DONE_SHORT_TEXT.format(phone=phone)),
            "reply_markup": remove,
        },
        {
            "method": "sendMessage",
            **telegram.message(chat_id, OPEN_TEXT.format(shop=telegram.escape(store.name))),
            "reply_markup": {"inline_keyboard": [[{"text": OPEN_BUTTON, "web_app": {"url": url}}]]},
        },
    ]


# Inside Telegram (the mini app)


def _mini_app_user(init_data: str) -> dict:
    user = telegram.read_mini_app_data(init_data)
    if user is None:
        raise AppError(401, "TELEGRAM_DATA_INVALID", _NOT_TELEGRAM)
    return user


async def mini_app_from_check(
    shop_db: AsyncSession, store: Store, check_id: uuid.UUID, init_data: str
) -> MiniAppLoginOut:
    """From the bot's "Open checkout": the login and the cart, for the
    Telegram account that shared the phone only (Telegram signs who opened
    the mini app; a forwarded button opens nothing for anyone else)."""
    user = _mini_app_user(init_data)
    check = await get(store, check_id)
    if check.phone is None or check.telegram_user_id != user["id"]:
        raise NotFound("LOGIN_EXPIRED", _EXPIRED)
    session = (await describe(shop_db, store, check)).customer
    assert session is not None
    lines = [CartLineIn.model_validate(line) for line in (check.cart or {}).get("lines", [])]
    return MiniAppLoginOut(customer=session, lines=lines)


async def mini_app_known(shop_db: AsyncSession, store: Store, init_data: str) -> CustomerSessionOut:
    """Opening the mini app again on a phone that forgot the login: the
    Telegram account's proved phone, if it shared it before (with this
    shop, else with another Oak shop: its own number, only to itself).
    404 if it never did: checkout shows "Continue with Telegram"."""
    user = _mini_app_user(init_data)
    telegram_id = str(user["id"])
    phone = await shop_db.scalar(
        select(Customer.telegram_phone).where(
            Customer.store_id == store.id,
            Customer.telegram_user_id == telegram_id,
            Customer.telegram_phone.is_not(None),
        )
    )
    if phone is None:
        async with unscoped_session() as db:
            phone = await db.scalar(
                select(Customer.telegram_phone)
                .where(
                    Customer.telegram_user_id == telegram_id, Customer.telegram_phone.is_not(None)
                )
                .limit(1)
            )
    if phone is None:
        raise NotFound("TELEGRAM_NOT_KNOWN", "Continue with Telegram first.")
    name = " ".join(filter(None, (user.get("first_name"), user.get("last_name"))))
    who = TelegramCustomer(user["id"], phone, name)
    known = await shop_customer(shop_db, store, who)
    token = create_customer_token(who.telegram_user_id, who.phone, name)
    return CustomerSessionOut(token=token, **known.model_dump())


# "Your shops" (founder, 2026-10-20): what OPEN in Telegram's chat list
# opens, Oak's bot's main mini app. One address for every customer, so it
# lists the shops this Telegram account is a customer of.


async def my_shops(init_data: str | None, token: str | None) -> list[MyShopOut]:
    """The shops this customer has ordered from, latest first: who they are
    from Telegram's signed `initData` inside Telegram, else from their
    device's token. Their own customer rows only, across shops (read
    unscoped, filtered by their Telegram account); shops that are off
    are left out. 401 when neither says who they are."""
    if init_data:
        telegram_id = _mini_app_user(init_data)["id"]
    elif (who := read_token(token)) is not None:
        telegram_id = who.telegram_user_id
    else:
        raise AppError(401, "CUSTOMER_LOGIN_EXPIRED", "Log in with Telegram again.")
    last_order = func.max(Order.created_at)
    async with unscoped_session() as db:
        rows = await db.execute(
            select(Store.name, Store.slug, Store.logo_url, last_order)
            .join(Customer, Customer.store_id == Store.id)
            .join(Seller, Seller.id == Store.seller_id)
            .outerjoin(Order, Order.customer_id == Customer.id)
            .where(Customer.telegram_user_id == str(telegram_id), Seller.is_active.is_(True))
            .group_by(Store.id)
            .order_by(last_order.desc().nulls_last(), Store.name)
        )
        return [
            MyShopOut(name=name, slug=slug, logo_url=logo, last_order_at=at)
            for name, slug, logo, at in rows.all()
        ]
