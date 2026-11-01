"""Every word Oak's bot sends (02_TECHNICAL.md §12.7; founder 2026-10-31,
picks B1B and turning a message off): each message is written here once,
in Khmer, and the admin's Bot page can change it, change the small words
inside its tags, or turn it off. The changes live in platform_setting
`bot_text`, only what differs from the words here, and are read for each
message sent, so a change reaches every server at once.

A template is plain text with {tags} and **bold**. Rendering escapes the
text and the tags' words for Telegram HTML, makes **…** bold (opened and
closed on one line), and leaves out a line whose tags are all empty: no
discount, no discount line. A line without tags always stays.

A small word (a payment method, a status headline, a button) is a
template too. Buttons and tap answers are plain text: no bold, no HTML.
"""

import re
import uuid
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import unscoped_session
from app.models import PlatformSetting

KEY = "bot_text"
TAG = re.compile(r"\{(\w+)\}")
_BOLD = re.compile(r"\*\*(.+?)\*\*")
# Telegram's limits: a message, a button's label (none documented; longer
# ones are cut on phones), a tap's answer.
MAX = {"message": 4096, "text": 4096, "button": 64, "note": 200}


def escape(text: str) -> str:
    """For Telegram HTML: only &, < and > need escaping."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# What each tag is, for the admin (the same name means the same thing in
# every message).
TAG_LABELS = {
    "shop": "Shop name",
    "number": "Order number",
    "auto": "Accepted automatically",
    "items": "What was ordered",
    "discount": "Discount",
    "delivery_fee": "Delivery fee",
    "total": "Total",
    "amount": "Amount",
    "payment": "How they pay",
    "delivery": "How it reaches them",
    "customer": "Customer's name",
    "phone": "Phone",
    "address": "Address",
    "notes": "Customer's note",
    "next": "What to do next",
    "status": "Order status",
    "sent": "Who has it",
    "tracking": "Tracking number",
    "courier": "Courier",
    "message": "The shop's message",
    "shop_phone": "Shop's phone",
    "how_to_pay": "How to pay",
    "month_price": "Month price",
    "year_price": "Year price",
    "code": "Shop's code",
    "pay_by": "Pay by",
    "stop_day": "Orders stop on",
    "period": "A month or a year",
    "left": "How many left",
    "login": "Their login",
    "minutes": "Minutes the link works",
    "link": "The link, on a laptop",
}

Group = Literal["sellers", "customers", "you"]
WordKind = Literal["text", "button", "note"]


@dataclass(frozen=True)
class MessageSpec:
    key: str
    group: Group
    name: str  # the admin's list, in English
    about: str  # who gets it, when
    text: str  # the code's words
    tags: tuple[str, ...] = ()
    words: tuple[str, ...] = ()  # the small words shown under it
    can_off: bool = False
    stays_on: str | None = None  # why it can't be turned off


@dataclass(frozen=True)
class WordSpec:
    key: str
    label: str
    text: str
    kind: WordKind = "text"
    tags: tuple[str, ...] = ()


STATUS = (
    "status.pending",
    "status.accepted",
    "status.processing",
    "status.ready",
    "status.shipped",
    "status.delivered",
    "status.completed",
    "status.rejected",
    "status.cancelled",
    "status.pickup_ready",
    "status.pickup_shipped",
    "status.pickup_delivered",
)
PAYMENT = ("payment.cod", "payment.bank_transfer", "payment.khqr")
TAPS = ("tap.done", "tap.already", "tap.failed", "tap.rejected", "tap.cancelled", "tap.gone")
_TAP_ON = "It answers the seller's own tap."
_CUSTOMER_TAP = "It answers the customer's own tap."
_PLAN_HOW = (
    "បង់ {month_price} ក្នុងមួយខែ ឬ {year_price} ក្នុងមួយឆ្នាំ តាម KHQR ឬផ្ទេរប្រាក់ "
    "ក្នុង ការកំណត់ → គម្រោង ដោយដាក់លេខកូដ **{code}** ហើយចុច «ខ្ញុំបានបង់»។"
)
_PLAN_TAGS = ("shop", "month_price", "year_price", "code", "pay_by", "stop_day")
_ORDER_HEAD = "**{shop}** · ការកុម្ម៉ង់ #{number}\n"

# The bot speaks Khmer, the app's default language (decided 2026-10-09),
# in the app's own words (Settings → Alerts is ការកំណត់ → ការជូនដំណឹង,
# the order page's buttons, frontend/src/i18n/messages/order.ts).
_MESSAGES = (
    # To the shop's Telegram
    MessageSpec(
        "new_order",
        "sellers",
        "New order",
        "When a customer orders.",
        "🛒 **ការកុម្ម៉ង់ថ្មី #{number}** {auto}\n\n{items}\nបញ្ចុះតម្លៃ: −{discount}\n"
        "ថ្លៃដឹក: {delivery_fee}\n**សរុប: {total}**\n\n💳 {payment}\n{delivery}\n"
        "👤 {customer}, {phone}\n📍 {address}\n📝 {notes}",
        (
            "number",
            "auto",
            "items",
            "discount",
            "delivery_fee",
            "total",
            "payment",
            "delivery",
            "customer",
            "phone",
            "address",
            "notes",
        ),
        (
            "auto_accepted",
            "free",
            *PAYMENT,
            "delivery.pickup",
            "delivery.own",
            "delivery.courier",
            "location_pinned",
            "button.open_order",
        ),
        can_off=True,
    ),
    MessageSpec(
        "low_stock",
        "sellers",
        "Running low",
        "When an order takes stock to the shop's alert level.",
        "⚠️ **ជិតអស់ស្តុក**\n\n{items}",
        ("items",),
        ("stock.sold_out", "stock.only_left"),
        can_off=True,
    ),
    MessageSpec(
        "payment_claimed",
        "sellers",
        "Customer says paid",
        "When a customer taps I've paid.",
        "💰 **{customer} ថាបានបង់ការកុម្ម៉ង់ #{number}** · {amount}\n💳 {payment}\n\n{next}",
        ("customer", "number", "amount", "payment", "next"),
        (
            "claim.check",
            "claim.marked",
            "button.mark_paid",
            "button.open_order",
            *PAYMENT,
            *TAPS,
        ),
        can_off=True,
    ),
    MessageSpec(
        "plan_start",
        "sellers",
        "Plan: time to pay",
        "The day a shop's paid time ends.",
        "🔔 **Oak Order** · {shop}\nដល់ពេលបង់ប្រាក់សម្រាប់គម្រោងរបស់អ្នកហើយ។ "
        + _PLAN_HOW
        + "\nបើមិនទាន់បង់ត្រឹម {pay_by} ទេ ហាងរបស់អ្នកនឹងឈប់ទទួលការកុម្ម៉ង់ថ្មីនៅ {stop_day}។",
        _PLAN_TAGS,
        ("button.plan_pay",),
        can_off=True,
    ),
    MessageSpec(
        "plan_day5",
        "sellers",
        "Plan: not paid yet",
        "Five days after a shop's paid time ends.",
        "⚠️ **Oak Order** · {shop}\nយើងមិនទាន់ទទួលបានការបង់ប្រាក់របស់អ្នកនៅឡើយ។ "
        + _PLAN_HOW
        + "\nសូមបង់ត្រឹម {pay_by}៖ ហាងរបស់អ្នកនឹងឈប់ទទួលការកុម្ម៉ង់ថ្មីនៅ {stop_day}។",
        _PLAN_TAGS,
        ("button.plan_pay",),
        can_off=True,
    ),
    MessageSpec(
        "plan_stopped",
        "sellers",
        "Plan: shop stopped",
        "When the admin sends a reminder to a stopped shop.",
        "⛔ **Oak Order** · {shop}\nហាងរបស់អ្នកមិនទទួលការកុម្ម៉ង់ថ្មីទេ។ សូមបង់ ដើម្បីបើកវិញភ្លាមៗ។\n" + _PLAN_HOW,
        ("shop", "month_price", "year_price", "code"),
        ("button.plan_pay",),
        can_off=True,
    ),
    MessageSpec(
        "opened_shop",
        "sellers",
        "Oak opened your shop",
        "When the admin opens the shop as its seller.",
        "🛟 **Oak Order** · {shop}\nOak Order បានបើកហាងរបស់អ្នក ដើម្បីជួយអ្នក។",
        ("shop",),
        stays_on="The Privacy page promises it.",
    ),
    MessageSpec(
        "connected",
        "sellers",
        "Telegram connected",
        "After Connect Telegram in Settings.",
        "✅ បានភ្ជាប់ជាមួយ **{shop}**។\n\nអ្នកនឹងទទួលបានសារនៅទីនេះ "
        "រាល់ពេលមានការកុម្ម៉ង់ថ្មី និងពេលទំនិញជិតអស់ស្តុក។ "
        "ដើម្បីបញ្ឈប់ សូមចុច “ផ្ដាច់” នៅក្នុង ការកំណត់ → ការជូនដំណឹង។",
        ("shop",),
        stays_on=_TAP_ON,
    ),
    MessageSpec(
        "link_expired",
        "sellers",
        "Connect link expired",
        "A Connect Telegram link that's too old.",
        "តំណនេះផុតកំណត់ ឬមិនត្រឹមត្រូវ។ នៅក្នុង Oak Order សូមបើក "
        "ការកំណត់ → ការជូនដំណឹង ហើយចុច “ភ្ជាប់ Telegram” ម្ដងទៀត។",
        stays_on=_TAP_ON,
    ),
    MessageSpec(
        "help",
        "sellers",
        "Help",
        "Anyone else writing to the bot.",
        "បូតនេះផ្ញើដំណឹងទៅម្ចាស់ហាង រាល់ពេលមានការកុម្ម៉ង់ថ្មី។\n\n"
        "ដើម្បីភ្ជាប់ហាងរបស់អ្នក សូមបើក Oak Order ចូលទៅ ការកំណត់ → ការជូនដំណឹង "
        "ហើយចុច “ភ្ជាប់ Telegram”។",
        stays_on="It answers someone writing to the bot.",
    ),
    MessageSpec(
        "password_reset",
        "sellers",
        "Forgot password",
        "After Forgot password? on the login page.",
        "🔑 មាននរណាម្នាក់បានស្នើសុំប្ដូរពាក្យសម្ងាត់ Oak Order សម្រាប់ **{login}**។\n\n"
        "ដើម្បីជ្រើសពាក្យសម្ងាត់ថ្មី សូមបើកតំណក្នុងរយៈពេល {minutes} នាទី។ "
        "បើមិនមែនជាអ្នកទេ សូមកុំអើពើសារនេះ៖ ពាក្យសម្ងាត់របស់អ្នកនៅដដែល។\n\n{link}",
        ("login", "minutes", "link"),
        ("button.new_password",),
        stays_on=_TAP_ON,
    ),
    MessageSpec(
        "signup_ask",
        "sellers",
        "Phone check: share",
        "Signing up, or logging in with Telegram.",
        "📱 ដើម្បីផ្ទៀងផ្ទាត់លេខទូរស័ព្ទរបស់អ្នកសម្រាប់ Oak Order "
        "សូមចុចប៊ូតុង “ចែករំលែកលេខទូរស័ព្ទ” ខាងក្រោម។\n\n"
        "សូមចុចតែពេលដែលអ្នកទើបតែចុច “ផ្ទៀងផ្ទាត់ជាមួយ Telegram” "
        "នៅក្នុង Oak Order ដោយខ្លួនឯងប៉ុណ្ណោះ។",
        words=("button.share_phone",),
        stays_on=_TAP_ON,
    ),
    MessageSpec(
        "signup_done",
        "sellers",
        "Phone check: done",
        "After the phone is shared.",
        "✅ បានផ្ទៀងផ្ទាត់លេខ **{phone}**។ សូមត្រឡប់ទៅ Oak Order វិញ ដើម្បីបន្ត។",
        ("phone",),
        stays_on=_TAP_ON,
    ),
    MessageSpec(
        "signup_expired",
        "sellers",
        "Phone check: expired",
        "A phone check link that's too old.",
        "តំណនេះផុតកំណត់ហើយ។ សូមត្រឡប់ទៅ Oak Order ហើយចុច “ផ្ទៀងផ្ទាត់ជាមួយ Telegram” ម្ដងទៀត។",
        stays_on=_TAP_ON,
    ),
    MessageSpec(
        "not_own_phone",
        "sellers",
        "Share your own number",
        "Anyone who sends another person's contact.",
        "សូមចុចប៊ូតុង “ចែករំលែកលេខទូរស័ព្ទ” ខាងក្រោម ដើម្បីផ្ញើលេខរបស់អ្នកផ្ទាល់។",
        words=("button.share_phone",),
        stays_on="It answers the person's own contact.",
    ),
    # To customers who get updates on Telegram
    MessageSpec(
        "receipt",
        "customers",
        "Receipt",
        "When they place an order.",
        _ORDER_HEAD + "✅ បានទទួលការកុម្ម៉ង់របស់អ្នក។\n{items}\n**សរុប៖ {total} · {payment}**\n\n"
        "{how_to_pay}\n{status}",
        ("shop", "number", "items", "total", "payment", "how_to_pay", "status"),
        (
            "receipt.pay_now",
            "receipt.pay_cash",
            "button.pay",
            "button.view_order",
            *PAYMENT,
            *STATUS,
        ),
        can_off=True,
    ),
    MessageSpec(
        "order_news",
        "customers",
        "Order news",
        "When the seller accepts, sends or completes it.",
        _ORDER_HEAD + "{status}",
        ("shop", "number", "status"),
        (*STATUS, "button.view_order"),
        can_off=True,
    ),
    MessageSpec(
        "sent",
        "customers",
        "Sent",
        "When the seller sends it with a driver or courier.",
        _ORDER_HEAD + "{sent}\nលេខតាមដាន៖ {tracking}",
        ("shop", "number", "sent", "tracking"),
        ("sent.driver", "sent.courier", "button.view_order"),
        can_off=True,
    ),
    MessageSpec(
        "delivery_failed",
        "customers",
        "Delivery failed",
        "When the seller marks a delivery failed.",
        _ORDER_HEAD + "⚠️ ដឹកមិនបានសម្រេច។ អ្នកលក់នឹងទាក់ទងអ្នក ដើម្បីដឹកម្ដងទៀត។",
        ("shop", "number"),
        ("button.view_order",),
        can_off=True,
    ),
    MessageSpec(
        "payment_received",
        "customers",
        "Payment received",
        "When the seller marks a KHQR order paid.",
        _ORDER_HEAD + "💰 អ្នកលក់បានទទួលការបង់ប្រាក់របស់អ្នកហើយ",
        ("shop", "number"),
        ("button.view_order",),
        can_off=True,
    ),
    MessageSpec(
        "payment_reminder",
        "customers",
        "Payment reminder",
        "Two hours after an unpaid KHQR order.",
        _ORDER_HEAD + "⏳ កំពុងរង់ចាំការបង់ប្រាក់ {amount} របស់អ្នក។ "
        "បើបានបង់រួចហើយ សូមចុច “ខ្ញុំបានបង់ហើយ” នៅក្នុងទំព័រការកុម្ម៉ង់របស់អ្នក។",
        ("shop", "number", "amount"),
        ("button.pay",),
        can_off=True,
    ),
    MessageSpec(
        "seller_message",
        "customers",
        "Message from the shop",
        "The seller's Message on Telegram, from an order.",
        _ORDER_HEAD + "💬 {message}\n📞 {shop_phone}",
        ("shop", "number", "message", "shop_phone"),
        ("button.reply", "button.view_order"),
        stays_on="It's the seller's own message.",
    ),
    MessageSpec(
        "seller_message_customer",
        "customers",
        "Message from the shop, no order",
        "The seller's Message on Telegram, from a customer's page.",
        "**{shop}**\n💬 {message}\n📞 {shop_phone}",
        ("shop", "message", "shop_phone"),
        ("button.reply",),
        stays_on="It's the seller's own message.",
    ),
    MessageSpec(
        "login_ask",
        "customers",
        "Log in: share",
        "Continue with Telegram at checkout.",
        "📱 ដើម្បីចូលនៅ **{shop}** សូមចុចប៊ូតុង “ចែករំលែកលេខទូរស័ព្ទ” ខាងក្រោម។\n\n"
        "**{shop}** នឹងឃើញលេខនេះ ដើម្បីទាក់ទងអ្នកអំពីការកុម្ម៉ង់។",
        ("shop",),
        ("button.share_phone",),
        stays_on=_CUSTOMER_TAP,
    ),
    MessageSpec(
        "login_done",
        "customers",
        "Log in: done",
        "After the phone is shared, in a browser.",
        "✅ រួចរាល់។ អ្នកបានចូលដោយលេខ **{phone}**។\n\n"
        "សូមត្រឡប់ទៅហាងវិញ ដើម្បីបញ្ចប់ការកុម្ម៉ង់។ ដំណឹងអំពីការកុម្ម៉ង់របស់អ្នកនឹងមកទីនេះ។",
        ("phone",),
        stays_on=_CUSTOMER_TAP,
    ),
    MessageSpec(
        "login_done_app",
        "customers",
        "Log in: done, in Telegram",
        "After the phone is shared, then Open checkout.",
        "✅ រួចរាល់។ អ្នកបានចូលដោយលេខ **{phone}**។ ដំណឹងអំពីការកុម្ម៉ង់របស់អ្នកនឹងមកទីនេះ។",
        ("phone",),
        stays_on=_CUSTOMER_TAP,
    ),
    MessageSpec(
        "login_open",
        "customers",
        "Log in: open checkout",
        "Right after Log in: done, in Telegram.",
        "🛍 បញ្ចប់ការកុម្ម៉ង់នៅ **{shop}** នៅទីនេះ ឬត្រឡប់ទៅទំព័រហាងដែលអ្នកកំពុងបើកវិញ។",
        ("shop",),
        ("button.open_checkout",),
        stays_on=_CUSTOMER_TAP,
    ),
    MessageSpec(
        "login_expired",
        "customers",
        "Log in: expired",
        "A login link that's too old.",
        "តំណនេះផុតកំណត់ហើយ។ សូមត្រឡប់ទៅហាងវិញ ហើយចុច “បន្តជាមួយ Telegram” ម្ដងទៀត។",
        stays_on=_CUSTOMER_TAP,
    ),
    MessageSpec(
        "updates_ask",
        "customers",
        "Get updates: share",
        "Get updates on Telegram, on the order page.",
        "📱 ដើម្បីទទួលដំណឹងអំពីការកុម្ម៉ង់នេះនៅទីនេះ សូមចុចប៊ូតុង “ចែករំលែកលេខទូរស័ព្ទ” ខាងក្រោម។\n\n"
        "**{shop}** នឹងឃើញលេខនេះ ដើម្បីទាក់ទងអ្នក។",
        ("shop",),
        ("button.share_phone",),
        stays_on=_CUSTOMER_TAP,
    ),
    MessageSpec(
        "updates_done",
        "customers",
        "Get updates: done",
        "After the phone is shared.",
        "✅ រួចរាល់។ អ្នកនឹងទទួលដំណឹងអំពីការកុម្ម៉ង់របស់អ្នកពី **{shop}** នៅទីនេះ។\n\n"
        "ការកុម្ម៉ង់ #{number} ឥឡូវ: {status}",
        ("shop", "number", "status"),
        STATUS,
        stays_on=_CUSTOMER_TAP,
    ),
    MessageSpec(
        "updates_expired",
        "customers",
        "Get updates: expired",
        "A Get updates link that's too old.",
        "តំណនេះផុតកំណត់ហើយ។ សូមត្រឡប់ទៅទំព័រការកុម្ម៉ង់របស់អ្នក ហើយចុច “ទទួលដំណឹងតាម Telegram” ម្ដងទៀត។",
        stays_on=_CUSTOMER_TAP,
    ),
    MessageSpec(
        "customer_help",
        "customers",
        "Replying to the bot",
        "A customer writing in the bot's chat.",
        "ឆាតនេះផ្ញើតែដំណឹងអំពីការកុម្ម៉ង់របស់អ្នកប៉ុណ្ណោះ ហើយមិនអាចអានសារតបបានទេ។ "
        "ដើម្បីឆ្លើយតបហាង សូមចុចប៊ូតុងនៅក្រោមសាររបស់ហាង។",
        stays_on="It answers the customer writing to the bot.",
    ),
    # To the admin's own Telegram
    MessageSpec(
        "plan_claim",
        "you",
        '"I\'ve paid" check',
        "When a shop says it paid Oak Order.",
        "💰 **{shop}** ({code}) និយាយថាបានបង់ {amount} សម្រាប់{period}។\n"
        "ពិនិត្យគណនីរបស់អ្នក ហើយកត់ថាបានបង់ ក្នុងទំព័រគ្រប់គ្រង។",
        ("shop", "code", "amount", "period"),
        ("period.month", "period.year", "button.check"),
        can_off=True,
    ),
)

_WORDS = (
    WordSpec("payment.cod", "Cash on delivery", "បង់ប្រាក់ពេលទទួលទំនិញ"),
    WordSpec("payment.bank_transfer", "Bank transfer", "ផ្ទេរតាមធនាគារ"),
    WordSpec("payment.khqr", "KHQR", "KHQR"),
    WordSpec("auto_accepted", "Accepted automatically", "(បានទទួលដោយស្វ័យប្រវត្តិ)"),
    WordSpec("free", "Free delivery", "ឥតគិតថ្លៃ"),
    WordSpec("delivery.pickup", "Pickup", "🏪 មកយកផ្ទាល់"),
    WordSpec("delivery.own", "The shop's own delivery", "🚚 ដឹកដោយខ្លួនឯង"),
    WordSpec("delivery.courier", "A courier", "🚚 {courier}", tags=("courier",)),
    WordSpec("location_pinned", "Location pinned", "បានដៅទីតាំង (បើកការកុម្ម៉ង់ ដើម្បីមើលផែនទី)"),
    WordSpec("stock.sold_out", "Sold out", "អស់ស្តុក"),
    WordSpec("stock.only_left", "Only some left", "នៅសល់តែ {left} ទៀត", tags=("left",)),
    WordSpec(
        "claim.check",
        "Before it's marked paid",
        "សូមពិនិត្យកម្មវិធីធនាគាររបស់អ្នក រួចចុច “✅ បានទទួល កត់ថាបានបង់”។",
    ),
    WordSpec("claim.marked", "Once it's marked paid", "✅ បានកត់ថាបានបង់"),
    WordSpec("button.mark_paid", "Button: received, mark paid", "✅ បានទទួល កត់ថាបានបង់", "button"),
    WordSpec("button.open_order", "Button: open order", "បើកការកុម្ម៉ង់", "button"),
    WordSpec("tap.done", "Tap answer: marked paid", "បានកត់ថាបានបង់ #{number}", "note", ("number",)),
    WordSpec(
        "tap.already",
        "Tap answer: paid already",
        "ការកុម្ម៉ង់ #{number} បានបង់រួចហើយ",
        "note",
        ("number",),
    ),
    WordSpec(
        "tap.failed",
        "Tap answer: marked not paid",
        "ការកុម្ម៉ង់ #{number} ត្រូវបានកត់ថា បង់ប្រាក់មិនបាន។ សូមបើកការកុម្ម៉ង់ ដើម្បីប្ដូរ។",
        "note",
        ("number",),
    ),
    WordSpec(
        "tap.rejected",
        "Tap answer: order rejected",
        "អ្នកបានបដិសេធការកុម្ម៉ង់ #{number} រួចហើយ។",
        "note",
        ("number",),
    ),
    WordSpec(
        "tap.cancelled",
        "Tap answer: order cancelled",
        "ការកុម្ម៉ង់ #{number} ត្រូវបានលុបចោលរួចហើយ។",
        "note",
        ("number",),
    ),
    WordSpec(
        "tap.gone",
        "Tap answer: button too old",
        "ប៊ូតុងនេះលែងដំណើរការហើយ។ សូមបើកការកុម្ម៉ង់នៅក្នុង Oak Order។",
        "note",
    ),
    WordSpec("button.plan_pay", "Button: pay", "បង់ប្រាក់", "button"),
    WordSpec("button.new_password", "Button: new password", "ជ្រើសពាក្យសម្ងាត់ថ្មី", "button"),
    WordSpec("button.share_phone", "Button: share phone", "📱 ចែករំលែកលេខទូរស័ព្ទ", "button"),
    WordSpec("receipt.pay_now", "KHQR: pay now", "💳 សូមបង់ប្រាក់ ដើម្បីឱ្យហាងរៀបចំការកុម្ម៉ង់របស់អ្នក។"),
    WordSpec("receipt.pay_cash", "Cash on delivery: pay later", "💵 បង់ជាសាច់ប្រាក់ពេលទទួលទំនិញ។"),
    WordSpec("button.pay", "Button: pay", "💳 បង់ប្រាក់", "button"),
    WordSpec("button.view_order", "Button: view order", "មើលការកុម្ម៉ង់", "button"),
    WordSpec("status.pending", "Waiting for the seller", "⏳ កំពុងរង់ចាំអ្នកលក់បញ្ជាក់"),
    WordSpec("status.accepted", "Accepted", "✅ អ្នកលក់បានបញ្ជាក់"),
    WordSpec("status.processing", "Preparing", "🧺 កំពុងរៀបចំ"),
    WordSpec("status.ready", "Packed", "📦 វេចខ្ចប់រួចរាល់"),
    WordSpec("status.shipped", "On the way", "🚚 កំពុងដឹកមករកអ្នក"),
    WordSpec("status.delivered", "Delivered", "🎉 បានដល់ដៃ"),
    WordSpec("status.completed", "Completed", "🎉 បានបញ្ចប់"),
    WordSpec("status.rejected", "Rejected", "❌ អ្នកលក់មិនអាចទទួលការកុម្ម៉ង់នេះបានទេ"),
    WordSpec("status.cancelled", "Cancelled", "❌ ការកុម្ម៉ង់នេះត្រូវបានលុបចោល"),
    WordSpec("status.pickup_ready", "Pickup: ready to collect", "🏪 រួចរាល់ សូមមកយក"),
    WordSpec("status.pickup_shipped", "Pickup: handed over", "🤝 បានប្រគល់ជូន"),
    WordSpec("status.pickup_delivered", "Pickup: collected", "🎉 បានមកយកហើយ"),
    WordSpec("sent.driver", "With the shop's driver", "📦 ការកុម្ម៉ង់របស់អ្នកនៅជាមួយអ្នកដឹកហើយ"),
    WordSpec("sent.courier", "With a courier", "📦 បានផ្ញើតាម {courier}", tags=("courier",)),
    WordSpec(
        "button.reply", "Button: reply to the shop", "💬 ឆ្លើយតបទៅ {shop}", "button", ("shop",)
    ),
    WordSpec("button.open_checkout", "Button: open checkout", "🛍 បើកការកុម្ម៉ង់", "button"),
    WordSpec("period.month", "A month", "មួយខែ"),
    WordSpec("period.year", "A year", "មួយឆ្នាំ"),
    WordSpec("button.check", "Button: check", "ពិនិត្យ", "button"),
)

MESSAGES: dict[str, MessageSpec] = {m.key: m for m in _MESSAGES}
WORDS: dict[str, WordSpec] = {w.key: w for w in _WORDS}


# Rendering


@dataclass(frozen=True)
class WordRef:
    """A small word in a tag's place, rendered with the words in use."""

    key: str
    values: Mapping[str, "Value"] = field(default_factory=dict)


