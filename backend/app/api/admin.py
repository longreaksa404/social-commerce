"""The founder's admin page (founder's pick 2B, 2026-10-14): every shop
at once, so unscoped, and only for an admin account (the Admin guard)."""

import uuid
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Query, Response, status

from app.api.deps import Admin, AdminPasswordAgain, UnscopedDb
from app.core import clock
from app.models import LoginProvider
from app.schemas.admin import (
    AdminActingOut,
    AdminCloseIn,
    AdminCustomerOut,
    AdminErasedOut,
    AdminEraseIn,
    AdminForgetIn,
    AdminForgetOut,
    AdminHideIn,
    AdminJobRunOut,
    AdminLogOut,
    AdminNewPasswordOut,
    AdminOpenIn,
    AdminOrderOut,
    AdminPhoneIn,
    AdminProductOut,
    AdminReopenIn,
    AdminSellerOut,
    AdminSettingsIn,
    AdminSettingsOut,
    AdminSystemOut,
    AdminTestShopIn,
    AdminTestShopOut,
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
from app.services import (
    admin_find,
    admin_log,
    admin_money,
    admin_people,
    admin_settings,
    admin_system,
    admin_tools,
    as_seller,
    jobs,
)
from app.services.images import delete_file, delete_store_files
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


@router.post("/shops/{store_id}/open-as-seller", response_model=AdminActingOut)
async def open_as_seller(
    store_id: uuid.UUID,
    data: AdminOpenIn,
    admin: AdminPasswordAgain,
    db: UnscopedDb,
    background: BackgroundTasks,
) -> AdminActingOut:
    """D1A: the shop's whole seller app as its owner for 30 minutes, with
    why; logged, the shop's Telegram and the admins told. 409 SHOP_CLOSED;
    403 PASSWORD_AGAIN."""
    acting = await as_seller.open_as_seller(db, admin.admin_id, store_id, data.reason)
    background.add_task(as_seller.tell_shop, store_id)
    background.add_task(
        admin_service.tell_admins,
        f"🔐 Oak Order admin: opened {escape(acting.shop)} as seller. {escape(data.reason)}",
    )
    return acting


@router.delete("/shops/{store_id}", response_model=AdminErasedOut)
async def erase_shop(
    store_id: uuid.UUID,
    data: AdminEraseIn,
    admin: Admin,
    db: UnscopedDb,
    background: BackgroundTasks,
) -> AdminErasedOut:
    """D4B: a closed shop and everything in it, for good, after its link
    name and the admin's password (every time); its photos go after the
    response. 409 SHOP_NOT_CLOSED; 422 SLUG_MISMATCH, WRONG_PASSWORD."""
    store = await admin_tools.erase(db, admin.admin_id, store_id, data.slug, data.password)
    background.add_task(delete_store_files, store_id)
    background.add_task(
        admin_service.tell_admins, f"🔐 Oak Order admin: erased {escape(store.name)}."
    )
    return AdminErasedOut(shop=store.name)


@router.post("/test-shop", response_model=AdminTestShopOut, status_code=status.HTTP_201_CREATED)
async def test_shop(data: AdminTestShopIn, admin: Admin, db: UnscopedDb) -> AdminTestShopOut:
    """Part 29: a shop to try things on, open at once, with an email login
    and its password shown once; logged."""
    made = await admin_tools.test_shop(db, admin.admin_id, data.name)
    return AdminTestShopOut(
        store_id=made.store.id,
        shop=made.store.name,
        slug=made.store.slug,
        login=made.email,
        password=made.password,
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


Search = Annotated[str, Query(min_length=1, max_length=100)]


@router.get("/orders", response_model=list[AdminOrderOut])
async def find_orders(q: Search, _: Admin, db: UnscopedDb) -> list[AdminOrderOut]:
    """Part 19: "sokha 1043", "1043" or the customer's phone; look only."""
    return await admin_find.find_orders(db, q)


@router.get("/customers", response_model=list[AdminCustomerOut])
async def find_customers(q: Search, _: Admin, db: UnscopedDb) -> list[AdminCustomerOut]:
    """Part 20: a phone (typed any way) or a name, in every shop."""
    return await admin_find.find_customers(db, q)


@router.post("/customers/forget", response_model=AdminForgetOut)
async def forget_customer(
    data: AdminForgetIn, admin: Admin, db: UnscopedDb, background: BackgroundTasks
) -> AdminForgetOut:
    """Part 21: a customer's details removed from one shop or every shop;
    REMOVE typed and the admin's password every time. 422 WRONG_PASSWORD,
    INVALID_PHONE; 404 CUSTOMER_NOT_FOUND."""
    done, photos = await admin_find.forget_customer(db, admin.admin_id, data)
    for photo in photos:
        background.add_task(delete_file, photo)
    shops = "1 shop" if done.shops == 1 else f"{done.shops} shops"
    background.add_task(
        admin_service.tell_admins, f"🔐 Oak Order admin: a customer's details removed from {shops}."
    )
    return done


@router.get("/products", response_model=list[AdminProductOut])
async def products(
    _: Admin,
    db: UnscopedDb,
    q: Annotated[str | None, Query(max_length=100)] = None,
    before: datetime | None = None,
) -> list[AdminProductOut]:
    """Part 22: the newest products of every shop, 40 at a time."""
    return await admin_find.products(db, q, before)


@router.post("/products/{product_id}/hide", response_model=AdminProductOut)
async def hide_product(
    product_id: uuid.UUID, data: AdminHideIn, admin: Admin, db: UnscopedDb
) -> AdminProductOut:
    """Part 22: hidden from its shop; the seller can show it again. 409
    PRODUCT_ALREADY_HIDDEN."""
    return await admin_find.hide_product(db, admin.admin_id, product_id, data.reason)


@router.get("/settings", response_model=AdminSettingsOut)
async def settings(_: Admin, db: UnscopedDb) -> AdminSettingsOut:
    """Part 23 and D2B: the riel rate, the prices and the trial length."""
    return await admin_settings.get(db)


@router.put("/settings", response_model=AdminSettingsOut)
async def save_settings(
    data: AdminSettingsIn, admin: AdminPasswordAgain, db: UnscopedDb, background: BackgroundTasks
) -> AdminSettingsOut:
    """One Save (pick 11A): what changed is logged and the admins get a
    Telegram line. A new price applies from each shop's next payment, a
    new trial to shops opened from now. 403 PASSWORD_AGAIN."""
    page, changes = await admin_settings.save(db, admin.admin_id, data)
    if changes:
        background.add_task(
            admin_service.tell_admins,
            f"🔐 Oak Order admin: settings saved: {admin_settings.changes_text(changes)}.",
        )
    return page


@router.get("/system", response_model=AdminSystemOut)
async def system(_: Admin, db: UnscopedDb) -> AdminSystemOut:
    """Parts 24 to 27 (pick 12B): speed and errors, the jobs, the bot, the
    database, the services, the version."""
    return await admin_system.system(db)


@router.post("/jobs/{name}/run", response_model=AdminJobRunOut)
async def run_job(
    name: Literal["billing", "reminders"], admin: Admin, db: UnscopedDb
) -> AdminJobRunOut:
    """Part 25: Run now, as cron-job.org would; logged."""
    sent = await jobs.run(name)
    admin_log.record(db, admin.admin_id, "run_job", job=name, sent=sent)
    await db.commit()
    return AdminJobRunOut(sent=sent)


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
