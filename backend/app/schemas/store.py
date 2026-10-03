import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.core.config import get_settings
from app.models.account import Currency, OrderConfirmationMode
from app.schemas.common import Description, Name, Slug
from app.schemas.delivery import DeliverySettings, DiscountSettings
from app.schemas.payment import PaymentSettings


class StoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    currency: Currency
    # automatic: new orders are accepted at once; manual: they wait as pending.
    order_confirmation_mode: OrderConfirmationMode
    payment_settings: PaymentSettings = Field(validation_alias="payment_config")
    delivery_settings: DeliverySettings = Field(validation_alias="delivery_config")
    discount_settings: DiscountSettings = Field(validation_alias="discount_config")
    # "Ask seller" on the shop opens a chat with this account; null hides it.
    telegram_username: str | None
    # Order alerts: is a chat connected (the chat id itself stays private).
    telegram_connected: bool = Field(validation_alias="telegram_chat_id")
    created_at: datetime

    @field_validator("telegram_connected", mode="before")
    @classmethod
    def _has_chat(cls, chat_id: str | None) -> bool:
        return chat_id is not None

    @computed_field
    @property
    def telegram_bot_available(self) -> bool:
        """False until the platform's bot is set up (env vars)."""
        return get_settings().telegram_configured


class TelegramLinkOut(BaseModel):
    """t.me/<bot>?start=<code>: opening it and tapping Start connects the chat."""

    url: str
    expires_at: datetime


# Telegram usernames: 5-32 letters, digits and underscores, starting with a
# letter (a few bought ones are 4).
_TELEGRAM_USERNAME = re.compile(r"[A-Za-z][A-Za-z0-9_]{3,31}")
_TELEGRAM_PREFIX = re.compile(r"^(?:https?://)?(?:www\.)?(?:t\.me/|telegram\.me/)|^@")


class StoreUpdate(BaseModel):
    name: Name | None = None
    slug: Slug | None = None
    description: Description | None = None
    currency: Currency | None = None
    order_confirmation_mode: OrderConfirmationMode | None = None
    # All of it at once: the settings screen sends the whole thing.
    payment_settings: PaymentSettings | None = None
    delivery_settings: DeliverySettings | None = None
    discount_settings: DiscountSettings | None = None
    # "@reaksa_shop", "reaksa_shop" or "t.me/reaksa_shop"; empty or null clears it.
    telegram_username: str | None = None

    @field_validator("telegram_username")
    @classmethod
    def _telegram_username(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = _TELEGRAM_PREFIX.sub("", value.strip()).strip("/")
        if not value:
            return None
        if not _TELEGRAM_USERNAME.fullmatch(value):
            raise ValueError(
                "Enter your Telegram username, e.g. @your_shop: letters, numbers and _."
            )
        return value
