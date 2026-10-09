"""Local dev only: run the bot by asking Telegram for new messages, so a
laptop (which Telegram's webhook can't reach) can verify phone numbers and
connect alerts. From backend/, beside `uvicorn`:

    python -m app.telegram_poll

Use your own test bot in .env (TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME,
TELEGRAM_WEBHOOK_SECRET), never the live one: the live API gives its bot a
webhook, and Telegram doesn't hand out messages of a bot with a webhook.
"""

import asyncio

import httpx

from app.core.config import get_settings
from app.services import telegram


async def run() -> None:
    settings = get_settings()
    if not settings.telegram_configured:
        raise SystemExit(
            "Set TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME and TELEGRAM_WEBHOOK_SECRET in .env."
        )
    if settings.public_api_url:
        raise SystemExit("PUBLIC_API_URL is set, so this server uses the webhook. Leave it empty.")
    print(f"Answering @{settings.telegram_bot_username}. Ctrl+C to stop.")
    offset = 0
    while True:
        try:
            # Telegram holds the request up to 8 s until a message comes
            # (telegram.call gives up after 10).
            updates = await telegram.call(
                "getUpdates", {"offset": offset, "timeout": 8, "allowed_updates": ["message"]}
            )
        except telegram.TelegramError as exc:
            if exc.status_code == 409:
                raise SystemExit(
                    "This bot has a webhook: is it the live bot? Use a test bot."
                ) from exc
            raise
        except httpx.HTTPError:
            await asyncio.sleep(2)
            continue
        for update in updates:
            offset = update["update_id"] + 1
            reply = await telegram.handle_update(update)
            if reply:
                await telegram.call(reply.pop("method"), reply)


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
