import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models import PlanPaymentMethod, PlanPaymentStatus, PlanPeriod


class PlanStage(enum.StrEnum):
    """Where the shop is with its paid-until date (app/services/plan.py)."""

    SETUP = "setup"  # not opened yet: no orders, the trial hasn't started
    ACTIVE = "active"
    ENDING_SOON = "ending_soon"  # its last 6 days: the dashboard reminds the seller
    OVERDUE = "overdue"  # ran out up to 7 days ago: still takes orders, pay now
    STOPPED = "stopped"  # no new orders until paid


class PlanPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    period: PlanPeriod
    amount: Decimal  # USD
    method: PlanPaymentMethod
    # pending: the seller said "I've paid"; failed: Oak Order didn't find it.
    status: PlanPaymentStatus
    # Oak Order's note when it didn't find it.
    failure: str | None
    created_at: datetime
    # Set once paid.
    paid_on: date | None
    covers_from: date | None
    covers_until: date | None


class PlanPricesOut(BaseModel):
    """Oak Order Standard, in US dollars."""

    month: Decimal
    year: Decimal


class BankOut(BaseModel):
    bank_name: str
    account_name: str
    account_number: str


class PayToOut(BaseModel):
    """How to pay Oak Order by hand (OAK_* settings): KHQR codes for a month
    and a year, with the shop's code as their bill number, and/or a bank
    account. Both empty: message Oak Order."""

    khqr_month: str | None
    khqr_year: str | None
    khqr_name: str | None  # the name the bank app shows
    bank: BankOut | None


class PlanOut(BaseModel):
    stage: PlanStage
    # No payment yet: the free trial (or only its end, once it has run out).
    on_trial: bool
    # The three below are null in setup.
    paid_until: date | None  # the last day covered, Phnom Penh
    pay_by: date | None  # the last day to pay before new orders stop
    days_left: int | None  # covered days left, today included; 0 once it has run out
    # In setup: the trial's last day if the shop opens today (the pop-up).
    trial_until: date | None
    prices: PlanPricesOut
    # The shop's code ("OAK-K7Q2MX"): in the transfer's note, so Oak Order
    # can tell whose money it is; the KHQR's bill number.
    code: str
    pay_to: PayToOut
    # The seller's "I've paid" Oak Order hasn't checked yet.
    claim: PlanPaymentOut | None
    # Paid ones, and ones Oak Order didn't find; newest first.
    payments: list[PlanPaymentOut]


class PaidClaimIn(BaseModel):
    """ "I've paid": what for."""

    period: PlanPeriod


class AdminPaymentIn(BaseModel):
    """The founder marks a payment paid (or gives free time: 0)."""

    period: PlanPeriod
    # US dollars; empty means the price.
    amount: Decimal | None = Field(default=None, ge=0, le=10_000, decimal_places=2)
    note: str | None = Field(default=None, max_length=200)


class AdminConfirmIn(BaseModel):
    """Confirming a seller's "I've paid": the amount found, if not theirs."""

    amount: Decimal | None = Field(default=None, ge=0, le=10_000, decimal_places=2)
    note: str | None = Field(default=None, max_length=200)


class AdminRejectIn(BaseModel):
    """Not found: the seller sees the note."""

    note: str = Field(min_length=1, max_length=200)


class AdminShopOut(BaseModel):
    """One row of the founder's admin page."""

    id: uuid.UUID
    name: str
    slug: str
    code: str
    login: str  # the owner's phone number (older accounts: email)
    is_open: bool  # false once closed (Settings → Close shop)
    telegram: bool  # gets reminders on Telegram
    created_at: datetime
    stage: PlanStage
    on_trial: bool
    paid_until: date | None  # null in setup
    pay_by: date | None
    last_paid_on: date | None
    claim: PlanPaymentOut | None  # an "I've paid" waiting for the founder


class AdminPaymentOut(PlanPaymentOut):
    reference: str | None  # the founder's note


class AdminShopDetailOut(AdminShopOut):
    payments: list[AdminPaymentOut]  # every one, newest first
