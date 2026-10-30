"""The founder's admin page (founder's pick 2B, 2026-10-14): every shop
at once, so unscoped, and only for an admin account (the Admin guard)."""

import uuid
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Query, Response

from app.api.deps import Admin, AdminPasswordAgain, UnscopedDb
from app.core import clock
from app.models import LoginProvider
from app.schemas.admin import (
    AdminCloseIn,
    AdminLogOut,
    AdminNewPasswordOut,
    AdminPhoneIn,
    AdminReopenIn,
    AdminSellerOut,
)
from app.schemas.plan import (
    AdminConfirmIn,
    AdminOverviewOut,
    AdminPaidUntilIn,
    AdminPaymentIn,
    AdminPaymentsOut,
    AdminRejectIn,
    AdminShopDetailOut,
    AdminShopOut,
    AdminUndoIn,
)
from app.services import admin as admin_service
from app.services import admin_log, admin_money, admin_people
from app.services.telegram import escape

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview", response_model=AdminOverviewOut)
async def overview(_: Admin, db: UnscopedDb) -> AdminOverviewOut:
    """Home: the numbers across every shop, then what needs the admin."""
    return await admin_service.overview(db)


@router.get("/shops", response_model=list[AdminShopOut])
async def list_shops(_: Admin, db: UnscopedDb) -> list[AdminShopOut]:
    return await admin_service.list_shops(db)


@router.get("/shops/{store_id}", response_model=AdminShopDetailOut)
async def shop_detail(store_id: uuid.UUID, _: Admin, db: UnscopedDb) -> AdminShopDetailOut:
    return await admin_service.shop_detail(db, store_id)


