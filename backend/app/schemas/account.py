import uuid

from pydantic import BaseModel, Field

from app.models import SellerRole
from app.schemas.auth import Password
from app.schemas.common import Name


class AccountOut(BaseModel):
    """The logged-in person's own details (Settings → Your account)."""

    # The login: a phone number checked in Telegram. Accounts from before
    # phone sign-up (2026-10-09) log in with their email and may have no
    # phone (theirs was the same as another account's).
    phone: str | None
    email: str | None
    full_name: str
    # owner: everything; staff: everything but Settings.
    role: SellerRole
    # False for an account made with Google until it adds a password.
    has_password: bool
    # The Google account that logs in to this one, if any.
    google_email: str | None = None
    google_connected: bool = False


class AccountUpdate(BaseModel):
    """Partial: fields left out stay as they are. The phone number changes
    through a phone check (PhoneChange), the email not at all."""

    full_name: Name | None = None


class PhoneChange(BaseModel):
    """A new number, checked in Telegram like at sign-up."""

    phone_check: uuid.UUID


class CloseShopIn(BaseModel):
    # Not needed by an account without one (made with Google).
    password: str | None = Field(None, max_length=200)


class PasswordChange(BaseModel):
    # Not needed when the account has none yet (made with Google): this
    # adds one.
    current_password: str | None = Field(None, max_length=200)
    new_password: Password
