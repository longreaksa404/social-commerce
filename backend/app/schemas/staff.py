import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.schemas.auth import Password, Phone
from app.schemas.common import Name


class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str
    phone: str
    created_at: datetime


class StaffCreate(BaseModel):
    """The owner gives the helper this email and first password (there's
    no email sending); they change it in Settings → Your account."""

    full_name: Name
    phone: Phone
    email: EmailStr
    password: Password


class StaffPassword(BaseModel):
    password: Password
