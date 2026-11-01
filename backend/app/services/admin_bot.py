"""The admin's Bot page (01_PRODUCT.md §22.11, 02_TECHNICAL.md §12.7;
founder 2026-10-31, picks B1B and turning a message off, design 1A 2A
3A 4B 5A 6A 7A 8A 9B 10A 11A): every message the bot sends and the small
words inside it (services/bot_texts.py), a draft checked and shown with
example orders, sent to the admin's own Telegram first (9B), then made
live; and the bot's profile (its name, the text before Start, About).

The examples run the senders' own code on made-up orders of a made-up
shop, never a real one, so the preview is what a seller or customer would
get."""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.models import (
    Currency,
    Customer,
    Delivery,
    DeliveryMethod,
    DeliveryStatus,
    Order,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
    PlanPayment,
    PlanPeriod,
    PlatformSetting,
    Store,
)
from app.schemas.admin import (
    AdminBotDraftIn,
    AdminBotExampleOut,
    AdminBotMessageOut,
    AdminBotPreviewOut,
    AdminBotProfileIn,
    AdminBotProfileOut,
    AdminBotTagOut,
    AdminBotTestOut,
    AdminBotWordOut,
    AdminBotWordsOut,
)
from app.services import (
    admin_log,
    as_seller,
    billing,
    bot_texts,
    customer_updates,
    notifications,
    order_reminders,
    platform,
    telegram,
)
from app.services.admin import admin_chats
from app.services.bot_texts import MESSAGES, TAG_LABELS, WORDS, Texts
from app.services.notifications import StockAlert
from app.services.telegram import TelegramError

# The made-up shop of every example.
SHOP = "Oak Fashion"
_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")


def _tags(names) -> list[AdminBotTagOut]:
    return [AdminBotTagOut(name=n, label=TAG_LABELS[n]) for n in names]


async def page(db: AsyncSession) -> AdminBotWordsOut:
    texts = await bot_texts.load(db)
    row = await db.get(PlatformSetting, bot_texts.KEY)
    return AdminBotWordsOut(
        messages=[
            AdminBotMessageOut(
                key=m.key,
                group=m.group,
                name=m.name,
                about=m.about,
                text=texts.text(m.key),
                default=m.text,
                tags=_tags(m.tags),
                words=list(m.words),
                on=texts.on(m.key),
                can_off=m.can_off,
                stays_on=m.stays_on,
            )
            for m in MESSAGES.values()
        ],
        words=[
            AdminBotWordOut(
                key=w.key,
                label=w.label,
                kind=w.kind,
                text=texts.word_text(w.key),
                default=w.text,
                tags=_tags(w.tags),
                used_in=[m.name for m in MESSAGES.values() if w.key in m.words],
            )
            for w in WORDS.values()
        ],
        updated_at=row.updated_at if row else None,
    )


# A draft


def _spec(key: str) -> bot_texts.MessageSpec:
    if key not in MESSAGES:
        raise NotFound("BOT_MESSAGE_NOT_FOUND", "There's no such bot message.")
    return MESSAGES[key]


def _draft(current: Texts, data: AdminBotDraftIn) -> Texts:
    """The words in use with this message's draft over them."""
    off = current.off - {data.key} if data.on else current.off | {data.key}
    return Texts(
        texts={**current.texts, data.key: data.text},
        words={**current.words, **data.words},
        off=off,
    )


def _check(data: AdminBotDraftIn) -> bot_texts.Check:
    spec = _spec(data.key)
    for key in data.words:
        if key not in spec.words:
            raise AppError(422, "BOT_WORD_NOT_HERE", f"{key} isn't one of this message's words.")
    found = bot_texts.check(data.text, spec.tags, spec.text)
    for key, text in data.words.items():
        word = WORDS[key]
        more = bot_texts.check(text, word.tags, word.text, word.kind, label=word.label)
        found.errors += more.errors
        found.warnings += more.warnings
    if not data.on and not spec.can_off:
        found.errors.append(f"This message stays on: {spec.stays_on}")
    return found


async def preview(db: AsyncSession, data: AdminBotDraftIn) -> AdminBotPreviewOut:
    """The checks, and the draft with each example (shown even with a
    mistake in it, as it would read)."""
    found = _check(data)
    draft = _draft(await bot_texts.load(db), data)
    examples = []
    for example in _examples(data.key, await platform.load(db)):
        html = example.text(draft)
        if len(html) > bot_texts.MAX["message"]:
            found.errors.append(f"Too long with the example “{example.label}”.")
        examples.append(
            AdminBotExampleOut(
                label=example.label,
                html=html,
                buttons=[draft.plain(key, shop=SHOP) for key in example.buttons],
            )
        )
    return AdminBotPreviewOut(errors=found.errors, warnings=found.warnings, examples=examples)


