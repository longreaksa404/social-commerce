"""Settings → Export orders: a shop's orders as an Excel file, for the
seller's own accounts (one row per order).

A real .xlsx rather than CSV: Excel keeps phone numbers' leading 0 and
reads Khmer correctly, and amounts stay numbers that add up. Headings and
statuses are in the language the seller's app is in.
"""

import io
import uuid
from datetime import date, datetime, time, timedelta
from typing import Literal

import xlsxwriter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import PHNOM_PENH
from app.models import Currency, DeliveryMethod, Order
from app.services.order import SUMMARY_LOADS

Lang = Literal["en", "km"]

# (key, English, Khmer, column width)
COLUMNS = [
    ("number", "Order", "ការកុម្ម៉ង់", 9),
    ("date", "Date", "កាលបរិច្ឆេទ", 17),
    ("customer", "Customer", "អតិថិជន", 20),
    ("phone", "Phone", "ទូរស័ព្ទ", 14),
    ("items", "Items", "ទំនិញ", 40),
    ("subtotal", "Items total", "តម្លៃទំនិញ", 12),
    ("discount", "Discount", "បញ្ចុះតម្លៃ", 11),
    ("delivery_fee", "Delivery fee", "ថ្លៃដឹក", 12),
    ("total", "Total", "សរុប", 12),
    ("payment", "Payment", "ការបង់ប្រាក់", 18),
    ("payment_status", "Paid?", "បានបង់?", 14),
    ("delivery", "Delivery", "ការដឹកជញ្ជូន", 18),
    ("delivery_status", "Delivery status", "ស្ថានភាពដឹក", 18),
    ("status", "Order status", "ស្ថានភាពការកុម្ម៉ង់", 16),
    ("address", "Address", "អាសយដ្ឋាន", 30),
    ("source", "Came through", "មកតាម", 14),
    ("notes", "Note", "កំណត់ចំណាំ", 30),
]

# The seller's words for each status (frontend/src/i18n/messages/status.ts).
WORDS: dict[str, dict[str, tuple[str, str]]] = {
    "order": {
        "pending": ("New", "ថ្មី"),
        "accepted": ("Accepted", "បានទទួល"),
        "processing": ("Preparing", "កំពុងរៀបចំ"),
        "ready": ("Ready", "រួចរាល់"),
        "shipped": ("Shipped", "បានបញ្ចេញ"),
        "delivered": ("Delivered", "បានដល់ដៃ"),
        "completed": ("Completed", "បានបញ្ចប់"),
        "rejected": ("Rejected", "បានបដិសេធ"),
        "cancelled": ("Cancelled", "បានលុបចោល"),
    },
    "payment_method": {
        "khqr": ("KHQR", "KHQR"),
        "bank_transfer": ("Bank transfer", "ផ្ទេរតាមធនាគារ"),
        "cod": ("Cash on delivery", "បង់ប្រាក់ពេលទទួលទំនិញ"),
    },
    "payment": {
        "pending": ("Not paid", "មិនទាន់បង់"),
        "paid": ("Paid", "បានបង់"),
        "failed": ("Payment failed", "បង់ប្រាក់មិនបាន"),
        "refunded": ("Refunded", "បានសងប្រាក់វិញ"),
    },
    "delivery": {
        "not_assigned": ("Not assigned", "មិនទាន់ចាត់អ្នកដឹក"),
        "assigned": ("Assigned", "បានចាត់អ្នកដឹក"),
        "picked_up": ("Picked up", "អ្នកដឹកបានយក"),
        "in_transit": ("On the way", "កំពុងដឹក"),
        "delivered": ("Delivered", "បានដល់ដៃ"),
        "failed": ("Delivery failed", "ដឹកមិនបានសម្រេច"),
    },
    "pickup": {
        "not_assigned": ("Not collected", "មិនទាន់មកយក"),
        "delivered": ("Collected", "បានមកយកហើយ"),
    },
    "how": {
        "own": ("Own delivery", "ដឹកផ្ទាល់"),
        "pickup": ("Pickup", "មកយកផ្ទាល់"),
    },
}

