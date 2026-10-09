import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import update

from app.core import security
from app.db.session import unscoped_session
from app.models import RefreshToken
from app.services.auth import REUSE_GRACE


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


async def _refresh(client, token: str):
    return await client.post("/api/v1/auth/refresh", json={"refresh_token": token})


async def test_login_with_wrong_password_uses_error_envelope(client, register):
    seller = await register()

    response = await client.post(
        "/api/v1/auth/login", json={"email": seller["email"], "password": "wrong-password"}
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


async def test_email_is_case_insensitive_and_unique(client, register):
    seller = await register()

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": seller["email"].upper(), "password": "correct-horse"},
    )
    duplicate = await client.post(
        "/api/v1/auth/register",
        json={
            "email": seller["email"].upper(),
            "password": "correct-horse",
            "full_name": "Someone",
            "phone": "012345678",
            "store_name": "Other",
        },
    )

    assert login.status_code == 200
    assert duplicate.status_code == 409
    assert duplicate.json()["error"] == {
        "code": "EMAIL_TAKEN",
        "message": "An account with this email already exists.",
        "field": "email",
    }


async def test_refresh_token_reused_after_the_grace_ends_all_sessions(client, register):
    seller = await register()
    first = seller["refresh_token"]

    rotated = await _refresh(client, first)
    assert rotated.status_code == 200
    second = rotated.json()["refresh_token"]
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
    assert (await _refresh(client, retried.json()["refresh_token"])).status_code == 200
    assert (await _refresh(client, lost.json()["refresh_token"])).status_code == 200


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

    logout = await client.post(
        "/api/v1/auth/logout", json={"refresh_token": seller["refresh_token"]}
    )
    refresh = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": seller["refresh_token"]}
    )

    assert logout.status_code == 204
    assert refresh.status_code == 401


async def test_logged_out_token_is_refused_even_within_the_grace(client, register):
    """Logging out deletes the session, so the retry window never applies."""
    seller = await register()
    rotated = await _refresh(client, seller["refresh_token"])
    current = rotated.json()["refresh_token"]

    await client.post("/api/v1/auth/logout", json={"refresh_token": current})

    assert (await _refresh(client, current)).status_code == 401


async def test_access_token_is_not_accepted_as_refresh_token(client, register):
    seller = await register()

    response = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": seller["access_token"]}
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
