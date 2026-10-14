import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic_core import PydanticCustomError

from app.models import PlanPaymentMethod, PlanPaymentStatus, PlanPeriod


class PlanStage(enum.StrEnum):
    """Where the shop is with its paid-until date (app/services/plan.py)."""

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
    status: PlanPaymentStatus
    # Why it failed, in PayWay's words.
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


class AutoChargeOut(BaseModel):
    """The monthly auto-charge, while it's on."""

    label: str  # the saved ABA account or card: "ABA ···5312"
    amount: Decimal  # USD, each month
    # The next try: the shop's start day, then daily for the 7 days to pay;
    # none once orders have stopped (paying now starts it again).
    next_charge: date | None


class PlanOut(BaseModel):
    stage: PlanStage
    # No payment yet: the free trial (or only its end, once it has run out).
    on_trial: bool
    paid_until: date  # the last day covered, Phnom Penh
    pay_by: date  # the last day to pay before new orders stop
    days_left: int  # covered days left, today included; 0 once it has run out
    prices: PlanPricesOut
    # Pay now and auto-charge through PayWay are set up (else: message Oak Order).
    payway: bool
    auto_charge: AutoChargeOut | None
    # An auto-charge failed since the paid time ran out (it's tried daily).
    charge_failed: bool
    # Paid ones, and auto-charges that failed; newest first.
    payments: list[PlanPaymentOut]


class CheckoutIn(BaseModel):
    period: PlanPeriod
    # Also save an ABA account ("aba") or a card ("card") and charge it each
    # month: the monthly plan only (PayWay's subscriptions don't do years).
    auto_charge: Literal["aba", "card"] | None = None

    @model_validator(mode="after")
    def _monthly_only(self) -> "CheckoutIn":
        if self.auto_charge and self.period is not PlanPeriod.MONTH:
            raise PydanticCustomError("auto_charge", "Auto-charge is for the monthly plan.")
        return self


class CheckoutOut(BaseModel):
    """The form the browser posts to PayWay (its checkout page answers)."""

    payment_id: uuid.UUID
    action: str
    fields: dict[str, str]


class AdminPaymentIn(BaseModel):
    """The founder marks a payment made by hand (or gives free time: 0)."""

    period: PlanPeriod
    # US dollars; empty means the price.
    amount: Decimal | None = Field(default=None, ge=0, le=10_000, decimal_places=2)
    note: str | None = Field(default=None, max_length=200)


class AdminShopOut(BaseModel):
    """One row of the founder's admin page."""

    id: uuid.UUID
    name: str
    slug: str
    login: str  # the owner's phone number (older accounts: email)
    is_open: bool  # false once closed (Settings → Close shop)
    created_at: datetime
    stage: PlanStage
    on_trial: bool
    paid_until: date
    pay_by: date
    auto_charge: str | None  # the saved account or card, while auto-charge is on
    next_charge: date | None
    last_paid_on: date | None
    last_failure: str | None  # the latest auto-charge failure since the paid time ran out


class AdminPaymentOut(PlanPaymentOut):
    reference: str | None  # the founder's note
    tran_id: str | None  # PayWay's transaction (ours)


class AdminShopDetailOut(AdminShopOut):
    payments: list[AdminPaymentOut]  # every one, newest first
