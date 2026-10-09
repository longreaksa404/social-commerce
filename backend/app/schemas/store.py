import re
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator
from pydantic_core import PydanticCustomError

from app.core.config import get_settings
from app.models.account import Currency, OrderConfirmationMode
from app.schemas.common import Description, Name, Slug
from app.schemas.delivery import DeliverySettings, DiscountSettings
from app.schemas.payment import PaymentSettings
from app.services.phone import normalize_phone


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
    # False until Settings → Payments is saved once (the setup checklist).
    payment_set_up: bool
    delivery_settings: DeliverySettings = Field(validation_alias="delivery_config")
    # False until Settings → Delivery is saved once (the dashboard reminds
    # the seller that delivery is free for customers until then).
    delivery_set_up: bool
    discount_settings: DiscountSettings = Field(validation_alias="discount_config")
    # "Ask seller" on the shop opens a chat with this account; null hides it.
    telegram_username: str | None
    # Call and Messenger buttons beside it (Settings → Contact); null hides each.
    contact_phone: str | None
    messenger_username: str | None
    # Not taking orders right now (Settings → Orders). Both read as off once
    # the day it reopens has come (Store.orders_paused_now).
    orders_paused: bool = Field(validation_alias="orders_paused_now")
    orders_resume_on: date | None = Field(validation_alias="orders_resume_on_now")
    # Alert (bell + Telegram) when an order leaves this many or fewer.
    low_stock_alert: int
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
# A Facebook page's username (5+ letters, numbers and dots) or its number,
# typed as is, as m.me/<it>, or as the page's facebook.com address.
_MESSENGER_USERNAME = re.compile(r"[A-Za-z0-9.]{5,50}")
_MESSENGER_PREFIX = re.compile(
    r"^(?:https?://)?(?:www\.|m\.|web\.)?(?:m\.me/|messenger\.com/t/|facebook\.com/|fb\.com/)|^@",
    re.IGNORECASE,
)
_FACEBOOK_PAGE_ID = re.compile(r"profile\.php\?id=(\d+)")


class StoreUpdate(BaseModel):
    name: Name | None = None
    slug: Slug | None = None
    description: Description | None = None
    currency: Currency | None = None
    order_confirmation_mode: OrderConfirmationMode | None = None
    orders_paused: bool | None = None
    # The first day orders open again (Phnom Penh); null: until the seller
    # turns them back on. Cleared when orders_paused is false.
    orders_resume_on: date | None = None
    low_stock_alert: int | None = Field(default=None, ge=1, le=999)
    # All of it at once: the settings screen sends the whole thing.
    payment_settings: PaymentSettings | None = None
    delivery_settings: DeliverySettings | None = None
    discount_settings: DiscountSettings | None = None
    # "@reaksa_shop", "reaksa_shop" or "t.me/reaksa_shop"; empty or null clears it.
    telegram_username: str | None = None
    # Typed any way ("012 345 678", "+855 12 345 678"); empty or null clears it.
    contact_phone: str | None = Field(default=None, max_length=32)
    # "sokhafashion", "m.me/sokhafashion" or the page's facebook.com link.
    messenger_username: str | None = Field(default=None, max_length=200)
    # A public_url from POST /seller/store/logo; null removes the logo.
    logo_url: str | None = Field(default=None, max_length=500)

    @field_validator("telegram_username")
    @classmethod
    def _telegram_username(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = _TELEGRAM_PREFIX.sub("", value.strip()).strip("/")
        if not value:
            return None
        if not _TELEGRAM_USERNAME.fullmatch(value):
            # A custom error type, so the message isn't prefixed "Value error, ".
            raise PydanticCustomError(
                "telegram_username",
                "Enter your Telegram username, e.g. @your_shop: letters, numbers and _.",
            )
        return value

    @field_validator("contact_phone")
    @classmethod
    def _contact_phone(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        try:
            return normalize_phone(value)
        except ValueError as exc:
            raise PydanticCustomError("phone", str(exc)) from exc

    @field_validator("messenger_username")
    @classmethod
    def _messenger_username(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip()
        if page_id := _FACEBOOK_PAGE_ID.search(value):
            return page_id.group(1)
        value = _MESSENGER_PREFIX.sub("", value).split("?")[0].strip("/")
        if not _MESSENGER_USERNAME.fullmatch(value):
            raise PydanticCustomError(
                "messenger_username",
                "Enter your Facebook page's username, e.g. sokhafashion, or its m.me link.",
            )
        return value
