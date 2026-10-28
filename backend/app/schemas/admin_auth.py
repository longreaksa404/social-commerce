import uuid

from pydantic import BaseModel, Field

from app.schemas.auth import Password


class AdminLoginIn(BaseModel):
    """Step 1 of the admin's login: the phone and password."""

    phone: str = Field(min_length=1, max_length=32)
    # Room for any password that could be set (72 bytes), but no megabyte bodies.
    password: str = Field(max_length=200)


class AdminStepOut(BaseModel):
    """The right password: hand this in with the Telegram step."""

    step_token: str


class AdminConfirmIn(BaseModel):
    """Step 2: the admin's own number, shared with Oak's bot
    (POST /auth/phone-checks)."""

    step_token: str = Field(max_length=1000)
    phone_check: uuid.UUID


class AdminSetupIn(BaseModel):
    """The first time: a number in ADMIN_PHONES, shared with the bot, and
    the password it will log in with."""

    phone_check: uuid.UUID
    password: Password


class AdminPasswordIn(BaseModel):
    """The password again, before a critical action."""

    password: str = Field(max_length=200)


class AdminMeOut(BaseModel):
    phone: str
    telegram: bool
