"""Customers' Telegram profile photos (founder, 2026-10-20: "can we get
customer profile image from connected telegram? ... use it on customer
info").

Once a customer's Telegram is linked to a shop's customer (logged in at
checkout, or Get updates on an order), the bot asks Telegram for their
profile photo, copies a small size (160 px or the nearest) to R2 under
the shop's folder, and the seller sees it on the order and the customer's
page. Telegram's own file links carry the bot's token, so they're never
shown. A customer who has no photo, or hides it from bots, has none. It's
fetched again on later orders: a new photo replaces the old one.

Best effort, after the response: a failure is logged and changes nothing.
"""

import asyncio
import logging
import uuid

import httpx
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import get_settings
from app.db.session import tenant_session
from app.models import Customer
from app.services import images, telegram

logger = logging.getLogger(__name__)

MIN_WIDTH = 160
MAX_BYTES = 1_000_000
# Tasks started from the bot's webhook, held so they finish.
_running: set[asyncio.Task] = set()


def refresh_later(store_id: uuid.UUID, customer_id: uuid.UUID) -> None:
    """refresh, without holding up the bot's reply."""
    task = asyncio.create_task(refresh(store_id, customer_id))
    _running.add(task)
    task.add_done_callback(_running.discard)


async def refresh(store_id: uuid.UUID, customer_id: uuid.UUID) -> None:
    settings = get_settings()
    if not settings.telegram_configured or not settings.r2_configured:
        return
    async with tenant_session(store_id) as db:
        customer = await db.get(Customer, customer_id)
        if customer is None or customer.telegram_user_id is None:
            return
        user_id, old = int(customer.telegram_user_id), customer.photo_url
    try:
        found = await telegram.call("getUserProfilePhotos", {"user_id": user_id, "limit": 1})
        sizes = (found.get("photos") or [[]])[0]
        if not sizes:
            new = None  # no photo, or hidden from bots
        else:
            size = next((s for s in sizes if s.get("width", 0) >= MIN_WIDTH), sizes[-1])
            unique = size["file_unique_id"]
            if old and f"-{unique}." in old:
                return  # the same photo as before
            file = await telegram.call("getFile", {"file_id": size["file_id"]})
            body = await _download(file["file_path"])
            if body is None:
                return
            key = f"stores/{store_id}/customers/{customer_id}-{unique}.jpg"
            new = await asyncio.to_thread(images.put_file, key, body, "image/jpeg")
    except (telegram.TelegramError, httpx.HTTPError, KeyError, BotoCoreError, ClientError) as exc:
        logger.warning("A customer's Telegram photo couldn't be copied: %s", type(exc).__name__)
        return
    async with tenant_session(store_id) as db:
        customer = await db.get(Customer, customer_id)
        if customer is None:
            return
        customer.photo_url = new
        await db.commit()
    if old and old != new:
        try:
            await asyncio.to_thread(images.delete_file, old)
        except (BotoCoreError, ClientError):
            logger.warning("An old customer photo couldn't be deleted")


async def _download(file_path: str) -> bytes | None:
    """The photo's bytes from Telegram (the address holds the bot's token:
    never logged)."""
    url = f"{telegram.API_URL}/file/bot{get_settings().telegram_bot_token}/{file_path}"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url)
    if response.status_code != 200 or len(response.content) > MAX_BYTES:
        return None
    return response.content
