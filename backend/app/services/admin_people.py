"""Everyone who logs in, for the admin (01_PRODUCT.md §22.11, parts 8 to
12; founder's pick 8A, 2026-10-28): owners and staff of every shop, and
the help a seller asks for on a call: a new password, every phone logged
out, a new login phone, a Google or Facebook login taken off.

Each is logged (services/admin_log.py) in its own transaction. A new
password, a new phone and a login removed need the admin's password typed
again (the AdminPasswordAgain guard) and send the admin a Telegram line
(admin.tell_admins).
"""

import secrets
import uuid

from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.errors import AppError, NotFound
from app.models import LoginProvider, RefreshToken, Seller, SellerLogin, SellerRole, Store
from app.schemas.admin import AdminLoginOut, AdminSellerOut
from app.services import admin_log
from app.services import plan as plan_service
from app.services.phone import normalize_phone
from app.services.social import RETIRED

# No 0/o, 1/l/i: read out over the phone or typed from a Telegram message.
_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


def temporary_password() -> str:
    """Like "k7mx-9qp4-hd2a": 12 random characters in groups of four."""
    chars = "".join(secrets.choice(_ALPHABET) for _ in range(12))
    return "-".join(chars[i : i + 4] for i in range(0, 12, 4))


def _shop_of():
    """An owner's shop is the one they own; a helper's, the one they're in."""
    return or_(Store.seller_id == Seller.id, Store.id == Seller.store_id)


async def _people(db: AsyncSession, seller_id: uuid.UUID | None = None) -> list[AdminSellerOut]:
    query = (
        select(Seller, Store, Store.seller_id == Seller.id)
        .join(Store, _shop_of())
        .order_by(Store.name, Seller.role, Seller.created_at)
    )
    if seller_id is not None:
        query = query.where(Seller.id == seller_id)
    rows = (await db.execute(query)).all()
    ids = [seller.id for seller, _, _ in rows]
    seen = dict(
        (
            await db.execute(
                select(RefreshToken.seller_id, func.max(RefreshToken.created_at))
                .where(RefreshToken.seller_id.in_(ids))
                .group_by(RefreshToken.seller_id)
            )
        ).all()
    )
    logins: dict[uuid.UUID, list[AdminLoginOut]] = {}
    for login in await db.scalars(
        select(SellerLogin)
        .where(SellerLogin.seller_id.in_(ids), SellerLogin.provider.not_in(RETIRED))
        .order_by(SellerLogin.provider)
    ):
        logins.setdefault(login.seller_id, []).append(
            AdminLoginOut(provider=login.provider.value, label=login.email or login.name)
        )
    # A shop is open while its owner's login is (Close shop turns them all off).
    owners_open = {store.id: seller.is_active for seller, store, owns in rows if owns}
    return [
        AdminSellerOut(
            id=seller.id,
            name=seller.full_name,
            phone=seller.phone,
            email=seller.email,
            role=seller.role.value,
            store_id=store.id,
            shop=store.name,
            code=plan_service.shop_code(store.id),
            is_open=owners_open.get(store.id, seller.is_active),
            has_password=seller.has_password,
            logins=logins.get(seller.id, []),
            last_seen=seen.get(seller.id),
        )
        for seller, store, _ in rows
    ]


async def list_people(db: AsyncSession) -> list[AdminSellerOut]:
    """Every login, by shop, the owner first."""
    return await _people(db)


async def person(db: AsyncSession, seller_id: uuid.UUID) -> AdminSellerOut:
    found = await _people(db, seller_id)
    if not found:
        raise NotFound("SELLER_NOT_FOUND", "Login not found.")
    return found[0]


async def _locked(db: AsyncSession, seller_id: uuid.UUID) -> tuple[Seller, Store]:
    row = (
        await db.execute(
            select(Seller, Store)
            .join(Store, _shop_of())
            .where(Seller.id == seller_id)
            .with_for_update(of=Seller)
        )
    ).first()
    if row is None:
        raise NotFound("SELLER_NOT_FOUND", "Login not found.")
    seller, store = row
    return seller, store


def _log(
    db: AsyncSession, admin_id: uuid.UUID, action: str, seller: Seller, store: Store, **details
) -> None:
    admin_log.record(db, admin_id, action, store=store, person=seller.full_name, **details)


async def new_password(db: AsyncSession, admin_id: uuid.UUID, seller_id: uuid.UUID) -> str:
    """Part 9: a new password, shown once; every phone on the login is
    logged out. They change it in Settings → Your account."""
    seller, store = await _locked(db, seller_id)
    password = temporary_password()
    seller.password_hash = await security.hash_password(password)
    await db.execute(delete(RefreshToken).where(RefreshToken.seller_id == seller.id))
    _log(db, admin_id, "reset_password", seller, store)
    await db.commit()
    return password


async def logout_all(db: AsyncSession, admin_id: uuid.UUID, seller_id: uuid.UUID) -> AdminSellerOut:
    """Part 10: every session of the login ends (a stolen phone). Its
    password stays."""
    seller, store = await _locked(db, seller_id)
    await db.execute(delete(RefreshToken).where(RefreshToken.seller_id == seller.id))
    _log(db, admin_id, "logout_all", seller, store)
    await db.commit()
    return await person(db, seller_id)


async def change_phone(
    db: AsyncSession, admin_id: uuid.UUID, seller_id: uuid.UUID, phone: str
) -> AdminSellerOut:
    """Part 11: a new login number (a lost SIM). Refused when another
    login has it. Their sessions stay: the phone in their hand is the
    same."""
    try:
        new = normalize_phone(phone)
    except ValueError as exc:
        raise AppError(422, "INVALID_PHONE", "This isn't a phone number.", "phone") from exc
    seller, store = await _locked(db, seller_id)
    if new == seller.phone:
        raise AppError(422, "SAME_PHONE", "That's already their login number.", "phone")
    taken = AppError(409, "PHONE_TAKEN", "Another account already has this phone number.", "phone")
    if await db.scalar(select(Seller.id).where(Seller.phone == new)):
        raise taken
    _log(db, admin_id, "change_phone", seller, store, before=seller.phone, after=new)
    seller.phone = new
    try:
        await db.commit()
    except IntegrityError as exc:  # the same number taken meanwhile
        await db.rollback()
        raise taken from exc
    return await person(db, seller_id)


async def remove_login(
    db: AsyncSession, admin_id: uuid.UUID, seller_id: uuid.UUID, provider: LoginProvider
) -> AdminSellerOut:
    """Part 12: a Google or Facebook account taken off the login; the
    phone login stays. Refused when it's their only way in (no password,
    and not an owner who logs in with Telegram)."""
    seller, store = await _locked(db, seller_id)
    login = await db.scalar(
        select(SellerLogin).where(
            SellerLogin.seller_id == seller.id, SellerLogin.provider == provider
        )
    )
    if login is None:
        raise NotFound("LOGIN_NOT_FOUND", "This login isn't connected.")
    others = await db.scalar(
        select(func.count())
        .select_from(SellerLogin)
        .where(
            SellerLogin.seller_id == seller.id,
            SellerLogin.id != login.id,
            SellerLogin.provider.not_in(RETIRED),
        )
    )
    telegram = seller.role is SellerRole.OWNER and seller.phone is not None
    if not (seller.has_password or telegram or others):
        raise AppError(
            409,
            "LAST_WAY_IN",
            "This is their only way to log in. Give them a new password first.",
        )
    _log(
        db,
        admin_id,
        "remove_login",
        seller,
        store,
        provider=provider.value,
        label=login.email or login.name,
    )
    await db.delete(login)
    await db.commit()
    return await person(db, seller_id)
