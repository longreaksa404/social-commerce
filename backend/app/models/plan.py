import enum
from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAtMixin, TenantMixin, UUIDPrimaryKeyMixin
from app.models.account import str_enum
from app.models.catalog import Money


class PlanPeriod(enum.StrEnum):
    """What a payment pays for: Standard is $9.99 a month or $99 a year
    (01_PRODUCT.md §33.1; prices in app/services/plan.py)."""

    MONTH = "month"
    YEAR = "year"


class PlanPaymentMethod(enum.StrEnum):
    """How it reached Oak Order. By hand for now: the seller pays the
    founder, who records it (`python -m app.admin paid`). Paying in the app
    through a payment gateway comes later (founder's pick 4B, 2026-10-14)."""

    MANUAL = "manual"


class PlanPayment(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    """One payment a shop made to Oak Order for its plan, in US dollars.
    Recording it moves store.paid_until to covers_until.

    Sellers only read these (Settings → Plan): app_user has SELECT and
    nothing else on the table, so no seller request can add one.
    """

    __tablename__ = "plan_payment"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (
        CheckConstraint("amount >= 0", name="amount_not_negative"),
        CheckConstraint("covers_from <= covers_until", name="covers_in_order"),
    )

    period: Mapped[PlanPeriod] = mapped_column(str_enum(PlanPeriod, "period"))
    amount: Mapped[Decimal] = mapped_column(Money)  # USD
    method: Mapped[PlanPaymentMethod] = mapped_column(str_enum(PlanPaymentMethod, "method"))
    # The founder's note, e.g. "ABA transfer, ref 4821".
    reference: Mapped[str | None] = mapped_column(Text)
    paid_on: Mapped[date] = mapped_column(Date)  # Phnom Penh
    # The days it pays for, both included.
    covers_from: Mapped[date] = mapped_column(Date)
    covers_until: Mapped[date] = mapped_column(Date)
