"""The shop's numbers on the Orders tab (founder's picks 8B, 9B)."""

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

from app.models import Currency
from app.schemas.customer import AmountOut


class DayOut(BaseModel):
    date: date
    orders: int
    sales: Decimal  # in StatsOut.currency, the shop's current one


class StatsOut(BaseModel):
    period: Literal["today", "week", "month"]
    first: date  # the days counted, Phnom Penh, both included
    last: date
    currency: Currency  # the chart's
    orders: int  # placed, not rejected or cancelled
    sales: list[AmountOut]  # their totals, per currency (usually one)
    to_collect: list[AmountOut]  # their payments not paid yet
    # A bar per day: the last 7 days for today and the week, this month's
    # days so far for the month.
    days: list[DayOut]
