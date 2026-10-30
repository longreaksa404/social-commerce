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
    """How it reached Oak Order (01_PRODUCT.md §33.1). By hand until Oak
    Solutions qualifies for ABA PayWay (its checkout and auto-charge are
    parked on the payway branch, 2026-10-14)."""

    # KHQR or a bank transfer to Oak's account, confirmed by the founder.
    MANUAL = "manual"


class PlanPaymentStatus(enum.StrEnum):
    # The seller tapped "I've paid": waiting for the founder to find it.
    PENDING = "pending"
    PAID = "paid"
    # The founder didn't find it (the note says why).
    FAILED = "failed"
    # "Undone" (admin panel, 2026-10-28): marked paid by mistake. Kept with
    # its dates, left out of the totals and the seller's list; the shop's
    # paid-until date went back (services/admin_money.py).
    VOID = "void"


class PlanPayment(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    """One payment a shop made, or says it made, to Oak Order for its
    plan, in US dollars. Once paid it moves store.paid_until to
    covers_until; the days it covers are set then (they depend on the day
    it's paid).

    Sellers only read these (Settings → Plan): app_user has SELECT and
    nothing else on the table. Billing writes the seller's "I've paid" on
    its own session (app/services/billing.py), and only the founder marks
    one paid (the admin page, `python -m app.admin paid`).
    """

    __tablename__ = "plan_payment"
    __mapper_args__ = {"eager_defaults": True}
    __table_args__ = (
        CheckConstraint("amount >= 0", name="amount_not_negative"),
        CheckConstraint("covers_from <= covers_until", name="covers_in_order"),
        CheckConstraint(
            "(status IN ('paid', 'void')) = (paid_on IS NOT NULL AND covers_from IS NOT NULL"
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
    # Why it failed: the founder's words to the seller ("Not in my account");
    # once undone, why (the founder's own words, not shown to the seller).
    failure: Mapped[str | None] = mapped_column(Text)
    # The founder's note, e.g. "ABA transfer, ref 4821".
    reference: Mapped[str | None] = mapped_column(Text)
    paid_on: Mapped[date | None] = mapped_column(Date)  # Phnom Penh
    # The days it pays for, both included.
    covers_from: Mapped[date | None] = mapped_column(Date)
    covers_until: Mapped[date | None] = mapped_column(Date)
