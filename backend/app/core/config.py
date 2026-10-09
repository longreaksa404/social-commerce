from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

# Local dev keeps one .env at the repo root; in production the values come
# from real environment variables and the file simply doesn't exist.
ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    environment: str = "development"
    database_url: str
    cors_origins: list[str] = []
    # Error tracking is off unless a DSN is set (production only).
    sentry_dsn: str = ""

    # Auth (02_TECHNICAL.md section 13)
    jwt_secret: str = Field(min_length=32)
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    rate_limit_enabled: bool = True

    # Product images on Cloudflare R2. Uploads return 503 until all are set.
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""
    r2_public_url: str = ""  # e.g. https://pub-xxxx.r2.dev, no trailing slash

    # Telegram bot for seller order alerts (02_TECHNICAL.md section 12).
    # Off until the token, username and webhook secret are all set.
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""  # without the @, e.g. MyShopAlertsBot
    # Any random string (A-Z, a-z, 0-9, _ and -); Telegram sends it back on
    # every webhook call so we know the call is really from Telegram.
    telegram_webhook_secret: str = ""
    # This API's public https address, e.g. https://api.oaksolve.com.
    # When set (with the bot), the webhook is registered with Telegram at
    # startup. Leave empty locally so a dev server never takes over the bot.
    public_api_url: str = ""
    # The web app's public address, for "Open order" links in alerts.
    public_app_url: str = ""

    @property
    def telegram_configured(self) -> bool:
        return all(
            (self.telegram_bot_token, self.telegram_bot_username, self.telegram_webhook_secret)
        )

    @property
    def r2_configured(self) -> bool:
        return all(
            (
                self.r2_account_id,
                self.r2_access_key_id,
                self.r2_secret_access_key,
                self.r2_bucket,
                self.r2_public_url,
            )
        )

    @field_validator("database_url")
    @classmethod
    def use_asyncpg(cls, value: str) -> str:
        """Accept the plain postgresql:// URL that Neon hands out.

        asyncpg needs the +asyncpg driver, takes `ssl` instead of libpq's
        `sslmode`, and rejects `channel_binding`.
        """
        url = make_url(value).set(drivername="postgresql+asyncpg")
        query = dict(url.query)
        if "sslmode" in query:
            query["ssl"] = query.pop("sslmode")
        query.pop("channel_binding", None)
        return url.set(query=query).render_as_string(hide_password=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
