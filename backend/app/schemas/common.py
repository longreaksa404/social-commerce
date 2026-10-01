from typing import Annotated

from pydantic import StringConstraints

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
