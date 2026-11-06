"""The admin panel (01_PRODUCT.md §22.11) from Step 2 on: its log, people
and logins, closing a shop. Home, the shop list and a shop's page are in
schemas/plan.py, where they began."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AdminLogOut(BaseModel):
    """One line of the admin's log (part 28)."""

    id: uuid.UUID
    created_at: datetime
    action: str
    store_id: uuid.UUID | None
    shop: str | None  # its name now; as it was, once the shop is gone
    reason: str | None
    details: dict[str, Any]


class AdminCloseIn(BaseModel):
    """Close a shop (part 5): why, for the log."""

    model_config = ConfigDict(str_strip_whitespace=True)
    reason: str = Field(min_length=1, max_length=300)


class AdminReopenIn(BaseModel):
    reason: str | None = Field(default=None, max_length=300)


class AdminLoginOut(BaseModel):
    """A Google or Facebook account connected to a login."""

    provider: str
    label: str | None  # its email, or its name


class AdminSellerOut(BaseModel):
    """One login, an owner's or a helper's (parts 8 to 12)."""

    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None  # older accounts log in with it
    role: str  # owner, staff
    store_id: uuid.UUID
    shop: str
    code: str  # the shop's code: asked for before changing their phone
    is_open: bool  # false once its shop is closed
    has_password: bool
    logins: list[AdminLoginOut]
    last_seen: datetime | None  # the last time the app renewed its login
    devices: int = 0  # phones and browsers logged in now


class AdminPhoneIn(BaseModel):
    phone: str = Field(min_length=6, max_length=30)


class AdminOpenIn(BaseModel):
    """Open as seller (D1A): why, for the log."""

    model_config = ConfigDict(str_strip_whitespace=True)
    reason: str = Field(min_length=1, max_length=300)


class AdminActingOut(BaseModel):
    """The owner's access for 30 minutes, naming the admin; no refresh."""

    access_token: str
    expires_at: datetime
    store_id: uuid.UUID
    shop: str


class AdminNewPasswordOut(BaseModel):
    """Shown once, for the admin to send or read out."""

    password: str


class AdminOrderOut(BaseModel):
    """An order found from the admin (part 19): look only."""

    id: uuid.UUID
    store_id: uuid.UUID
    shop: str
    number: int
    created_at: datetime
    customer_name: str
    customer_phone: str
    items: list[str]  # "Clear case iPhone 15 (Black) × 1"
    currency: str
    delivery_fee: Decimal
    total: Decimal
    status: str  # the order's own
    payment_method: str
    payment_status: str
    delivery_method: str
    delivery_status: str
    seller: str  # the owner's name
    seller_phone: str | None


class AdminCustomerShopOut(BaseModel):
    store_id: uuid.UUID
    shop: str
    customer_id: uuid.UUID
    orders: int
    last_order_at: datetime | None
    telegram: bool  # gets updates on Telegram


class AdminCustomerOut(BaseModel):
    """One phone number in every shop it ordered from (part 20)."""

    phone: str
    name: str  # their newest name
    shops: list[AdminCustomerShopOut]


class AdminForgetIn(BaseModel):
    """Remove a customer's details (part 21): from one shop or every shop,
    with REMOVE typed and the admin's password, every time."""

    phone: str = Field(min_length=6, max_length=30)
    store_id: uuid.UUID | None = None  # None: every shop
    confirm: Literal["REMOVE"]
    password: str = Field(min_length=1, max_length=200)


class AdminForgetOut(BaseModel):
    shops: int
    orders: int


class AdminProductOut(BaseModel):
    """A product of any shop (part 22, pick 14A)."""

    id: uuid.UUID
    store_id: uuid.UUID
    shop: str
    name: str
    price: Decimal
    currency: str
    image_url: str | None
    status: str  # active, inactive (hidden)
    created_at: datetime


class AdminHideIn(BaseModel):
    reason: str | None = Field(default=None, max_length=300)


class AdminSettingsIn(BaseModel):
    """Oak Order's own settings (D2B, pick 11A): one Save for all."""

    khr_per_usd: int = Field(ge=1000, le=10000)
    month: Decimal = Field(gt=0, le=1000, decimal_places=2)
    year: Decimal = Field(gt=0, le=10000, decimal_places=2)
    trial_days: int = Field(ge=1, le=365)


