import uuid

from pydantic import BaseModel, Field

from app.schemas.auth import Password


class AdminTelegramIn(BaseModel):
    """Step 1 of the admin's login: the number, shared with Oak's bot
    (POST /auth/phone-checks)."""

    phone_check: uuid.UUID


class AdminStepOut(BaseModel):
    """An admin's number, proved in Telegram: hand the token in with the
    password. `new`: no account yet, so the password is a new one (setup)."""

    step_token: str
    phone: str
    new: bool


class AdminLoginIn(BaseModel):
    """Step 2: the account's password."""

    step_token: str = Field(max_length=1000)
    # Room for any password that could be set (72 bytes), but no megabyte bodies.
    password: str = Field(max_length=200)


class AdminSetupIn(BaseModel):
    """The first time, step 2: the password it will log in with."""

    step_token: str = Field(max_length=1000)
    password: Password


class AdminPasswordIn(BaseModel):
    """The password again, before a critical action."""

    password: str = Field(max_length=200)


class AdminMeOut(BaseModel):
    phone: str
    telegram: bool
