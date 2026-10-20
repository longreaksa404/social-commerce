"""The bot's webhook (02_TECHNICAL.md section 12.3)."""

import hmac
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Header, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, StringConstraints

from app.core.config import get_settings
from app.core.errors import AppError, NotFound
from app.core.ratelimit import check_limit
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


class MiniAppCheckIn(BaseModel):
    init_data: Annotated[str, StringConstraints(max_length=4096)]


def _check_rate_limit(request: Request) -> None:
    check_limit("30/minute", "mini-app-check", request)


@router.post("/mini-app/check", dependencies=[Depends(_check_rate_limit)])
async def mini_app_check(data: MiniAppCheckIn) -> dict[str, Any]:
    """The founder's mini app test (2026-10-20, temporary): whether the
    server can tell who opened it. Answers the Telegram user Telegram
    signed for, or 401."""
    if not get_settings().telegram_configured:
        raise AppError(503, "TELEGRAM_NOT_CONFIGURED", "Updates on Telegram are off.")
    user = telegram.read_mini_app_data(data.init_data)
    if user is None:
        raise AppError(401, "TELEGRAM_DATA_INVALID", "This didn't come from Telegram.")
    return {"id": user["id"], "first_name": user.get("first_name"), "auth_date": user["auth_date"]}