def word(key: str, **values: "Value") -> WordRef:
    return WordRef(key, values)


# A tag's words: text as typed (escaped when rendered), a small word, or
# pieces of both joined (a list of items with "Sold out" on each).
Value = str | int | WordRef | Sequence["Value"]


def lines(rows: Sequence[Value]) -> list[Value]:
    """Rows as one tag's words, a row to a line."""
    joined: list[Value] = []
    for row in rows:
        if joined:
            joined.append("\n")
        joined.append(row)
    return joined


class Rendered(str):
    """A message's Telegram HTML. When the admin's words were used,
    `original` is the same message in the code's words, for when
    Telegram refuses the new one (telegram.send_message)."""

    original: str | None = None


def render(template: str, values: Mapping[str, Value], texts: "Texts") -> str:
    lines = (_line(line, values, texts) for line in template.split("\n"))
    # No blank lines left at the end by a last line that was left out.
    return "\n".join(line for line in lines if line is not None).rstrip("\n")


def _line(line: str, values: Mapping[str, Value], texts: "Texts") -> str | None:
    """One line's HTML, or None when it has tags and all are empty."""
    names = TAG.findall(line)
    filled = {name: _html(values[name], texts) for name in names if name in values}
    if names and all(filled.get(name) == "" for name in names):
        return None
    # Mark the tags, escape and bold the rest, then put the tags' HTML in,
    # so a ** typed by a customer never turns bold.
    marked = TAG.sub(lambda m: f"\0{m[1]}\1" if m[1] in filled else m[0], line)
    html = _BOLD.sub(r"<b>\1</b>", escape(marked))
    return re.sub("\0(\\w+)\1", lambda m: filled[m[1]], html).rstrip()


