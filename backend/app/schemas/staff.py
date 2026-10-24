import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.auth import Password
from app.schemas.common import Name, Phone


class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    # Their login. Staff added before 2026-10-09 log in with an email and
    # may have no phone.
    phone: str | None
    email: str | None
    created_at: datetime


class StaffCreate(BaseModel):
    """The owner gives the helper their phone number and first password
    as their login; they change the password in Settings → Your account."""

    full_name: Name
    phone: Phone
    password: Password


class StaffUpdate(BaseModel):
    """Edit a helper (founder's test list #26, 2026-10-24): their name, or
    the phone number they log in with. Left out = unchanged."""

    full_name: Name | None = None
    phone: Phone | None = None


class StaffPassword(BaseModel):
    password: Password