@router.post("/shops/{store_id}/payments", response_model=AdminShopDetailOut)
async def mark_paid(
    store_id: uuid.UUID, data: AdminPaymentIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """A payment made by hand (or free time: amount 0)."""
    return await admin_service.mark_paid(db, admin.admin_id, store_id, data)


@router.post("/shops/{store_id}/payments/{payment_id}/confirm", response_model=AdminShopDetailOut)
async def confirm(
    store_id: uuid.UUID, payment_id: uuid.UUID, data: AdminConfirmIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """The seller's "I've paid", found in the bank."""
    return await admin_service.confirm(db, admin.admin_id, store_id, payment_id, data)


@router.post("/shops/{store_id}/payments/{payment_id}/reject", response_model=AdminShopDetailOut)
async def reject(
    store_id: uuid.UUID, payment_id: uuid.UUID, data: AdminRejectIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """Not found: the seller sees the note."""
    return await admin_service.reject(db, admin.admin_id, store_id, payment_id, data)


@router.put("/shops/{store_id}/paid-until", response_model=AdminShopDetailOut)
async def set_paid_until(
    store_id: uuid.UUID, data: AdminPaidUntilIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """Part 15: a longer trial or a few free days, with why. 409
    SHOP_IN_SETUP; 422 SAME_DATE, DATE_OUT_OF_RANGE."""
    return await admin_money.set_paid_until(
        db, admin.admin_id, store_id, data.paid_until, data.reason
    )


@router.post("/shops/{store_id}/payments/{payment_id}/undo", response_model=AdminShopDetailOut)
async def undo_payment(
    store_id: uuid.UUID, payment_id: uuid.UUID, data: AdminUndoIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """Part 16: the shop's latest paid payment becomes Undone and its time
    comes off. 409 PAYMENT_NOT_PAID, NOT_LATEST_PAYMENT."""
    return await admin_money.undo_payment(db, admin.admin_id, store_id, payment_id, data.reason)


@router.post("/shops/{store_id}/remind", response_model=AdminShopDetailOut)
async def remind(store_id: uuid.UUID, admin: Admin, db: UnscopedDb) -> AdminShopDetailOut:
    """Part 18: the plan reminder on the owner's Telegram now; the log line
    says whether it reached them. 409 SHOP_CLOSED, NO_TELEGRAM,
    NOTHING_DUE; 503 TELEGRAM_NOT_SET_UP."""
    return await admin_money.remind(db, admin.admin_id, store_id)


Year = Annotated[int | None, Query(ge=2024, le=2100)]
Month = Annotated[int | None, Query(ge=1, le=12)]


def _when(year: int | None, month: int | None) -> tuple[int, int | None]:
    """This month by default; `year` alone is the whole year."""
    if year is None:
        today = clock.today()
        return today.year, month or today.month
    return year, month


@router.get("/payments", response_model=AdminPaymentsOut)
async def payments(
    _: Admin, db: UnscopedDb, year: Year = None, month: Month = None
) -> AdminPaymentsOut:
    """Part 17: every "I've paid" waiting, then a month's (or with `year`
    alone, a year's) payments, with what was collected in it and its year."""
    return await admin_money.payments(db, *_when(year, month))


XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/payments/export", response_class=Response, responses={200: {"content": {XLSX: {}}}})
async def export_payments(
    _: Admin, db: UnscopedDb, year: Year = None, month: Month = None
) -> Response:
    """The same payments as an Excel file, for the founder's accounts."""
    year, month = _when(year, month)
    data = await admin_money.payments(db, year, month)
    name = f"oak-payments-{year}" + (f"-{month:02d}" if month else "")
    return Response(
        admin_money.workbook(data),
        media_type=XLSX,
        headers={"Content-Disposition": f'attachment; filename="{name}.xlsx"'},
    )


@router.post("/shops/{store_id}/close", response_model=AdminShopDetailOut)
async def close_shop(
    store_id: uuid.UUID, data: AdminCloseIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """The link stops and every login of the shop is logged out; nothing
    is erased. 409 SHOP_ALREADY_CLOSED."""
    return await admin_service.set_open(db, admin.admin_id, store_id, data, is_open=False)


@router.post("/shops/{store_id}/reopen", response_model=AdminShopDetailOut)
async def reopen_shop(
    store_id: uuid.UUID, data: AdminReopenIn, admin: Admin, db: UnscopedDb
) -> AdminShopDetailOut:
    """The link and the logins work again. 409 SHOP_ALREADY_OPEN."""
    return await admin_service.set_open(db, admin.admin_id, store_id, data, is_open=True)


@router.get("/log", response_model=list[AdminLogOut])
async def log(
    _: Admin,
    db: UnscopedDb,
    store_id: uuid.UUID | None = None,
    before: datetime | None = None,
) -> list[AdminLogOut]:
    """Everything done from the admin, newest first, 100 at a time (older:
    `before` = the last one's created_at); one shop's with `store_id`."""
    return await admin_log.entries(db, store_id=store_id, before=before)


@router.get("/sellers", response_model=list[AdminSellerOut])
async def people(_: Admin, db: UnscopedDb) -> list[AdminSellerOut]:
    """Everyone who logs in (part 8): owners and staff of every shop."""
    return await admin_people.list_people(db)


@router.get("/sellers/{seller_id}", response_model=AdminSellerOut)
async def person(seller_id: uuid.UUID, _: Admin, db: UnscopedDb) -> AdminSellerOut:
    return await admin_people.person(db, seller_id)


def _who(person: AdminSellerOut) -> str:
    return f"{escape(person.name)} ({escape(person.shop)})"


@router.post("/sellers/{seller_id}/password", response_model=AdminNewPasswordOut)
async def new_password(
    seller_id: uuid.UUID, admin: AdminPasswordAgain, db: UnscopedDb, background: BackgroundTasks
) -> AdminNewPasswordOut:
    """Part 9: a new password, shown once; every phone on the login logged
    out. 403 PASSWORD_AGAIN without the admin's password in 10 minutes."""
    password = await admin_people.new_password(db, admin.admin_id, seller_id)
    who = _who(await admin_people.person(db, seller_id))
    background.add_task(admin_service.tell_admins, f"🔐 Oak Order admin: new password for {who}.")
    return AdminNewPasswordOut(password=password)


@router.post("/sellers/{seller_id}/logout", response_model=AdminSellerOut)
async def logout_all(seller_id: uuid.UUID, admin: Admin, db: UnscopedDb) -> AdminSellerOut:
    """Part 10: every phone on the login logged out."""
    return await admin_people.logout_all(db, admin.admin_id, seller_id)


@router.post("/sellers/{seller_id}/phone", response_model=AdminSellerOut)
async def change_phone(
    seller_id: uuid.UUID,
    data: AdminPhoneIn,
    admin: AdminPasswordAgain,
    db: UnscopedDb,
    background: BackgroundTasks,
) -> AdminSellerOut:
    """Part 11: a new login number. 409 PHONE_TAKEN, 422 INVALID_PHONE or
    SAME_PHONE; 403 PASSWORD_AGAIN."""
    person = await admin_people.change_phone(db, admin.admin_id, seller_id, data.phone)
    background.add_task(
        admin_service.tell_admins,
        f"🔐 Oak Order admin: new login phone for {_who(person)}: {person.phone}.",
    )
    return person


@router.delete("/sellers/{seller_id}/logins/{provider}", response_model=AdminSellerOut)
async def remove_login(
    seller_id: uuid.UUID,
    provider: Literal["google", "facebook"],
    admin: AdminPasswordAgain,
    db: UnscopedDb,
    background: BackgroundTasks,
) -> AdminSellerOut:
    """Part 12: a Google or Facebook login taken off; the phone login
    stays. 409 LAST_WAY_IN when it's their only way in; 403
    PASSWORD_AGAIN."""
    person = await admin_people.remove_login(db, admin.admin_id, seller_id, LoginProvider(provider))
    background.add_task(
        admin_service.tell_admins,
        f"🔐 Oak Order admin: {provider.title()} login removed from {_who(person)}.",
    )
    return person
