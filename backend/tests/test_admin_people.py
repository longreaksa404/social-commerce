"""Everyone who logs in, for the admin (01_PRODUCT.md §22.11, parts 8 to
12): a new password, every phone logged out, a new login phone, a Google
or Facebook login taken off; the critical ones after the admin's password
again."""

from sqlalchemy import select, update

from app.db.session import unscoped_session
from app.models import LoginProvider, Seller, SellerLogin
from tests.conftest import ADMIN_PASSWORD
from tests.helpers import random_phone, refresh

SELLERS = "/api/v1/admin/sellers"


def bearer(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def password_again(client, admin) -> None:
    response = await client.post(
        "/api/v1/admin/auth/password", headers=bearer(admin), json={"password": ADMIN_PASSWORD}
    )
    assert response.status_code == 204, response.text


async def login(client, phone, password="correct-horse"):
    return await client.post("/api/v1/auth/login", json={"login": phone, "password": password})


async def person_of(client, admin, phone) -> dict:
    people = (await client.get(SELLERS, headers=bearer(admin))).json()
    return next(p for p in people if p["phone"] == phone)


async def test_every_login_is_listed_with_its_shop(client, register, admin):
    seller = await register()
    staff_phone = random_phone()
    added = await client.post(
        "/api/v1/seller/staff",
        headers=bearer(seller),
        json={"full_name": "Pisey", "phone": staff_phone, "password": "first-password"},
    )
    assert added.status_code == 201, added.text

    owner = await person_of(client, admin, seller["phone"])
    staff = await person_of(client, admin, staff_phone)

    assert owner["role"] == "owner" and staff["role"] == "staff"
    assert owner["store_id"] == staff["store_id"]
    assert owner["shop"] == staff["shop"]
    assert owner["is_open"] and staff["is_open"]
    assert owner["last_seen"] is not None


async def test_a_new_password_needs_the_admins_password_and_logs_out_every_phone(
    client, register, admin
):
    seller = await register()
    person = await person_of(client, admin, seller["phone"])
    url = f"{SELLERS}/{person['id']}/password"

    refused = await client.post(url, headers=bearer(admin))
    await password_again(client, admin)
    made = await client.post(url, headers=bearer(admin))

    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "PASSWORD_AGAIN"
    assert made.status_code == 200
    password = made.json()["password"]
    assert (await refresh(client, seller["refresh_token"])).status_code == 401
    assert (await login(client, seller["phone"])).status_code == 401
    assert (await login(client, seller["phone"], password)).status_code == 200
    lines = (await client.get("/api/v1/admin/log", headers=bearer(admin))).json()
    assert lines[0]["action"] == "reset_password"
    assert lines[0]["details"]["person"] == person["name"]
    assert password not in str(lines[0])


async def test_log_out_every_phone_keeps_the_password(client, register, admin):
    seller = await register()
    person = await person_of(client, admin, seller["phone"])

    done = await client.post(f"{SELLERS}/{person['id']}/logout", headers=bearer(admin))

    assert done.status_code == 200
    assert done.json()["last_seen"] is None
    assert (await refresh(client, seller["refresh_token"])).status_code == 401
    assert (await login(client, seller["phone"])).status_code == 200


async def test_change_the_login_phone_refuses_another_logins_number(client, register, admin):
    seller, other = await register(), await register()
    person = await person_of(client, admin, seller["phone"])
    url = f"{SELLERS}/{person['id']}/phone"
    await password_again(client, admin)

    taken = await client.post(url, headers=bearer(admin), json={"phone": other["phone"]})
    new_phone = random_phone()
    changed = await client.post(url, headers=bearer(admin), json={"phone": f"+855 {new_phone[1:]}"})

    assert taken.status_code == 409
    assert changed.status_code == 200
    assert changed.json()["phone"] == new_phone
    assert (await login(client, new_phone)).status_code == 200
    assert (await login(client, seller["phone"])).status_code == 401


async def test_remove_a_google_login_but_never_the_only_way_in(client, register, admin):
    seller = await register()
    person = await person_of(client, admin, seller["phone"])
    async with unscoped_session() as db:
        db.add(
            SellerLogin(
                seller_id=person["id"],
                provider=LoginProvider.GOOGLE,
                provider_user_id=f"g-{person['id']}",
                email="sokha@example.com",
            )
        )
        await db.commit()
    url = f"{SELLERS}/{person['id']}/logins/google"
    await password_again(client, admin)

    # An older account: no phone, no password, Google only.
    async with unscoped_session() as db:
        await db.execute(
            update(Seller)
            .where(Seller.id == person["id"])
            .values(phone=None, email=f"{person['id']}@example.com", password_hash=None)
        )
        await db.commit()
    last = await client.delete(url, headers=bearer(admin))
    async with unscoped_session() as db:
        await db.execute(
            update(Seller).where(Seller.id == person["id"]).values(phone=seller["phone"])
        )
        await db.commit()
    removed = await client.delete(url, headers=bearer(admin))

    assert last.status_code == 409
    assert last.json()["error"]["code"] == "LAST_WAY_IN"
    assert removed.status_code == 200
    assert removed.json()["logins"] == []
    async with unscoped_session() as db:
        assert (
            await db.scalar(select(SellerLogin).where(SellerLogin.seller_id == person["id"]))
            is None
        )