def _html(value: Value, texts: "Texts") -> str:
    if isinstance(value, WordRef):
        return render(texts.word_text(value.key), value.values, texts)
    if isinstance(value, str):
        return escape(value)
    if isinstance(value, int):
        return str(value)
    return "".join(_html(part, texts) for part in value)


def _plain(template: str, values: Mapping[str, str | int]) -> str:
    return TAG.sub(lambda m: str(values[m[1]]) if m[1] in values else m[0], template)


@dataclass(frozen=True)
class Texts:
    """The words in use: the code's, with the admin's changes over them."""

    texts: Mapping[str, str] = field(default_factory=dict)
    words: Mapping[str, str] = field(default_factory=dict)
    off: frozenset[str] = frozenset()

    def text(self, key: str) -> str:
        return self.texts.get(key, MESSAGES[key].text)

    def word_text(self, key: str) -> str:
        return self.words.get(key, WORDS[key].text)

    def on(self, key: str) -> bool:
        return key not in self.off

    def html(self, key: str, **values: Value) -> Rendered:
        """Message `key` as Telegram HTML, with the code's words in
        `original` when the admin's differ."""
        sent = Rendered(render(self.text(key), values, self))
        if self.texts or self.words:
            original = render(MESSAGES[key].text, values, DEFAULT)
            if original != sent:
                sent.original = original
        return sent

    def plain(self, key: str, **values: str | int) -> str:
        """A button's label or a tap's answer: plain text."""
        return _plain(self.word_text(key), values)


