"""The seller's customers (Phase 7): the list with what each one ordered
and spent, finding one by name or phone, and their page with their
orders."""

import uuid

import pytest

from app.core.errors import AppError
from app.db.session import tenant_session
from app.services import customer as customer_service
from app.services.phone import phone_search_terms
from tests.helpers import add_product, place_order, registered_seller

URL = "/api/v1/seller/customers"


async def customers(client, headers, **params) -> dict:
    response = await client.get(URL, headers=headers, params=params)
    assert response.status_code == 200, response.text
    return response.json()


async def names(client, headers, q) -> list[str]:
    return [c["name"] for c in (await customers(client, headers, q=q))["customers"]]


async def reject(client, headers, order_id) -> None:
    response = await client.patch(
        f"/api/v1/seller/orders/{order_id}/status", headers=headers, json={"status": "rejected"}
    )
    assert response.status_code == 200, response.text


@pytest.mark.parametrize(
    ("typed", "terms"),
    [
        ("012 345", ["012345"]),
        ("12-345-678", ["12345678"]),
        ("+855 12 345", ["85512345", "012345"]),  # country code, or the middle of a number
        ("+855 012 345 678", ["855012345678", "012345678"]),
        ("00855 12", ["0085512", "012"]),
        ("855", ["855"]),
        ("+1 (555) 01", ["155501"]),
        ("Dara", []),
        ("012 abc", []),
    ],
)
def test_phone_search_terms(typed, terms):
    assert phone_search_terms(typed) == terms


