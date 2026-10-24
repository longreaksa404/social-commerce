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

    # "Continue with Google": the OAuth client ID from Google Cloud (not a
    # secret; the frontend has the same one as VITE_GOOGLE_CLIENT_ID).
    # Empty turns Google sign-in off.
    google_client_id: str = ""

    # "Continue with Facebook": the Meta app's ID (public; the frontend has
    # it as VITE_FACEBOOK_APP_ID) and secret (here only). Off unless both.
    facebook_app_id: str = ""
    facebook_app_secret: str = ""
    # "Continue with TikTok": the TikTok app's client key (public; the
    # frontend has it as VITE_TIKTOK_CLIENT_KEY) and secret. Off unless both.
    tiktok_client_key: str = ""
    tiktok_client_secret: str = ""

    # How sellers pay Oak Order by hand (01_PRODUCT.md §33.1), shown on
    # Settings → Plan with the shop's code. Oak's Bakong account (e.g.
    # oaksolutions@aclb) and the name on its KHQR (English letters, at most
    # 25), and/or a bank account. Without either, the page says to message
    # Oak Order.
    oak_khqr_account: str = ""
    oak_khqr_name: str = "OAK ORDER"
    # For banks whose customers share the bank's Bakong ID (ABA:
    # abaakhppxxx@abaa): the account number and the bank's name, as in the
    # bank app's own KHQR (e.g. 501378897 and "ABA Bank").
    oak_khqr_account_info: str = ""
    oak_khqr_bank: str = ""
    oak_bank_name: str = ""
    oak_bank_account_name: str = ""
    oak_bank_account_number: str = ""
    # Any long random string: cron-job.org sends it on the daily run (POST
    # /api/v1/billing/run: payment reminders) and the hourly one (POST
    # /api/v1/reminders/run: customers' unpaid orders). Empty turns both off.
    billing_cron_secret: str = ""
    # The founder's own login phone numbers, comma-separated: they get the
    # admin page (every shop's plan) and "I've paid" alerts on Telegram.
    admin_phones: str = ""
    # Riel to the dollar, for a shop that switches currency: its prices,
    # fees and discounts are converted at this rate (founder's test list
    # #15, 2026-10-24: 4,100 for now, set by hand until the admin page
    # holds it).
    khr_per_usd: int = Field(default=4100, ge=1000, le=10000)

    @property
    def facebook_configured(self) -> bool:
        return bool(self.facebook_app_id and self.facebook_app_secret)

    @property
    def tiktok_configured(self) -> bool:
        return bool(self.tiktok_client_key and self.tiktok_client_secret)

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