class AdminSettingsOut(AdminSettingsIn):
    paying_shops: int  # who pays a new price from their next payment
    updated_at: datetime | None  # the last change


class PlanPricesPublicOut(BaseModel):
    """For the Terms' Fees (public): the prices and the trial today."""

    month: Decimal
    year: Decimal
    trial_days: int
    changed_on: date | None  # the day they last changed


class AdminSpeedOut(BaseModel):
    """Counted by the server in memory: since it started, at most an hour."""

    requests: int
    typical_ms: float | None
    slow_ms: float | None  # the slowest 1 in 20
    slow_route: str | None
    errors_hour: int
    errors_today: int
    started_at: datetime


class AdminJobOut(BaseModel):
    name: str  # billing, reminders
    title: str
    every: str  # daily, hourly
    last_at: datetime | None  # the last run that worked
    last_sent: int | None
    late: bool  # never ran, or not within its time
    failed_at: datetime | None = None  # the last run that failed
    error: str | None = None  # its kind of error, e.g. "TimeoutError"
    failing: bool = False  # the latest run failed


class AdminFailedSendOut(BaseModel):
    store_id: uuid.UUID
    shop: str
    event_type: str
    error: str
    sent_at: datetime


class AdminBotOut(BaseModel):
    set_up: bool
    working: bool  # no error from Telegram in the last hour
    problem: str | None = None
    waiting: int = 0  # updates Telegram hasn't delivered yet
    webhook: bool = False
    failed: int  # sends that failed in 24 hours
    recent: list[AdminFailedSendOut]
    # Changed words Telegram refused in 24 hours, sent in the code's
    # instead (counted by this server since it started).
    refused: int = 0


class AdminServiceOut(BaseModel):
    name: str
    set: bool


class AdminBackupOut(BaseModel):
    """The nightly database copy (docs/BACKUPS.md), as the GitHub workflow
    reports it after each night. Never reported: not known to work."""

    last_at: datetime | None  # the last copy saved
    file: str | None
    bytes: int | None
    failed_at: datetime | None
    late: bool  # no copy saved in the last 26 hours (or ever)
    failing: bool  # the latest night failed


class AdminServerHoursOut(BaseModel):
    """Render's free hours this month, as this server counts its own awake
    time (services/awake.py)."""

    used: float  # hours this month, counted from counted_from
    limit: int  # 750
    counted_from: datetime
    from_month_start: bool  # False: Render's own count is higher
    on_pace: int | None  # the month's hours at this rate; None for 2 days
    low: bool  # on pace for 93% or more, or 93% used
    over: bool  # 93% used


class AdminSystemOut(BaseModel):
    """The System page (parts 24 to 27, pick 12B)."""

    speed: AdminSpeedOut
    # None off Render or on a paid plan (RENDER_FREE_HOURS=0).
    server_hours: AdminServerHoursOut | None = None
    jobs: list[AdminJobOut]
    backup: AdminBackupOut
    bot: AdminBotOut
    database_bytes: int
    database_ms: float
    services: list[AdminServiceOut]
    version: str | None  # the live commit (Render's RENDER_GIT_COMMIT)


class AdminJobRunOut(BaseModel):
    sent: int


class AdminTestShopIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str | None = Field(default=None, max_length=80)


class AdminTestShopOut(BaseModel):
    """Part 29: the new shop and its login, the password shown once."""

    store_id: uuid.UUID
    shop: str
    slug: str
    login: str
    password: str


class AdminEraseIn(BaseModel):
    """D4B: the shop's link name typed, and the admin's password."""

    slug: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=200)


class AdminErasedOut(BaseModel):
    shop: str


class AdminBroadcastIn(BaseModel):
    """Part 30: a Telegram message, to the admin first (me), then to every
    open shop with Telegram, or those on trial, or those paying."""

    text: str = Field(min_length=1, max_length=1000)
    to: Literal["me", "all", "trial", "paying"]


class AdminBroadcastOut(BaseModel):
    sent: int
    failed: int


class AdminSignupOut(BaseModel):
    """Part 31: a number checked in Telegram that never made a shop."""

    phone: str
    telegram_name: str | None
    checked_at: datetime