async def test_list_whoever_ordered_last_first_with_what_they_spent(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    await place_order(client, slug, [(cap, None, 1)], total="10.00", name="Dara")
    rejected = await place_order(client, slug, [(cap, None, 2)], total="20.00", name="Dara")
    await reject(client, headers, rejected.json()["id"])
    await place_order(
        client, slug, [(cap, None, 3)], total="30.00", name="Sokha", phone="097 111 222"
    )

    body = await customers(client, headers)
    assert [(c["name"], c["phone"], c["order_count"], c["spent"]) for c in body["customers"]] == [
        ("Sokha", "097111222", 1, [{"currency": "USD", "amount": "30.00"}]),
        # Both orders count as orders; the rejected one isn't money spent.
        # The first is still waiting to be accepted, and counts.
        ("Dara", "012345678", 2, [{"currency": "USD", "amount": "10.00"}]),
    ]
    assert body["customers"][1]["last_order_at"] < body["customers"][0]["last_order_at"]
    assert (body["total"], body["has_more"]) == (2, False)


async def test_nothing_spent_when_every_order_was_rejected(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    order = await place_order(client, slug, [(cap, None, 1)], total="10.00")
    await reject(client, headers, order.json()["id"])

    [dara] = (await customers(client, headers))["customers"]
    assert (dara["order_count"], dara["spent"]) == (1, [])


async def test_spent_is_kept_apart_per_currency(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    await place_order(client, slug, [(cap, None, 1)], total="10.00")
    await client.patch("/api/v1/seller/store", headers=headers, json={"currency": "KHR"})
    await place_order(client, slug, [(cap, None, 2)], total="20.00")

    [dara] = (await customers(client, headers))["customers"]
    assert dara["spent"] == [
        {"currency": "KHR", "amount": "20.00"},
        {"currency": "USD", "amount": "10.00"},
    ]


async def test_find_by_part_of_the_name_or_the_phone_typed_any_way(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    for name, phone in [
        ("Dara", "012 345 678"),
        ("Sokha", "097 111 222"),
        ("ដារ៉ា", "+66 81 234 5678"),
    ]:
        await place_order(client, slug, [(cap, None, 1)], total="10.00", name=name, phone=phone)

    assert await names(client, headers, "dar") == ["Dara"]
    assert await names(client, headers, "SOK") == ["Sokha"]
    assert await names(client, headers, "ដារ") == ["ដារ៉ា"]
    assert await names(client, headers, "012 345") == ["Dara"]
    assert await names(client, headers, "+855 97 111") == ["Sokha"]
    assert await names(client, headers, "111-222") == ["Sokha"]
    assert await names(client, headers, "+66 81") == ["ដារ៉ា"]
    assert await names(client, headers, "%") == []  # not a wildcard
    assert await names(client, headers, "Chan") == []
    assert len(await names(client, headers, " ")) == 3  # blank: everyone

    found = await customers(client, headers, q="a")  # Dara and Sokha
    assert found["total"] == 2


async def test_list_a_page_at_a_time(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    for n, phone in enumerate(["012 000 001", "012 000 002", "012 000 003"]):
        await place_order(client, slug, [(cap, None, 1)], total="10.00", name=f"C{n}", phone=phone)

    first = await customers(client, headers, limit=2)
    assert [c["name"] for c in first["customers"]] == ["C2", "C1"]
    assert (first["has_more"], first["total"]) == (True, 3)
    rest = await customers(client, headers, limit=2, offset=2)
    assert [c["name"] for c in rest["customers"]] == ["C0"]
    assert rest["has_more"] is False


async def test_customers_stay_in_their_store(client, auth_headers):
    a_headers, a_store, a_slug = await registered_seller(client, auth_headers)
    b_headers, b_store, _ = await registered_seller(client, auth_headers)
    cap = await add_product(a_store, "cap", stock=20)
    await place_order(client, a_slug, [(cap, None, 1)], total="10.00")

    assert (await customers(client, b_headers)) == {"customers": [], "has_more": False, "total": 0}
    assert len((await customers(client, a_headers))["customers"]) == 1
    # RLS alone: B's session finds none of A's, even asked for A's store.
    async with tenant_session(b_store) as db:
        listed = await customer_service.list_customers(db, a_store)
    assert (listed.customers, listed.total) == ([], 0)


async def test_a_customers_page_has_their_details_and_orders(client, auth_headers):
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    first = await place_order(client, slug, [(cap, None, 1)], total="10.00", address="Old St")
    second = await place_order(client, slug, [(cap, None, 2)], total="20.00", address="New St")
    await reject(client, headers, second.json()["id"])
    # Someone else's order isn't on Dara's page.
    await place_order(
        client, slug, [(cap, None, 1)], total="10.00", name="Sokha", phone="097 111 222"
    )
    [dara] = (await customers(client, headers, q="Dara"))["customers"]

    response = await client.get(f"{URL}/{dara['id']}", headers=headers)
    assert response.status_code == 200, response.text
    page = response.json()
    assert (page["name"], page["phone"], page["address"]) == ("Dara", "012345678", "New St")
    assert (page["order_count"], page["spent"]) == (2, [{"currency": "USD", "amount": "10.00"}])
    assert [(o["number"], o["status"], o["total"]) for o in page["orders"]] == [
        (1002, "rejected", "20.00"),
        (1001, "pending", "10.00"),
    ]
    assert page["orders"][1]["id"] == first.json()["id"]
    assert page["orders"][1]["payment_method"] == "cod"


async def test_a_customers_page_lists_only_their_latest_orders(client, auth_headers, monkeypatch):
    monkeypatch.setattr(customer_service, "MAX_HISTORY", 2)
    headers, store_id, slug = await registered_seller(client, auth_headers)
    cap = await add_product(store_id, "cap", stock=20)
    for _ in range(3):
        await place_order(client, slug, [(cap, None, 1)], total="10.00")
    [dara] = (await customers(client, headers))["customers"]

    page = (await client.get(f"{URL}/{dara['id']}", headers=headers)).json()
    assert [o["number"] for o in page["orders"]] == [1003, 1002]
    assert page["order_count"] == 3
    assert page["spent"] == [{"currency": "USD", "amount": "30.00"}]


async def test_a_customers_page_is_only_for_their_store(client, auth_headers):
    a_headers, a_store, a_slug = await registered_seller(client, auth_headers)
    b_headers, b_store, _ = await registered_seller(client, auth_headers)
    cap = await add_product(a_store, "cap", stock=20)
    await place_order(client, a_slug, [(cap, None, 1)], total="10.00")
    [dara] = (await customers(client, a_headers))["customers"]

    response = await client.get(f"{URL}/{dara['id']}", headers=b_headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "CUSTOMER_NOT_FOUND"
    assert (await client.get(f"{URL}/{uuid.uuid4()}", headers=a_headers)).status_code == 404
    # RLS alone: B's session can't load A's customer even asked for A's store.
    async with tenant_session(b_store) as db:
        with pytest.raises(AppError):
            await customer_service.get_customer(db, a_store, uuid.UUID(dara["id"]))
