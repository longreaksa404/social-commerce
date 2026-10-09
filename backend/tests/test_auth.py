import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import update

from app.core import security
from app.core.config import get_settings
from app.db.session import unscoped_session
from app.models import PhoneCheck, RefreshToken, Seller, Store
from app.services.auth import REUSE_GRACE
from tests.helpers import random_phone, verified_phone_check, with_refresh
from tests.helpers import refresh as _refresh

LOGIN = "/api/v1/auth/login"
REGISTER = "/api/v1/auth/register"


async def _swapped_ago(refresh_token: str, ago: timedelta) -> None:
    """Pretend the token was swapped for a new one `ago`."""
    token_id = uuid.UUID(security.decode_token(refresh_token, "refresh")["jti"])
    async with unscoped_session() as db:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.id == token_id)
            .values(revoked_at=datetime.now(UTC) - ago)
        )
        await db.commit()


async def test_login_with_wrong_password_uses_error_envelope(client, register):
    seller = await register()

    response = await client.post(
        "/api/v1/auth/login", json={"login": seller["phone"], "password": "wrong-password"}
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def _signup(check_id, **overrides) -> dict:
    return {
        "password": "correct-horse",
        "full_name": "Sokha",
        "store_name": "Sokha Fashion",
        "phone_check": check_id,
        **overrides,
    }


async def test_sign_up_with_the_phone_shared_in_telegram(client):
    """The number is the one the bot was given, and that chat with the bot
    gets the new shop's order alerts."""
    check_id, phone = await verified_phone_check(telegram_user_id=4242)

    response = await client.post(REGISTER, json=_signup(check_id))

    assert response.status_code == 201, response.text
    headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
    me = (await client.get("/api/v1/seller/account", headers=headers)).json()
    store = (await client.get("/api/v1/seller/store", headers=headers)).json()
    assert (me["phone"], me["email"]) == (phone, None)
    assert store["telegram_connected"] is True
    async with unscoped_session() as db:
        assert (await db.get(Store, uuid.UUID(store["id"]))).telegram_chat_id == "4242"
        # The check is used up.
        assert await db.get(PhoneCheck, uuid.UUID(check_id)) is None


async def test_log_in_with_the_phone_typed_any_way(client, register):
    seller = await register(phone="012345679")

    for typed in ("012345679", "012 345 679", "+855 12 345 679", "855-12-345-679"):
        response = await client.post(LOGIN, json={"login": typed, "password": "correct-horse"})
        assert response.status_code == 200, typed
    # The field's old name still works (an app page loaded before the change).
    old = await client.post(LOGIN, json={"email": seller["phone"], "password": "correct-horse"})
    assert old.status_code == 200


async def test_sign_up_needs_a_finished_check(client, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "telegram_bot_token", "123:abc")
    monkeypatch.setattr(settings, "telegram_bot_username", "TestShopBot")
    monkeypatch.setattr(settings, "telegram_webhook_secret", "secret")
    unfinished = (await client.post("/api/v1/auth/phone-checks")).json()["id"]

    not_shared = await client.post(REGISTER, json=_signup(unfinished))
    unknown = await client.post(REGISTER, json=_signup(str(uuid.uuid4())))
    # A typed number isn't taken: the field is ignored.
    typed = await client.post(REGISTER, json={**_signup(None), "phone": "012345678"})

    assert not_shared.status_code == 422
    assert not_shared.json()["error"] == {
        "code": "PHONE_NOT_VERIFIED",
        "message": "Verify your phone number with Telegram first.",
        "field": "phone_check",
    }
    assert unknown.json()["error"]["code"] == "PHONE_CHECK_EXPIRED"
    assert typed.status_code == 422


async def test_one_account_per_phone_and_a_check_signs_up_once(client):
    check_id, phone = await verified_phone_check()
    first = await client.post(REGISTER, json=_signup(check_id))
    reused = await client.post(REGISTER, json=_signup(check_id, store_name="Second"))
    same_phone_id, _ = await verified_phone_check(phone)
    same_phone = await client.post(REGISTER, json=_signup(same_phone_id, store_name="Third"))

    assert first.status_code == 201
    assert reused.json()["error"]["code"] == "PHONE_CHECK_EXPIRED"
    assert same_phone.status_code == 409
    assert same_phone.json()["error"] == {
        "code": "PHONE_TAKEN",
        "message": "This phone number already has an account. Log in instead.",
        "field": "phone_check",
    }


async def test_accounts_from_before_log_in_with_their_email(client):
    """Accounts made before sign-up moved to phone numbers have an email
    and maybe no phone."""
    email = f"old-{uuid.uuid4().hex[:8]}@example.com"
    async with unscoped_session() as db:
        seller = Seller(
            email=email,
            password_hash=await security.hash_password("correct-horse"),
            full_name="Old",
        )
        db.add(seller)
        await db.flush()
        db.add(Store(seller_id=seller.id, name="Old", slug=f"old-{uuid.uuid4().hex[:8]}"))
        await db.commit()

    upper = await client.post(LOGIN, json={"login": email.upper(), "password": "correct-horse"})
    old_field = await client.post(LOGIN, json={"email": email, "password": "correct-horse"})

    assert (upper.status_code, old_field.status_code) == (200, 200)


async def test_wrong_or_unreadable_logins_are_refused_alike(client, register):
    await register()

    for login in (random_phone(), "nobody@example.com", "not a phone", "1"):
        response = await client.post(LOGIN, json={"login": login, "password": "correct-horse"})
        assert response.status_code == 401, login
        assert response.json()["error"]["message"] == "Wrong phone number or password."


async def test_refresh_token_reused_after_the_grace_ends_all_sessions(client, register):
    seller = await register()
    first = seller["refresh_token"]

    rotated = await _refresh(client, first)
    assert rotated.status_code == 200
    second = rotated.cookies["refresh_token"]
    await _swapped_ago(first, REUSE_GRACE + timedelta(seconds=1))

    # Reusing the old token later is treated as theft...
    reused = await _refresh(client, first)
    assert reused.status_code == 401
    # ...and also kills the token the legitimate client holds.
    after = await _refresh(client, second)
    assert after.status_code == 401


async def test_refresh_retried_within_the_grace_keeps_the_seller_logged_in(client, register):
    """The phone sent the refresh, the server swapped the token, and the
    answer was lost on a weak connection: the phone tries again with the
    token it still has."""
    seller = await register()
    first = seller["refresh_token"]

    lost = await _refresh(client, first)
    await _swapped_ago(first, REUSE_GRACE - timedelta(seconds=5))
    retried = await _refresh(client, first)

    assert lost.status_code == 200
    assert retried.status_code == 200
    # The retry's new token works, and so does the one whose answer was lost.
    assert (await _refresh(client, retried.cookies["refresh_token"])).status_code == 200
    assert (await _refresh(client, lost.cookies["refresh_token"])).status_code == 200


async def test_retry_does_not_stretch_the_grace(client, register):
    seller = await register()
    first = seller["refresh_token"]

    await _refresh(client, first)
    await _swapped_ago(first, REUSE_GRACE + timedelta(seconds=1))
    # A retry inside the window would have kept the first swap's time; one
    # after it is refused however many came before.
    assert (await _refresh(client, first)).status_code == 401


async def test_logout_revokes_the_refresh_token(client, register):
    seller = await register()

    logout = await client.post("/api/v1/auth/logout", headers=with_refresh(seller["refresh_token"]))
    refresh = await _refresh(client, seller["refresh_token"])

    assert logout.status_code == 204
    # The browser is told to drop the cookie...
    assert 'refresh_token=""' in logout.headers["set-cookie"]
    assert "Max-Age=0" in logout.headers["set-cookie"]
    # ...and the token is dead even if someone kept a copy.
    assert refresh.status_code == 401


async def test_logged_out_token_is_refused_even_within_the_grace(client, register):
    """Logging out deletes the session, so the retry window never applies."""
    seller = await register()
    rotated = await _refresh(client, seller["refresh_token"])
    current = rotated.cookies["refresh_token"]

    await client.post("/api/v1/auth/logout", headers=with_refresh(current))

    assert (await _refresh(client, current)).status_code == 401


async def test_access_token_is_not_accepted_as_refresh_token(client, register):
    seller = await register()

    response = await _refresh(client, seller["access_token"])

    assert response.status_code == 401


async def test_refresh_token_is_an_httponly_cookie_not_in_the_body(client, register):
    """Page scripts never see the refresh token: it's only in a cookie the
    browser sends back to /api/v1/auth, on the app's own site."""
    seller = await register()

    login = await client.post(
        "/api/v1/auth/login", json={"login": seller["phone"], "password": "correct-horse"}
    )

    assert login.status_code == 200
    assert set(login.json()) == {"access_token", "token_type"}
    cookie = login.headers["set-cookie"]
    for attribute in ("HttpOnly", "Secure", "SameSite=lax", "Path=/api/v1/auth", "Max-Age="):
        assert attribute in cookie
    assert "Domain=" not in cookie  # this API's host only


async def test_refresh_without_the_cookie_is_refused(client):
    response = await client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_TOKEN"


async def test_refresh_token_in_the_body_is_ignored(client, register):
    """The old way (token in the JSON body) no longer logs anyone in."""
    seller = await register()

    response = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": seller["refresh_token"]}
    )

    assert response.status_code == 401


async def test_password_check_leaves_the_server_free_for_other_requests():
    """bcrypt runs in a worker thread: while one login is checked, the event
    loop keeps serving (on Render's 0.1 CPU a check takes seconds)."""
    ticks = 0

    async def other_requests():
        nonlocal ticks
        while True:
            await asyncio.sleep(0.005)
            ticks += 1

    task = asyncio.create_task(other_requests())
    await security.verify_password("wrong-password", security.DUMMY_PASSWORD_HASH)
    task.cancel()

    assert ticks >= 5