# The Bot page (02_TECHNICAL.md §12.7; founder 2026-10-31)


class AdminBotTagOut(BaseModel):
    name: str
    label: str


class AdminBotMessageOut(BaseModel):
    key: str
    group: Literal["sellers", "customers", "you"]
    name: str
    about: str
    text: str  # in use now
    default: str  # the code's
    tags: list[AdminBotTagOut]
    words: list[str]  # the small words shown under it
    on: bool
    can_off: bool
    stays_on: str | None  # why it can't be turned off


class AdminBotWordOut(BaseModel):
    key: str
    label: str
    kind: Literal["text", "button", "note"]
    text: str
    default: str
    tags: list[AdminBotTagOut]
    used_in: list[str]  # the messages' names


class AdminBotWordsOut(BaseModel):
    messages: list[AdminBotMessageOut]
    words: list[AdminBotWordOut]
    updated_at: datetime | None


class AdminBotDraftIn(BaseModel):
    """A message's words as typed, not live yet: its text, the small words
    changed under it, and whether it's sent."""

    key: str
    text: str = Field(max_length=6000)
    words: dict[str, str] = Field(default_factory=dict, max_length=60)
    on: bool = True
    example: int = Field(default=0, ge=0, le=10)  # which one Send me a test sends


class AdminBotExampleOut(BaseModel):
    label: str
    html: str  # Telegram HTML: escaped text and <b>
    buttons: list[str]


class AdminBotPreviewOut(BaseModel):
    errors: list[str]  # Go live refuses these
    warnings: list[str]  # tags taken out
    examples: list[AdminBotExampleOut]


class AdminBotTestOut(BaseModel):
    sent: int
    failed: int
    error: str | None = None  # what Telegram said


class AdminBotProfileIn(BaseModel):
    """Telegram's limits: name 64, description 512, about 120."""

    name: str = Field(min_length=1, max_length=64)
    description: str = Field(max_length=512)
    short_description: str = Field(max_length=120)


class AdminBotProfileOut(AdminBotProfileIn):
    username: str


class AdminNoticeOut(BaseModel):
    """One notice on the admin's bell (services/admin_notices.py), made from
    the records each time; only `read` is kept apart from them."""

    key: str  # names its cause: "claim:<payment id>", "ending:<shop>:<date>"…
    kind: Literal[
        "claim",
        "stopped",
        "unpaid",
        "ending",
        "not_opened",
        "telegram",
        "job_failed",
        "job_late",
        "backup_failed",
        "backup_late",
        "errors",
        "server_hours",
    ]
    severity: Literal["action", "urgent", "warning", "info"]
    title: str
    text: str
    at: datetime | None  # when it started; None: not known (never ran)
    href: str  # the admin page to open
    read: bool = False


class AdminNoticesOut(BaseModel):
    items: list[AdminNoticeOut]  # newest first
    unread: int


class AdminNoticesReadIn(BaseModel):
    """Mark these read; `all` marks every notice of the moment."""

    keys: list[Annotated[str, Field(max_length=200)]] = Field(default=[], max_length=200)
    all: bool = False


class AdminMonthOut(BaseModel):
    """One Phnom Penh month on the Analytics page (services/admin_analytics.py)."""

    month: str  # "2026-11"
    signups: int  # shops made
    orders: int  # in every shop (counted, not money)
    active_shops: int  # shops with at least one order
    collected: Decimal  # Oak Order's plan payments, US dollars
    collected_month_plans: Decimal
    collected_year_plans: Decimal
    payments: int  # paid, more than $0
    paying: int  # on the month's last day: paid for a period not over yet
    monthly_value: Decimal  # what they pay a month (a year's / 12)


class AdminAnalyticsOut(BaseModel):
    through: date  # today in Phnom Penh: the last month runs to it
    months: list[AdminMonthOut]  # oldest first
    trial_over: int  # shops that paid, or whose free time ended
    converted: int  # of those, the ones that paid
    renewals_due: int  # paid periods ended in the range, days to pay over
    renewed: int
    paying_month: int  # today: shops on a month's plan
    paying_year: int
    monthly_value: Decimal  # today
    open_shops: int
    quiet_shops: int  # open, past setup, no order in 30 days
    test_shops: int  # left out of every number
