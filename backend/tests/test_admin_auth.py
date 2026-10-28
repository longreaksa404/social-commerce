"""The admin's own login (01_PRODUCT.md §22.11, founder 2026-10-28): the
system owner's account, not a shop's. The password, then the Telegram
step; the first time, Telegram then a password; only ADMIN_PHONES."""

from sqlalchemy import select

from app.admin import admin_password
from app.api.session_cookie import ADMIN_REFRESH_COOKIE
from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import AdminSession
from app.services import admin_auth
from tests.conftest import ADMIN_PASSWORD
from tests.helpers import random_phone, verified_phone_check

AUTH = "/api/v1/admin/auth"
SHOPS = "/api/v1/admin/shops"


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def cookie(token: str) -> dict[str, str]:
    return {"Cookie": f"{ADMIN_REFRESH_COOKIE}={token}"}


async def log_in(client, phone: str, password: str = ADMIN_PASSWORD, telegram_phone=None):
    """Both steps: the password, then a check shared from `telegram_phone`
    (the admin's own number unless given)."""
    step = await client.post(f"{AUTH}/login", json={"phone": phone, "password": password})
    if step.status_code != 200:
        return step
    check_id, _ = await verified_phone_check(telegram_phone or phone)
    return await client.post(
        f"{AUTH}/confirm", json={"step_token": step.json()["step_token"], "phone_check": check_id}
    )


async def test_the_first_time_a_listed_number_sets_its_password(client, admin):
    me = await client.get(f"{AUTH}/me", headers=bearer(admin["access_token"]))
    check_id, _ = await verified_phone_check(admin["phone"])
    again = await client.post(
        f"{AUTH}/setup", json={"phone_check": check_id, "password": "another-password"}
    )

    assert me.status_code == 200, me.text
    assert me.json() == {"phone": admin["phone"], "telegram": True}
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "ADMIN_EXISTS"


async def test_a_number_not_in_admin_phones_cant_set_one_up(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "admin_phones", "+855 12 000 111")
    check_id, _ = await verified_phone_check(random_phone())

    response = await client.post(
        f"{AUTH}/setup", json={"phone_check": check_id, "password": ADMIN_PASSWORD}
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ADMIN_ONLY"


async def test_logging_in_takes_the_password_then_telegram(client, admin):
    response = await log_in(client, admin["phone"])

    assert response.status_code == 200, response.text
    assert ADMIN_REFRESH_COOKIE in response.cookies
    shops = await client.get(SHOPS, headers=bearer(response.json()["access_token"]))
    assert shops.status_code == 200, shops.text


async def test_a_wrong_password_or_another_telegram_number_is_refused(client, admin):
    wrong = await log_in(client, admin["phone"], password="not-the-password")
    unknown = await log_in(client, random_phone())
    other_telegram = await log_in(client, admin["phone"], telegram_phone=random_phone())

    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"]["code"] == unknown.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert other_telegram.status_code == 403
    assert other_telegram.json()["error"]["code"] == "ADMIN_PHONE_MISMATCH"


async def test_the_password_alone_doesnt_open_the_admin(client, admin):
    step = await client.post(
        f"{AUTH}/login", json={"phone": admin["phone"], "password": ADMIN_PASSWORD}
    )

    response = await client.get(SHOPS, headers=bearer(step.json()["step_token"]))

    assert response.status_code == 401


async def test_shop_logins_and_the_admin_stay_apart(client, register, admin):
    # The founder's own shop, on the same number as the admin account.
    seller = await register(phone=admin["phone"])

    by_seller = await client.get(SHOPS, headers=bearer(seller["access_token"]))
    by_admin = await client.get("/api/v1/seller/store", headers=bearer(admin["access_token"]))
    own_shop = await client.get("/api/v1/seller/store", headers=bearer(seller["access_token"]))

    assert by_seller.status_code == 401
    assert by_admin.status_code == 401
    assert own_shop.status_code == 200


async def test_taking_a_number_off_admin_phones_stops_it_at_once(client, admin, monkeypatch):
    monkeypatch.setattr(get_settings(), "admin_phones", "")

    access = await client.get(SHOPS, headers=bearer(admin["access_token"]))
    refresh = await client.post(f"{AUTH}/refresh", headers=cookie(admin["refresh_token"]))
    login = await client.post(
        f"{AUTH}/login", json={"phone": admin["phone"], "password": ADMIN_PASSWORD}
    )

    assert access.status_code == 403
    assert access.json()["error"]["code"] == "ADMIN_ONLY"
    assert refresh.status_code == login.status_code == 401


async def test_refresh_swaps_the_session_and_logout_ends_it(client, admin):
    swapped = await client.post(f"{AUTH}/refresh", headers=cookie(admin["refresh_token"]))
    new_refresh = swapped.cookies[ADMIN_REFRESH_COOKIE]
    out = await client.post(f"{AUTH}/logout", headers=cookie(new_refresh))
    after = await client.post(f"{AUTH}/refresh", headers=cookie(new_refresh))

    assert swapped.status_code == 200, swapped.text
    assert (await client.get(SHOPS, headers=bearer(swapped.json()["access_token"]))).is_success
    assert out.status_code == 204
    assert after.status_code == 401


async def test_the_password_again_opens_critical_actions_for_a_while(client, admin):
    headers = bearer(admin["access_token"])

    wrong = await client.post(f"{AUTH}/password", headers=headers, json={"password": "nope"})
    async with unscoped_session() as db:
        before = await db.scalar(select(AdminSession).order_by(AdminSession.created_at.desc()))
        assert not admin_auth.password_recent(before)
    right = await client.post(
        f"{AUTH}/password", headers=headers, json={"password": ADMIN_PASSWORD}
    )

    assert wrong.status_code == 422
    assert wrong.json()["error"]["code"] == "WRONG_PASSWORD"
    assert right.status_code == 204
    async with unscoped_session() as db:
        session = await db.get(AdminSession, before.id)
        assert admin_auth.password_recent(session)


async def test_a_forgotten_admin_password_is_reset_by_the_command(client, admin):
    password = await admin_password(admin["phone"])

    old = await log_in(client, admin["phone"])
    new = await log_in(client, admin["phone"], password=password)
    ended = await client.post(f"{AUTH}/refresh", headers=cookie(admin["refresh_token"]))

    assert old.status_code == 401
    assert new.status_code == 200, new.text
    assert ended.status_code == 401
