"""Presigned uploads to Cloudflare R2 (02_TECHNICAL.md section 11).

The browser PUTs the file straight to R2; the API never handles the bytes.
Content-Type and Content-Length are part of the signature, so R2 rejects
an upload whose type or size differs from what was approved here.
"""

import uuid
from functools import lru_cache
from typing import Any

import boto3
from botocore.config import Config
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.schemas.product import MAX_IMAGES
from app.schemas.upload import EXTENSIONS, ImageUploadIn, ImageUploadOut
from app.services.product import get_product, image_prefix

UPLOAD_URL_SECONDS = 600


@lru_cache
def _r2_client() -> Any:
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


async def create_upload(
    db: AsyncSession, store_id: uuid.UUID, product_id: uuid.UUID, data: ImageUploadIn
) -> ImageUploadOut:
    settings = get_settings()
    if not settings.r2_configured:
        raise AppError(503, "UPLOADS_NOT_CONFIGURED", "Image uploads are not set up yet.")

    product = await get_product(db, store_id, product_id)
    if len(product.image_urls) >= MAX_IMAGES:
        raise AppError(422, "TOO_MANY_IMAGES", f"A product can have up to {MAX_IMAGES} images.")

    folder = image_prefix(store_id, product.id).removeprefix(f"{settings.r2_public_url}/")
    name = uuid.uuid4().hex
    extension = EXTENSIONS[data.content_type]
    thumbnail_url = None
    if data.thumbnail_size is None:
        key = f"{folder}{name}.{extension}"
    else:
        key = f"{folder}{name}-m.{extension}"
        thumbnail_url = _signed_put(f"{folder}{name}-s.jpg", "image/jpeg", data.thumbnail_size)
    return ImageUploadOut(
        upload_url=_signed_put(key, data.content_type, data.size),
        public_url=f"{settings.r2_public_url}/{key}",
        headers={"Content-Type": data.content_type},
        thumbnail_upload_url=thumbnail_url,
    )


def _signed_put(key: str, content_type: str, size: int) -> str:
    """A PUT URL that R2 accepts only for this exact type and size."""
    return _r2_client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": get_settings().r2_bucket,
            "Key": key,
            "ContentType": content_type,
            "ContentLength": size,
        },
        ExpiresIn=UPLOAD_URL_SECONDS,
    )
