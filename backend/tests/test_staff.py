"""Staff logins (founder's choice 2026-10-08): the owner adds helpers who
can do everything but Settings."""

import uuid

import pytest

from app import admin
from tests.helpers import add_product, place_order, registered_seller

STAFF = "/api/v1/seller/staff"


def _bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def _add_staff(client, owner_headers, email="helper@example.com", **overrides) -> dict:
    body = {
        "full_name": "Dara",
        "phone": "097 765 4321",
        "email": email,
        "password": "first-password",
        **overrides,
    }
    response = await client.post(STAFF, headers=owner_headers, json=body)
    assert response.status_code == 201, response.text
    return response.json()


async def _staff_login(client, email, password="first-password") -> dict:
    response = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


def _unique_email(tag: str) -> str:
    return f"{tag}-{uuid.uuid4().hex[:8]}@example.com"


async def test_staff_work_in_the_owners_shop(client, auth_headers):
    owner, store_id, slug = await registered_seller(client, auth_headers)
    email = _unique_email("helper")
    await _add_staff(client, owner, email=email)
    staff = _bearer(await _staff_login(client, email))
    cap = await add_product(store_id, "cap", stock=5)
    order = (await place_order(client, slug, [(cap, None, 1)], total="10.00")).json()

    store = await client.get("/api/v1/seller/store", headers=staff)
    orders = await client.get("/api/v1/seller/orders", headers=staff)
    accepted = await client.patch(
        f"/api/v1/seller/orders/{order['id']}/status", headers=staff, json={"status": "accepted"}
    )
    products = await client.get("/api/v1/seller/products", headers=staff)
    me = await client.get("/api/v1/seller/account", headers=staff)

    assert store.json()["slug"] == slug
    assert [o["id"] for o in orders.json()["orders"]] == [order["id"]]
    assert accepted.status_code == 200
    assert len(products.json()) == 1
    assert (me.json()["email"], me.json()["role"]) == (email, "staff")


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("PATCH", "/api/v1/seller/store", {"name": "Mine now"}),
        ("POST", "/api/v1/seller/store/logo", {"content_type": "image/png", "size": 100}),
        ("POST", "/api/v1/seller/store/telegram/link", None),
        ("DELETE", "/api/v1/seller/store/telegram", None),
        ("GET", "/api/v1/seller/orders/export?first=2026-10-01&last=2026-10-08", None),
        ("POST", "/api/v1/seller/account/close-shop", {"password": "first-password"}),
        ("GET", STAFF, None),
        (
            "POST",
            STAFF,
            {
                "full_name": "X",
                "phone": "012345678",
                "email": "x@example.com",
                "password": "12345678",
            },
        ),
    ],
)
async def test_staff_cant_use_settings(client, auth_headers, method, path, body):
    owner, _, _ = await registered_seller(client, auth_headers)
    email = _unique_email("helper")
    await _add_staff(client, owner, email=email)
    staff = _bearer(await _staff_login(client, email))

    response = await client.request(method, path, headers=staff, json=body)

    assert response.status_code == 403, response.text
    assert response.json()["error"]["code"] == "OWNER_ONLY"


async def test_owner_sees_sets_a_password_for_and_removes_only_their_staff(client, auth_headers):
    a, _, _ = await registered_seller(client, auth_headers)
    b, _, _ = await registered_seller(client, auth_headers)
    email = _unique_email("helper")
    helper = await _add_staff(client, a, email=email)
    phone = await _staff_login(client, email)

    others_list = await client.get(STAFF, headers=b)
    others_reset = await client.post(
        f"{STAFF}/{helper['id']}/password", headers=b, json={"password": "taken-over"}
    )
    others_remove = await client.delete(f"{STAFF}/{helper['id']}", headers=b)
    assert others_list.json() == []
    assert others_reset.status_code == 404
    assert others_remove.status_code == 404

    reset = await client.post(
        f"{STAFF}/{helper['id']}/password", headers=a, json={"password": "second-password"}
    )
    assert reset.status_code == 200
    # Their phones are logged out; the new password works.
    stale = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": phone["refresh_token"]}
    )
    assert stale.status_code == 401
    await _staff_login(client, email, "second-password")

    removed = await client.delete(f"{STAFF}/{helper['id']}", headers=a)
    assert removed.status_code == 204
    gone = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "second-password"}
    )
    assert gone.status_code == 401
    assert (await client.get(STAFF, headers=a)).json() == []


async def test_staff_email_must_be_free(client, auth_headers, register):
    owner, _, _ = await registered_seller(client, auth_headers)
    someone = await register()

    response = await client.post(
        STAFF,
        headers=owner,
        json={
            "full_name": "Dara",
            "phone": "012345678",
            "email": someone["email"],
            "password": "first-password",
        },
    )

    assert response.status_code == 409
    assert response.json()["error"]["field"] == "email"


async def test_closing_the_shop_closes_its_staff_logins_too(client, register):
    owner_tokens = await register()
    owner = _bearer(owner_tokens)
    email = _unique_email("helper")
    await _add_staff(client, owner, email=email)

    closed = await client.post(
        "/api/v1/seller/account/close-shop", headers=owner, json={"password": "correct-horse"}
    )
    login = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "first-password"}
    )

    assert closed.status_code == 204
    assert login.status_code == 403
    await admin.set_shop_open(owner_tokens["email"], True)
    await _staff_login(client, email)


async def test_erasing_a_shop_erases_its_staff_logins(client, register):
    owner_tokens = await register()
    email = _unique_email("helper")
    await _add_staff(client, _bearer(owner_tokens), email=email)
    slug = (await admin.shop_size(owner_tokens["email"])).slug

    await admin.set_shop_open(owner_tokens["email"], False)
    await admin.erase_shop(owner_tokens["email"], slug)

    with pytest.raises(admin.AdminError, match="No account"):
        await admin.reset_password(email)


async def test_staff_refresh_keeps_the_staff_role(client, auth_headers):
    owner, _, _ = await registered_seller(client, auth_headers)
    email = _unique_email("helper")
    await _add_staff(client, owner, email=email)
    tokens = await _staff_login(client, email)

    refreshed = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    still_staff = await client.patch(
        "/api/v1/seller/store", headers=_bearer(refreshed.json()), json={"name": "Mine"}
    )

    assert refreshed.status_code == 200
    assert still_staff.status_code == 403