async def send_test(db: AsyncSession, data: AdminBotDraftIn) -> AdminBotTestOut:
    """Save, step one (pick 9B): the draft with an example, to each admin's
    own Telegram, as is (no fallback to the code's words: a refusal is
    what the admin needs to see)."""
    if not get_settings().telegram_configured:
        raise AppError(
            503, "TELEGRAM_NOT_SET_UP", "Oak's Telegram bot isn't set up on this server."
        )
    shown = await preview(db, data)
    if shown.errors:
        raise AppError(422, "BOT_TEXT_INVALID", shown.errors[0])
    example = shown.examples[min(data.example, len(shown.examples) - 1)]
    app_url = get_settings().public_app_url.rstrip("/")
    buttons = (
        [telegram.url_button(label, app_url) for label in example.buttons]
        if app_url.startswith("https://")
        else None
    )
    sent = failed = 0
    error = None
    for chat_id in await admin_chats(db):
        try:
            await telegram.call("sendMessage", telegram.message(chat_id, example.html, buttons))
            sent += 1
        except TelegramError as exc:
            failed += 1
            error = exc.description
        except httpx.HTTPError as exc:
            failed += 1
            error = type(exc).__name__
    return AdminBotTestOut(sent=sent, failed=failed, error=error)


async def go_live(
    db: AsyncSession, admin_id: uuid.UUID, data: AdminBotDraftIn
) -> tuple[AdminBotWordsOut, dict]:
    """Save, step two (Go live): the draft becomes the bot's, logged with
    the words before and after. Answers the page and what changed."""
    found = _check(data)
    if found.errors:
        raise AppError(422, "BOT_TEXT_INVALID", found.errors[0])
    current = await bot_texts.load(db)
    spec = MESSAGES[data.key]
    changes: dict = {}
    if current.text(data.key) != data.text:
        changes["text"] = [current.text(data.key), data.text]
    words = {
        key: [current.word_text(key), text]
        for key, text in data.words.items()
        if current.word_text(key) != text
    }
    if words:
        changes["words"] = words
    if current.on(data.key) != data.on:
        changes["on"] = [current.on(data.key), data.on]
    if changes:
        await bot_texts.save(db, admin_id, _draft(current, data))
        admin_log.record(db, admin_id, "bot_text", message=spec.name, **changes)
        await db.commit()
    return await page(db), changes


# The bot's profile (pick 11A): one text for everyone, no language code.


def _telegram_failed(exc: Exception) -> AppError:
    said = exc.description if isinstance(exc, TelegramError) else type(exc).__name__
    return AppError(502, "TELEGRAM_FAILED", f"Telegram said: {said}")


def _need_bot() -> None:
    if not get_settings().telegram_configured:
        raise AppError(
            503, "TELEGRAM_NOT_SET_UP", "Oak's Telegram bot isn't set up on this server."
        )


async def profile() -> AdminBotProfileOut:
    _need_bot()
    try:
        name = (await telegram.call("getMyName", {}))["name"]
        description = (await telegram.call("getMyDescription", {}))["description"]
        about = (await telegram.call("getMyShortDescription", {}))["short_description"]
    except (TelegramError, httpx.HTTPError) as exc:
        raise _telegram_failed(exc) from exc
    return AdminBotProfileOut(
        name=name,
        description=description,
        short_description=about,
        username=get_settings().telegram_bot_username,
    )


async def save_profile(
    db: AsyncSession, admin_id: uuid.UUID, data: AdminBotProfileIn
) -> tuple[AdminBotProfileOut, dict]:
    """What changed goes to Telegram (each its own call), then the log."""
    now = await profile()
    calls = (
        ("name", "setMyName"),
        ("description", "setMyDescription"),
        ("short_description", "setMyShortDescription"),
    )
    changes = {}
    for field, method in calls:
        before, after = getattr(now, field), getattr(data, field)
        if before != after:
            try:
                await telegram.call(method, {field: after})
            except (TelegramError, httpx.HTTPError) as exc:
                raise _telegram_failed(exc) from exc
            changes[field] = [before, after]
    if changes:
        admin_log.record(db, admin_id, "bot_profile", **changes)
        await db.commit()
    return AdminBotProfileOut(**data.model_dump(), username=now.username), changes


