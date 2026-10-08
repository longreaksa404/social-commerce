from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import SellerRole
from app.schemas.auth import Password, Phone
from app.schemas.common import Name


class AccountOut(BaseModel):
    """The logged-in person's own details (Settings → Your account)."""

    model_config = ConfigDict(from_attributes=True)

    email: str
    full_name: str
    phone: str
    # owner: everything; staff: everything but Settings.
    role: SellerRole


class AccountUpdate(BaseModel):
    """Partial: fields left out stay as they are."""

    email: EmailStr | None = None
    full_name: Name | None = None
    phone: Phone | None = None


class CloseShopIn(BaseModel):
    password: str = Field(max_length=200)


class PasswordChange(BaseModel):
    current_password: str = Field(max_length=200)
    new_password: Password
