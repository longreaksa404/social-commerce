from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Local dev keeps one .env at the repo root; in production the values come
# from real environment variables and the file simply doesn't exist.
ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    environment: str = "development"
    database_url: str
    cors_origins: list[str] = []


@lru_cache
def get_settings() -> Settings:
    return Settings()
