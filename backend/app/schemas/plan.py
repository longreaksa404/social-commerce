import enum
import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models import PlanPeriod


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
    paid_on: date
    covers_from: date
    covers_until: date


class PlanPricesOut(BaseModel):
    """Oak Order Standard, in US dollars."""

    month: Decimal
    year: Decimal


class PlanOut(BaseModel):
    stage: PlanStage
    # No payment yet: the free trial (or only its end, once it has run out).
    on_trial: bool
    paid_until: date  # the last day covered, Phnom Penh
    pay_by: date  # the last day to pay before new orders stop
    days_left: int  # covered days left, today included; 0 once it has run out
    prices: PlanPricesOut
    payments: list[PlanPaymentOut]  # newest first
