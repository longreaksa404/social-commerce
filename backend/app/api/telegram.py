"""The bot's webhook (02_TECHNICAL.md section 12.3)."""

import hmac
from typing import Annotated, Any

from fastapi import APIRouter, Body, Header
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.errors import NotFound
from app.services import telegram

router = APIRouter(prefix="/telegram", tags=["telegram"], include_in_schema=False)


@router.post("/webhook")
async def webhook(
    update: Annotated[dict[str, Any], Body()],
    secret: Annotated[str | None, Header(alias="X-Telegram-Bot-Api-Secret-Token")] = None,
) -> JSONResponse:
    settings = get_settings()
    # Telegram sends back the secret given in setWebhook; anything else
    # isn't Telegram. 404 either way, so the endpoint gives nothing away.
    if not settings.telegram_configured or not hmac.compare_digest(
        (secret or "").encode(), settings.telegram_webhook_secret.encode()
    ):
        raise NotFound("NOT_FOUND", "Not found.")
    reply = await telegram.handle_update(update)
    return JSONResponse(reply or {})
