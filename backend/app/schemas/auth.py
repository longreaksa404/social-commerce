import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, AliasChoices, BaseModel, Field

from app.schemas.common import Name


def _bcrypt_limit(password: str) -> str:
    # bcrypt only uses the first 72 bytes and the library rejects longer input.
    if len(password.encode()) > 72:
        raise ValueError("Password is too long (max 72 bytes).")
    return password


Password = Annotated[str, Field(min_length=8), AfterValidator(_bcrypt_limit)]
# What a login form names the account by: a phone number, or the email of
# an account made before sign-up moved to phone numbers (2026-10-09).
# "email" is the field's old name, still accepted.
Login = Annotated[
    str, Field(min_length=1, max_length=200, validation_alias=AliasChoices("login", "email"))
]


class RegisterIn(BaseModel):
    """Sign-up with a phone number and password (founder's choice
    2026-10-09). The number isn't typed: it's the one the seller shared
    with the Telegram bot, handed in as the phone check's id."""

    full_name: Name
    store_name: Name
    password: Password
    phone_check: uuid.UUID


class LoginIn(BaseModel):
    login: Login
    # Room for any password that could be registered (72 bytes), but no
    # megabyte bodies.
    password: str = Field(max_length=200)


class PasswordResetIn(BaseModel):
    login: Login


class PasswordResetConfirm(BaseModel):
    token: str = Field(max_length=1000)
    new_password: Password


class TokenPair(BaseModel):
    """What the auth service issues. The API puts the refresh token in an
    httpOnly cookie (app/api/session_cookie.py) and answers with AccessOut."""

    access_token: str
    refresh_token: str


class AccessOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class PhoneCheckOut(BaseModel):
    """A phone number being proved through the Telegram bot
    (app/services/phone_check.py). The page opens telegram_url, then reads
    the check again until `phone` is set."""

    id: uuid.UUID
    telegram_url: str
    expires_at: datetime
    # The number the seller shared with the bot; null until then.
    phone: str | None = None
    # That number already has an account: log in instead.
    taken: bool = False
