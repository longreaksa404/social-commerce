"""Settings → Export orders: the shop's orders as an Excel file."""

import io
import uuid
import zipfile
from datetime import UTC, datetime

import pytest
from sqlalchemy import update

from app.core import clock
from app.db.session import unscoped_session
from app.models import Order
from tests.helpers import add_product, place_order, registered_seller

EXPORT = "/api/v1/seller/orders/export"


def _text(xlsx: bytes) -> str:
    """Every string and number in the file, to look for values in."""
    with zipfile.ZipFile(io.BytesIO(xlsx)) as book:
        names = [n for n in book.namelist() if n.endswith((".xml",)) and "sheet" in n.lower()]
        names += [n for n in book.namelist() if n.endswith("sharedStrings.xml")]
        return "".join(book.read(n).decode() for n in names)


async def _placed_at(order_id: str, when: datetime) -> None:
    async with unscoped_session() as db:
        await db.execute(
            update(Order).where(Order.id == uuid.UUID(order_id)).values(created_at=when)
        )
        await db.commit()


async def test_export_has_the_orders_of_those_days_in_phnom_penh(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    early = await place_order(
        client, slug, [(cap, None, 1)], total="10.00", name="Sophea", phone="012 345 678"
    )
    # Another phone: one customer per phone, named by their latest order.
    late = await place_order(
        client, slug, [(cap, None, 2)], total="20.00", name="Vanna", phone="097 111 2222"
    )
    # 00:30 on Oct 8 in Phnom Penh is still Oct 7 in UTC.
    await _placed_at(early.json()["id"], datetime(2026, 10, 7, 17, 30, tzinfo=UTC))
    # 00:30 on Oct 9 in Phnom Penh: the next day, outside the range.
    await _placed_at(late.json()["id"], datetime(2026, 10, 8, 17, 30, tzinfo=UTC))

    response = await client.get(
        EXPORT, headers=headers, params={"first": "2026-10-08", "last": "2026-10-08"}
    )

    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert (
        'filename="orders-2026-10-08-to-2026-10-08.xlsx"' in response.headers["content-disposition"]
    )
    text = _text(response.content)
    assert "Sophea" in text and "Vanna" not in text
    # The phone stays text, with its leading 0.
    assert "012345678" in text
    assert "Cap × 1" in text


async def test_headings_and_statuses_in_khmer(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    await place_order(client, slug, [(cap, None, 1)], total="10.00")

    today = clock.today().isoformat()
    response = await client.get(
        EXPORT, headers=headers, params={"first": today, "last": today, "lang": "km"}
    )

    assert response.status_code == 200, response.text
    text = _text(response.content)
    assert "អតិថិជន" in text  # Customer
    assert "ថ្មី" in text  # New
    assert "បង់ប្រាក់ពេលទទួលទំនិញ" in text  # Cash on delivery


async def test_export_holds_only_this_shops_orders(client, auth_headers):
    a_headers, a_id, a_slug = await registered_seller(client, auth_headers)
    _, b_id, b_slug = await registered_seller(client, auth_headers)
    a_cap = await add_product(a_id, "cap", stock=5)
    b_cap = await add_product(b_id, "cap", stock=5)
    await place_order(client, a_slug, [(a_cap, None, 1)], total="10.00", name="Mine")
    await place_order(client, b_slug, [(b_cap, None, 1)], total="10.00", name="Theirs")

    today = clock.today().isoformat()
    response = await client.get(EXPORT, headers=a_headers, params={"first": today, "last": today})

    text = _text(response.content)
    assert "Mine" in text and "Theirs" not in text


@pytest.mark.parametrize(
    ("first", "last"), [("2026-10-09", "2026-10-08"), ("2024-01-01", "2026-01-01")]
)
async def test_range_must_end_after_it_starts_and_span_a_year_at_most(
    client, auth_headers, first, last
):
    headers, _, _ = await registered_seller(client, auth_headers)

    response = await client.get(EXPORT, headers=headers, params={"first": first, "last": last})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_DATE_RANGE"


async def test_export_with_no_orders_is_a_file_with_headings(client, auth_headers):
    headers, _, _ = await registered_seller(client, auth_headers)

    response = await client.get(
        EXPORT, headers=headers, params={"first": "2026-01-01", "last": "2026-01-31"}
    )

    assert response.status_code == 200
    assert "Customer" in _text(response.content)