async def connect_again(db: AsyncSession, admin_id: uuid.UUID) -> None:
    """System's Connect the bot again: point Telegram at this API."""
    _need_bot()
    if not get_settings().public_api_url:
        raise AppError(409, "NO_PUBLIC_API_URL", "PUBLIC_API_URL isn't set on this server.")
    try:
        await telegram.point_webhook()
    except (TelegramError, httpx.HTTPError) as exc:
        raise _telegram_failed(exc) from exc
    admin_log.record(db, admin_id, "bot_webhook")
    await db.commit()


# Examples: made-up orders of a made-up shop, through the senders' code.


@dataclass(frozen=True)
class Example:
    label: str
    text: Callable[[Texts], str]
    buttons: tuple[str, ...] = ()  # the small words of its buttons


def _store(**fields) -> Store:
    return Store(
        id=_ID,
        name=SHOP,
        slug="oakfsh",
        contact_phone="012999888",
        paid_until=date(2026, 11, 3),
        **fields,
    )


def _item(name: str, qty: int, line_total: str) -> OrderItem:
    total = Decimal(line_total)
    return OrderItem(
        product_name_snapshot=name,
        variant_name_snapshot=None,
        quantity=qty,
        unit_price_snapshot=total / qty,
        line_total=total,
    )


def _order(
    *,
    pickup: bool = False,
    method: PaymentMethod = PaymentMethod.KHQR,
    paid: bool = False,
    status: OrderStatus = OrderStatus.PENDING,
    discount: str = "0",
    notes: str | None = None,
    courier: str | None = None,
    tracking: str | None = None,
    currency: Currency = Currency.USD,
    items: list[OrderItem] | None = None,
) -> Order:
    items = items or [_item("ស្បែកជើង Nike Air (42)", 1, "45.00"), _item("ស្រោមជើង", 2, "6.00")]
    subtotal = sum((i.line_total for i in items), Decimal(0))
    fee = Decimal(0) if pickup else Decimal("6000" if currency is Currency.KHR else "1.50")
    total = subtotal - Decimal(discount) + fee
    order = Order(
        id=_ID,
        store_id=_ID,
        number=1001,
        status=status,
        currency=currency,
        subtotal=subtotal,
        discount=Decimal(discount),
        delivery_fee=fee,
        total=total,
        delivery_method=DeliveryMethod.PICKUP if pickup else DeliveryMethod.SELLER_DELIVERY,
        delivery_address=None if pickup else "ផ្ទះ 12 ផ្លូវ 271 ភ្នំពេញ",
        notes=notes,
    )
    order.items = items
    order.customer = Customer(name="សុខា", phone="012345678")
    order.payment = Payment(
        method=method,
        status=PaymentStatus.PAID if paid else PaymentStatus.PENDING,
        amount=total,
    )
    order.delivery = Delivery(
        method=order.delivery_method,
        status=DeliveryStatus.ASSIGNED if courier is not None else DeliveryStatus.NOT_ASSIGNED,
        courier=courier,
        assignee_note=tracking,
    )
    return order


def _news(order: Order, event) -> Callable[[Texts], str]:
    key, values = customer_updates.news(order, event)
    return lambda t: t.html(key, shop=SHOP, number=order.number, **values)


