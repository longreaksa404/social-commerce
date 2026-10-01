import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import bcrypt
import jwt

from app.core.config import get_settings
from app.core.errors import AppError

ALGORITHM = "HS256"
TokenType = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:  # malformed hash
        return False


# Checked against when the email doesn't exist, so a login for an unknown
# email takes as long as one with a wrong password.
DUMMY_PASSWORD_HASH = hash_password("not-a-real-password")


def _encode(claims: dict[str, Any], lifetime: timedelta) -> str:
    now = datetime.now(UTC)
    payload = {**claims, "iat": now, "exp": now + lifetime}
    return jwt.encode(payload, get_settings().jwt_secret, algorithm=ALGORITHM)


def create_access_token(seller_id: uuid.UUID, store_id: uuid.UUID) -> str:
    """The store id travels in the token; seller requests take their tenant
    from here, never from the URL or body."""
    settings = get_settings()
    return _encode(
        {"type": "access", "sub": str(seller_id), "store_id": str(store_id)},
        timedelta(minutes=settings.access_token_minutes),
    )


def create_refresh_token(seller_id: uuid.UUID, token_id: uuid.UUID) -> str:
    settings = get_settings()
    return _encode(
        {"type": "refresh", "sub": str(seller_id), "jti": str(token_id)},
        timedelta(days=settings.refresh_token_days),
    )


def refresh_token_lifetime() -> timedelta:
    return timedelta(days=get_settings().refresh_token_days)


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise AppError(401, "TOKEN_EXPIRED", "Your session has expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise AppError(401, "INVALID_TOKEN", "Invalid authentication token.") from exc
    if payload["type"] != expected_type:
        raise AppError(401, "INVALID_TOKEN", "Invalid authentication token.")
    return payload