DEFAULT = Texts()


async def load(db: AsyncSession | None = None) -> Texts:
    """The words in use now (one small read). Without `db`, on a session
    of its own, as the webhook has none."""
    if db is None:
        async with unscoped_session() as session:
            return await load(session)
    row = await db.get(PlatformSetting, KEY)
    return DEFAULT if row is None else from_saved(row.value)


def from_saved(value: Mapping) -> Texts:
    """What platform_setting holds, ignoring keys the code no longer has."""
    return Texts(
        texts={k: v for k, v in (value.get("texts") or {}).items() if k in MESSAGES},
        words={k: v for k, v in (value.get("words") or {}).items() if k in WORDS},
        off=frozenset(k for k in value.get("off") or () if k in MESSAGES and MESSAGES[k].can_off),
    )


def to_saved(texts: Texts) -> dict:
    return {"texts": dict(texts.texts), "words": dict(texts.words), "off": sorted(texts.off)}


async def save(db: AsyncSession, admin_id: uuid.UUID, texts: Texts) -> None:
    """Keep `texts` (not committed). Words equal to the code's are dropped,
    so Back to original leaves nothing behind."""
    texts = Texts(
        texts={k: v for k, v in texts.texts.items() if v != MESSAGES[k].text},
        words={k: v for k, v in texts.words.items() if v != WORDS[k].text},
        off=texts.off,
    )
    row = await db.get(PlatformSetting, KEY)
    if row is None:
        db.add(PlatformSetting(key=KEY, value=to_saved(texts), updated_by=admin_id))
    else:
        row.value = to_saved(texts)
        row.updated_by = admin_id
        row.updated_at = datetime.now(UTC)