MONEY_FORMATS = {Currency.USD: "$#,##0.00", Currency.KHR: '#,##0"៛"'}


def _word(group: str, key: str, lang: Lang) -> str:
    en, km = WORDS[group].get(key, (key, key))
    return km if lang == "km" else en


def _source(source: str | None, lang: Lang) -> str:
    """Where the order came from: a link's place as saved ("tiktok"), or a
    chat for the orders the seller added (checkout.CHAT_SOURCE)."""
    if source == "chat":
        return "ឆាត" if lang == "km" else "Chat"
    return source or ""


def _start_of(day: date) -> datetime:
    return datetime.combine(day, time(), PHNOM_PENH)


async def load_orders(
    db: AsyncSession, store_id: uuid.UUID, first: date, last: date
) -> list[Order]:
    """Orders placed from the start of `first` to the end of `last`, days in
    Phnom Penh, oldest first."""
    return list(
        await db.scalars(
            select(Order)
            .where(
                Order.store_id == store_id,
                Order.created_at >= _start_of(first),
                Order.created_at < _start_of(last + timedelta(days=1)),
            )
            .options(*SUMMARY_LOADS)
            .order_by(Order.number)
        )
    )


def _items(order: Order) -> str:
    lines = []
    for item in order.items:
        name = item.product_name_snapshot
        if item.variant_name_snapshot:
            name += f" ({item.variant_name_snapshot})"
        lines.append(f"{name} × {item.quantity}")
    return "; ".join(lines)


def _row(order: Order, lang: Lang) -> dict[str, object]:
    pickup = order.delivery.method is DeliveryMethod.PICKUP
    if pickup:
        how = _word("how", "pickup", lang)
    else:
        how = order.delivery.courier or _word("how", "own", lang)
    return {
        "number": order.number,
        "date": order.created_at.astimezone(PHNOM_PENH).replace(tzinfo=None),
        "customer": order.customer.name,
        "phone": order.customer.phone,
        "items": _items(order),
        "subtotal": order.subtotal,
        "discount": order.discount,
        "delivery_fee": order.delivery_fee,
        "total": order.total,
        "payment": _word("payment_method", order.payment.method.value, lang),
        "payment_status": _word("payment", order.payment.status.value, lang),
        "delivery": how,
        "delivery_status": _word(
            "pickup" if pickup else "delivery", order.delivery.status.value, lang
        ),
        "status": _word("order", order.status.value, lang),
        "address": "" if pickup else (order.delivery_address or ""),
        "source": _source(order.source, lang),
        "notes": order.notes or "",
    }


def workbook(orders: list[Order], lang: Lang) -> bytes:
    """One sheet, a row per order, the heading row frozen and filterable."""
    out = io.BytesIO()
    book = xlsxwriter.Workbook(out, {"in_memory": True})
    sheet = book.add_worksheet("Orders")
    bold = book.add_format({"bold": True, "bg_color": "#EEF1F6", "border": 1})
    when = book.add_format({"num_format": "yyyy-mm-dd hh:mm"})
    money = {currency: book.add_format({"num_format": f}) for currency, f in MONEY_FORMATS.items()}
    money_columns = {"subtotal", "discount", "delivery_fee", "total"}

    for col, (_, en, km, width) in enumerate(COLUMNS):
        sheet.write_string(0, col, km if lang == "km" else en, bold)
        sheet.set_column(col, col, width)
    for r, order in enumerate(orders, start=1):
        row = _row(order, lang)
        for col, (key, *_) in enumerate(COLUMNS):
            value = row[key]
            if key == "date":
                sheet.write_datetime(r, col, value, when)
            elif key in money_columns:
                sheet.write_number(r, col, float(value), money[order.currency])
            elif key == "number":
                sheet.write_number(r, col, value)
            else:
                # Text as text: phones keep their 0, "=..." stays words.
                sheet.write_string(r, col, str(value))
    sheet.freeze_panes(1, 0)
    sheet.autofilter(0, 0, max(len(orders), 1), len(COLUMNS) - 1)
    book.close()
    return out.getvalue()
