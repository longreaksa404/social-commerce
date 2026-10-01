from typing import Literal

from pydantic import BaseModel, Field

MAX_IMAGE_BYTES = 5 * 1024 * 1024
EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


class ImageUploadIn(BaseModel):
    content_type: Literal["image/jpeg", "image/png", "image/webp"]
    size: int = Field(gt=0, le=MAX_IMAGE_BYTES)


class ImageUploadOut(BaseModel):
    """PUT the file to upload_url with these headers, then add public_url
    to the product's image_urls with PATCH."""

    upload_url: str
    public_url: str
    headers: dict[str, str]
