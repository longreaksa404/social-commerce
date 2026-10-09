import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, EmailStr, Field, StringConstraints

from app.schemas.common import Name


def _bcrypt_limit(password: str) -> str:
    # bcrypt only uses the first 72 bytes and the library rejects longer input.
    if len(password.encode()) > 72:
        raise ValueError("Password is too long (max 72 bytes).")
    return password


Password = Annotated[str, Field(min_length=8), AfterValidator(_bcrypt_limit)]
Phone = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\+?[0-9 ]{6,20}$")]


class RegisterIn(BaseModel):
    email: EmailStr
    password: Password
    full_name: Name
    phone: Phone
    store_name: Name


class LoginIn(BaseModel):
    email: EmailStr
    # Room for any password that could be registered (72 bytes), but no
    # megabyte bodies.
    password: str = Field(max_length=200)


class PasswordResetIn(BaseModel):
    email: EmailStr


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
