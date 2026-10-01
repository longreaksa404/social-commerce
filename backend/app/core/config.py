from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
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
