from typing import Annotated

from pydantic import AfterValidator, StringConstraints
from pydantic_core import PydanticCustomError

from app.services.phone import normalize_phone
from app.services.slugs import MAX_SLUG_LENGTH, SLUG_PATTERN

Slug = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        min_length=2,
        max_length=MAX_SLUG_LENGTH,
        pattern=SLUG_PATTERN,
    ),
]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]


def _phone(value: str) -> str:
    try:
        return normalize_phone(value)
    except ValueError as exc:
        # A custom error type, so the message isn't prefixed "Value error, ".
        raise PydanticCustomError("phone", str(exc)) from exc


# A phone number typed any way, kept as normalize_phone writes it.
Phone = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=32), AfterValidator(_phone)
]