# Checks before going live


@dataclass
class Check:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def check(
    template: str,
    tags: Sequence[str],
    default: str,
    kind: Literal["message", WordKind] = "message",
    *,
    label: str | None = None,
) -> Check:
    """Mistakes that would break the message (errors: Go live refuses) and
    tags taken out (warnings: allowed, B1B). `label` names a small word."""
    found = Check()
    where = f"{label}: " if label else ""
    if not template.strip():
        found.errors.append(f"{where}Type the words, or use Back to original.")
        return found
    for name in dict.fromkeys(re.findall(r"\{(\w*)\}", template)):
        if name not in tags:
            found.errors.append(
                f"{where}{{{name}}} isn't a tag here."
                + (f" Tags: {' '.join('{' + t + '}' for t in tags)}." if tags else "")
            )
    if re.sub(r"\{\w*\}", "", template).count("{") or re.sub(r"\{\w*\}", "", template).count("}"):
        found.errors.append(f"{where}A {{ or }} is missing its pair.")
    if kind in ("button", "note"):
        if "**" in template:
            found.errors.append(f"{where}This can't be bold.")
        if "\n" in template:
            found.errors.append(f"{where}This must be one line.")
    else:
        for number, line in enumerate(template.split("\n"), 1):
            if line.count("**") % 2:
                found.errors.append(f"{where}A bold mark ** isn't closed on line {number}.")
    if len(template) > MAX[kind]:
        found.errors.append(f"{where}Too long: {len(template):,} of {MAX[kind]:,} characters.")
    used = set(TAG.findall(template))
    for name in dict.fromkeys(TAG.findall(default)):
        if name not in used:
            found.warnings.append(f"{where}{{{name}}} is gone, so “{TAG_LABELS[name]}” won't show.")
    return found