def _examples(key: str, prices: platform.Platform) -> list[Example]:
    shop = _store()

    def plain(**values) -> Callable[[Texts], str]:
        return lambda t: t.html(key, **values)

    if key == "new_order":
        order = ("button.open_order",)
        return [
            Example("Delivery", lambda t: notifications.new_order_text(_order(), t), order),
            Example(
                "Pickup",
                lambda t: notifications.new_order_text(
                    _order(pickup=True, method=PaymentMethod.COD), t
                ),
                order,
            ),
            Example(
                "Courier, discount and note",
                lambda t: notifications.new_order_text(
                    _order(discount="5.00", notes="សូមទូរស័ព្ទមុនដឹក", courier="J&T Express"), t
                ),
                order,
            ),
            Example(
                "Riel, accepted automatically",
                lambda t: notifications.new_order_text(
                    _order(
                        status=OrderStatus.ACCEPTED,
                        currency=Currency.KHR,
                        items=[_item("មួក", 2, "40000")],
                    ),
                    t,
                ),
                order,
            ),
        ]
    if key == "low_stock":
        alerts = [StockAlert(_ID, "ស្បែកជើង Nike Air (42)", 0), StockAlert(_ID, "ស្រោមជើង", 2)]
        return [Example("Example", lambda t: notifications.low_stock_text(alerts, t))]
    if key == "payment_claimed":
        return [
            Example(
                "Waiting",
                lambda t: notifications.payment_claimed_text(_order(), t),
                ("button.mark_paid", "button.open_order"),
            ),
            Example(
                "Marked paid",
                lambda t: notifications.payment_claimed_text(_order(paid=True), t),
                ("button.open_order",),
            ),
        ]
    if key.startswith("plan_") and key != "plan_claim":
        kind = key.removeprefix("plan_")
        return [
            Example(
                "Example",
                lambda t: billing.reminder_text(shop, kind, prices, t),
                ("button.plan_pay",),
            )
        ]
    if key == "plan_claim":
        return [
            Example(
                label,
                lambda t, p=period: billing.claim_text(
                    shop, PlanPayment(period=p, amount=prices.price(p)), t
                ),
                ("button.check",),
            )
            for label, period in (("A month", PlanPeriod.MONTH), ("A year", PlanPeriod.YEAR))
        ]
    if key == "opened_shop":
        return [Example("Example", lambda t: as_seller.opened_text(shop, t))]
    if key in ("connected", "login_ask", "updates_ask", "login_open"):
        buttons = {
            "login_ask": ("button.share_phone",),
            "updates_ask": ("button.share_phone",),
            "login_open": ("button.open_checkout",),
        }.get(key, ())
        return [Example("Example", plain(shop=SHOP), buttons)]
    if key in ("signup_done", "login_done", "login_done_app"):
        return [Example("Example", plain(phone="012345678"))]
    if key == "password_reset":
        return [
            Example(
                "On a phone",
                plain(login="012345678", minutes=security.RESET_TOKEN_MINUTES, link=""),
                ("button.new_password",),
            ),
            Example(
                "On a laptop",
                plain(
                    login="012345678",
                    minutes=security.RESET_TOKEN_MINUTES,
                    link="http://localhost:5173/reset-password#…",
                ),
            ),
        ]
    if key == "receipt":
        return [
            Example(
                "KHQR",
                lambda t: customer_updates.receipt_text(shop, _order(), t),
                ("button.pay",),
            ),
            Example(
                "Cash on delivery",
                lambda t: customer_updates.receipt_text(shop, _order(method=PaymentMethod.COD), t),
                ("button.view_order",),
            ),
            Example(
                "Seven items",
                lambda t: customer_updates.receipt_text(
                    shop, _order(items=[_item(f"ទំនិញ {n}", 1, "2.00") for n in range(1, 8)]), t
                ),
                ("button.pay",),
            ),
        ]
    if key == "order_news":
        view = ("button.view_order",)
        return [
            Example("Accepted", _news(_order(), OrderStatus.ACCEPTED), view),
            Example("On the way", _news(_order(), DeliveryStatus.IN_TRANSIT), view),
            Example("Delivered", _news(_order(), DeliveryStatus.DELIVERED), view),
            Example("Pickup ready", _news(_order(pickup=True), OrderStatus.READY), view),
            Example("Rejected", _news(_order(), OrderStatus.REJECTED), view),
        ]
    if key == "sent":
        view = ("button.view_order",)
        return [
            Example("The shop's driver", _news(_order(courier=""), DeliveryStatus.ASSIGNED), view),
            Example(
                "A courier",
                _news(_order(courier="J&T Express", tracking="JT123456"), DeliveryStatus.ASSIGNED),
                view,
            ),
        ]
    if key == "delivery_failed":
        return [Example("Example", _news(_order(), DeliveryStatus.FAILED), ("button.view_order",))]
    if key == "payment_received":
        return [Example("Example", _news(_order(), PaymentStatus.PAID), ("button.view_order",))]
    if key == "payment_reminder":
        return [
            Example(
                "Example",
                lambda t: order_reminders.reminder_text(shop, _order(), t),
                ("button.pay",),
            )
        ]
    if key in ("seller_message", "seller_message_customer"):
        order = _order() if key == "seller_message" else None
        words = "ទំនិញរបស់អ្នកនឹងដល់ថ្ងៃស្អែក។"
        view = ("button.view_order",) if order else ()
        return [
            Example(
                "The shop has a Telegram",
                lambda t: customer_updates.seller_message_text(
                    _store(telegram_username="oakfashion"), order, words, t
                ),
                ("button.reply", *view),
            ),
            Example(
                "No Telegram or Messenger",
                lambda t: customer_updates.seller_message_text(shop, order, words, t),
                view,
            ),
        ]
    if key == "updates_done":
        return [
            Example(
                "Example", plain(shop=SHOP, number=1001, status=bot_texts.word("status.pending"))
            )
        ]
    if key in ("signup_ask", "not_own_phone"):
        return [Example("Example", plain(), ("button.share_phone",))]
    return [Example("Example", plain())]
