import enum
from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, Index, Text
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
    """How it reached Oak Order (01_PRODUCT.md §33.1)."""

    # Paid to the founder by hand, recorded with `python -m app.admin paid`
    # or the admin page.
    MANUAL = "manual"
    # Pay now: PayWay's checkout.
    PAYWAY = "payway"
    # Pay now that also saves the seller's ABA account or card for a
    # monthly auto-charge (PayWay subscription, CITR_FIX).
    PAYWAY_SUBSCRIBE = "payway_subscribe"
    # An auto-charge of the saved token on the shop's start day (MITR_FIX).
    PAYWAY_AUTO = "payway_auto"


class PlanPaymentStatus(enum.StrEnum):
    # Waiting for PayWay to say (a checkout not paid yet, a charge in progress).
    PENDING = "pending"
    PAID = "paid"
    # Declined, or a checkout left unpaid.
    FAILED = "failed"


class PlanPayment(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    """One payment a shop made, or tried to make, to Oak Order for its
    plan, in US dollars. Once paid it moves store.paid_until to
    covers_until; the days it covers are set then (they depend on the day
    it's paid).

    Sellers only read these (Settings → Plan): app_user has SELECT and
    nothing else on the table. Billing writes them on its own session,
    and marks one paid only on PayWay's word or the founder's
    (app/services/billing.py).
    """

    __tablename__ = "plan_payment"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (
        CheckConstraint("amount >= 0", name="amount_not_negative"),
        CheckConstraint("covers_from <= covers_until", name="covers_in_order"),
        CheckConstraint(
            "(status = 'paid') = (paid_on IS NOT NULL AND covers_from IS NOT NULL"
            " AND covers_until IS NOT NULL)",
            name="paid_has_dates",
        ),
        Index("ix_plan_payment_store_id_created_at", "store_id", "created_at"),
    )

    period: Mapped[PlanPeriod] = mapped_column(str_enum(PlanPeriod, "period"))
    amount: Mapped[Decimal] = mapped_column(Money)  # USD
    method: Mapped[PlanPaymentMethod] = mapped_column(str_enum(PlanPaymentMethod, "method"))
    status: Mapped[PlanPaymentStatus] = mapped_column(
        str_enum(PlanPaymentStatus, "status"),
        default=PlanPaymentStatus.PAID,
        server_default="paid",
    )
    # PayWay's transaction: our tran_id, unique.
    tran_id: Mapped[str | None] = mapped_column(Text, unique=True)
    # Why it failed, in PayWay's words ("Payment was declined").
    failure: Mapped[str | None] = mapped_column(Text)
    # The founder's note, e.g. "ABA transfer, ref 4821".
    reference: Mapped[str | None] = mapped_column(Text)
    paid_on: Mapped[date | None] = mapped_column(Date)  # Phnom Penh
    # The days it pays for, both included.
    covers_from: Mapped[date | None] = mapped_column(Date)
    covers_until: Mapped[date | None] = mapped_column(Date)
