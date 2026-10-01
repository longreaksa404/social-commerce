from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, EmailStr, Field, StringConstraints


def _bcrypt_limit(password: str) -> str:
    # bcrypt only uses the first 72 bytes and the library rejects longer input.
    if len(password.encode()) > 72:
        raise ValueError("Password is too long (max 72 bytes).")
    return password


Password = Annotated[str, Field(min_length=8), AfterValidator(_bcrypt_limit)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Phone = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\+?[0-9 ]{6,20}$")]


class RegisterIn(BaseModel):
    email: EmailStr
    password: Password
    full_name: Name
    phone: Phone
    store_name: Name


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
