"""The founder's tools, run by hand from backend/ (docs/ADMIN.md):

    python -m app.admin reset-password seller@example.com
    python -m app.admin close-shop seller@example.com
    python -m app.admin reopen-shop seller@example.com
    python -m app.admin erase-shop seller@example.com

On the live database: put Neon's direct connection string in
DATABASE_URL for that one command (it wins over the .env file).

There's no admin screen in the MVP; these are the few things only the
founder does.
"""

import argparse
import asyncio
import secrets
from dataclasses import dataclass

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.db.session import unscoped_session
from app.models import Customer, Order, Product, RefreshToken, Seller, Store
from app.services.account import set_shop_logins
from app.services.images import delete_store_files

# No 0/o, 1/l/i: read out over the phone or typed from a Telegram message.
_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


class AdminError(Exception):
    """Something the founder should read, not a crash."""


def temporary_password() -> str:
    """Like "k7mx-9qp4-hd2a": 12 random characters in groups of four."""
    chars = "".join(secrets.choice(_ALPHABET) for _ in range(12))
    return "-".join(chars[i : i + 4] for i in range(0, 12, 4))


async def reset_password(email: str) -> str:
    """Give the seller a new password and log out every phone. Returns the
    password, for the founder to send them; they change it in Settings →
    Your account."""
    password = temporary_password()
    async with unscoped_session() as db:
        seller = await db.scalar(select(Seller).where(Seller.email == email.strip().lower()))
        if seller is None:
            raise AdminError(f"No account with the email {email}.")
        seller.password_hash = await security.hash_password(password)
        await db.execute(delete(RefreshToken).where(RefreshToken.seller_id == seller.id))
        await db.commit()
    return password


async def _seller(db: AsyncSession, email: str) -> Seller:
    seller = await db.scalar(select(Seller).where(Seller.email == email.strip().lower()))
    if seller is None:
        raise AdminError(f"No account with the email {email}.")
    return seller


async def set_shop_open(email: str, is_open: bool) -> str:
    """Close a shop (its link and logins stop; nothing is erased) or open
    it again. Returns the shop's link name."""
    async with unscoped_session() as db:
        seller = await _seller(db, email)
        store = await db.scalar(select(Store).where(Store.seller_id == seller.id))
        if store is None:
            raise AdminError("This is a staff login, not a shop's owner. Use the owner's email.")
        # The owner's and the staff's logins together.
        await set_shop_logins(db, seller.id, store.id, active=is_open)
        await db.commit()
    return store.slug


@dataclass
class ShopSize:
    name: str
    slug: str
    products: int
    orders: int
    customers: int


async def shop_size(email: str) -> ShopSize:
    """What erasing would remove, to show before asking."""
    async with unscoped_session() as db:
        seller = await _seller(db, email)
        store = await db.scalar(select(Store).where(Store.seller_id == seller.id))
        if store is None:
            raise AdminError("This account has no shop.")

        async def count(model: type[Product | Order | Customer]) -> int:
            return await db.scalar(select(func.count()).where(model.store_id == store.id)) or 0

        return ShopSize(
            store.name, store.slug, await count(Product), await count(Order), await count(Customer)
        )


async def erase_shop(email: str, typed_slug: str) -> int:
    """Erase a closed shop for good: the account, the shop and everything
    in it (products, orders, customers, links, alerts), and its photos in
    R2. `typed_slug` must be the shop's link name, as a last check.
    Returns how many photo files were deleted."""
    async with unscoped_session() as db:
        seller = await _seller(db, email)
        if seller.is_active:
            raise AdminError("The shop is open. Close it first (close-shop), then erase it.")
        store = await db.scalar(select(Store).where(Store.seller_id == seller.id))
        if store is None or typed_slug.strip() != store.slug:
            raise AdminError("That isn't the shop's link name. Nothing was erased.")
        store_id = store.id
        # A plain DELETE, so Postgres cascades it: store from seller, every
        # tenant table from store. (session.delete() would try to blank
        # store.seller_id instead.)
        await db.execute(delete(Seller).where(Seller.id == seller.id))
        await db.commit()
    return delete_store_files(store_id)


async def _run(args: argparse.Namespace) -> str:
    if args.command == "reset-password":
        password = await reset_password(args.email)
        return (
            f"New password for {args.email}: {password}\n"
            "Every phone is logged out. Send it to the seller and ask them to change it "
            "in Settings → Your account."
        )
    if args.command in ("close-shop", "reopen-shop"):
        slug = await set_shop_open(args.email, args.command == "reopen-shop")
        if args.command == "close-shop":
            return f"Closed /shop/{slug}: the link and logins stopped. Nothing was erased."
        return f"Opened /shop/{slug} again. The seller can log in."
    if args.command == "erase-shop":
        size = await shop_size(args.email)
        print(
            f"{size.name} (/shop/{size.slug}): {size.products} products, {size.orders} orders, "
            f"{size.customers} customers.\nThis can't be undone (nightly backups keep it 30 days)."
        )
        typed = input("Type the shop's link name to erase it for good: ")
        files = await erase_shop(args.email, typed)
        return f"Erased {size.name} and {files} photo files."
    raise AdminError(f"Unknown command {args.command}.")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="python -m app.admin",
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    commands = parser.add_subparsers(dest="command", required=True)
    for name, help_text in (
        ("reset-password", "give a seller a new password"),
        ("close-shop", "close a shop: its link and logins stop, nothing is erased"),
        ("reopen-shop", "open a closed shop again"),
        ("erase-shop", "erase a closed shop and everything in it, for good"),
    ):
        commands.add_parser(name, help=help_text).add_argument("email")
    args = parser.parse_args(argv)
    try:
        print(asyncio.run(_run(args)))
    except AdminError as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
