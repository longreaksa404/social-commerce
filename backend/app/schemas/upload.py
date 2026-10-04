from typing import Literal

from pydantic import BaseModel, Field

MAX_IMAGE_BYTES = 5 * 1024 * 1024
# The small copy for product grids and lists (made on the phone, ~480px).
MAX_THUMBNAIL_BYTES = 512 * 1024
EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


class ImageUploadIn(BaseModel):
    content_type: Literal["image/jpeg", "image/png", "image/webp"]
    size: int = Field(gt=0, le=MAX_IMAGE_BYTES)
    # Size of a small JPEG copy to upload alongside, if the app made one.
    thumbnail_size: int | None = Field(default=None, gt=0, le=MAX_THUMBNAIL_BYTES)


class ImageUploadOut(BaseModel):
    """PUT the file to upload_url with these headers, then add public_url
    to the product's image_urls with PATCH.

    With a thumbnail, PUT it to thumbnail_upload_url first (as image/jpeg).
    It is stored next to the photo: the photo's name ends in "-m.<ext>",
    the copy's in "-s.jpg", which is how the app finds it. Photos uploaded
    without one have neither ending.
    """

    upload_url: str
    public_url: str
    headers: dict[str, str]
    thumbnail_upload_url: str | None = None
