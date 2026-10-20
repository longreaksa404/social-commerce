"""The bot's webhook (02_TECHNICAL.md section 12.3)."""

import hmac
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Header, Request
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.errors import NotFound
from app.core.ratelimit import check_limit
from app.schemas.customer_login import MyShopOut, MyShopsIn
from app.services import customer_login, telegram

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


def _check_rate_limit(request: Request) -> None:
    check_limit("30/minute", "my-shops", request)


@router.post("/my-shops", response_model=list[MyShopOut], dependencies=[Depends(_check_rate_limit)])
async def my_shops(
    data: MyShopsIn,
    customer_token: Annotated[str | None, Header(alias="X-Customer-Token", max_length=2048)] = None,
) -> list[MyShopOut]:
    """ "Your shops", what OPEN in Telegram's chat list opens (founder,
    2026-10-20): the shops this customer ordered from, by Telegram's signed
    initData inside Telegram, else their device's token."""
    return await customer_login.my_shops(data.init_data, customer_token)
