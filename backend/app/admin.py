"""The founder's tools, run by hand from backend/ (docs/ADMIN.md). A
seller is named by their login, a phone number or (accounts from before
2026-10-09) an email:

    python -m app.admin reset-password 012345678
    python -m app.admin close-shop 012345678
    python -m app.admin reopen-shop 012345678
    python -m app.admin erase-shop 012345678
    python -m app.admin test-shop
    python -m app.admin move-photos https://pub-xxxx.r2.dev https://images.oaksolve.com

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
from app.services.auth import login_filter
from app.services.images import delete_store_files
from app.services.slugs import slugify, unique_slug

# No 0/o, 1/l/i: read out over the phone or typed from a Telegram message.
_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


class AdminError(Exception):
    """Something the founder should read, not a crash."""


def temporary_password() -> str:
    """Like "k7mx-9qp4-hd2a": 12 random characters in groups of four."""
    chars = "".join(secrets.choice(_ALPHABET) for _ in range(12))
    return "-".join(chars[i : i + 4] for i in range(0, 12, 4))


async def reset_password(login: str) -> str:
    """Give the seller a new password and log out every phone. Returns the
    password, for the founder to send them; they change it in Settings →
    Your account."""
    password = temporary_password()
    async with unscoped_session() as db:
        seller = await _seller(db, login)
        seller.password_hash = await security.hash_password(password)
        await db.execute(delete(RefreshToken).where(RefreshToken.seller_id == seller.id))
        await db.commit()
    return password


async def _seller(db: AsyncSession, login: str) -> Seller:
    where = login_filter(login)
    seller = await db.scalar(select(Seller).where(where)) if where is not None else None
    if seller is None:
        raise AdminError(f"No account with the login {login}.")
    return seller


async def set_shop_open(login: str, is_open: bool) -> str:
    """Close a shop (its link and logins stop; nothing is erased) or open
    it again. Returns the shop's link name."""
    async with unscoped_session() as db:
        seller = await _seller(db, login)
        store = await db.scalar(select(Store).where(Store.seller_id == seller.id))
        if store is None:
            raise AdminError("This is a staff login, not a shop's owner. Use the owner's login.")
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


async def shop_size(login: str) -> ShopSize:
    """What erasing would remove, to show before asking."""
    async with unscoped_session() as db:
        seller = await _seller(db, login)
        store = await db.scalar(select(Store).where(Store.seller_id == seller.id))
        if store is None:
            raise AdminError("This account has no shop.")

        async def count(model: type[Product | Order | Customer]) -> int:
            return await db.scalar(select(func.count()).where(model.store_id == store.id)) or 0

        return ShopSize(
            store.name, store.slug, await count(Product), await count(Order), await count(Customer)
        )


async def erase_shop(login: str, typed_slug: str) -> int:
    """Erase a closed shop for good: the account, the shop and everything
    in it (products, orders, customers, links, alerts), and its photos in
    R2. `typed_slug` must be the shop's link name, as a last check.
    Returns how many photo files were deleted."""
    async with unscoped_session() as db:
        seller = await _seller(db, login)
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


@dataclass(frozen=True)
class MadeShop:
    email: str
    password: str
    slug: str


async def make_test_shop(name: str) -> MadeShop:
    """A shop to try things on, like the load test (backend/loadtest). It
    logs in with an email and has no phone: signing up through the app
    needs a phone number checked in Telegram, one shop per number."""
    email = f"test-{secrets.token_hex(4)}@example.com"
    password = temporary_password()
    async with unscoped_session() as db:
        seller = Seller(
            email=email,
            password_hash=await security.hash_password(password),
            full_name="Test",
        )
        db.add(seller)
        await db.flush()
        slug = await unique_slug(db, Store.slug, slugify(name))
        db.add(Store(seller_id=seller.id, name=name, slug=slug))
        await db.commit()
    return MadeShop(email, password, slug)


@dataclass(frozen=True)
class MovedPhotos:
    products: int
    logos: int


def _moved(url: str, old: str, new: str) -> str:
    return new + url.removeprefix(old) if url.startswith(f"{old}/") else url


async def move_photos(old: str, new: str) -> MovedPhotos:
    """Point every saved product photo and shop logo at a new address for
    the same R2 bucket (e.g. its r2.dev address → images.oaksolve.com).
    The files don't move; only the addresses saved with them change.
    Products and shops only accept photos under R2_PUBLIC_URL, so run it
    right after changing that. Running it again changes nothing; swapping
    the two addresses undoes it."""
    old, new = old.rstrip("/"), new.rstrip("/")
    if not (old.startswith("https://") and new.startswith("https://")) or old == new:
        raise AdminError("Give two different https:// addresses: the old one, then the new one.")
    async with unscoped_session() as db:
        products = 0
        for product in await db.scalars(select(Product)):
            urls = [_moved(url, old, new) for url in product.image_urls]
            if urls != product.image_urls:
                product.image_urls = urls
                products += 1
        logos = 0
        for store in await db.scalars(select(Store).where(Store.logo_url.startswith(f"{old}/"))):
            store.logo_url = _moved(store.logo_url, old, new)
            logos += 1
        await db.commit()
    return MovedPhotos(products, logos)


async def _run(args: argparse.Namespace) -> str:
    if args.command == "reset-password":
        password = await reset_password(args.login)
        return (
            f"New password for {args.login}: {password}\n"
            "Every phone is logged out. Send it to the seller and ask them to change it "
            "in Settings → Your account."
        )
    if args.command in ("close-shop", "reopen-shop"):
        slug = await set_shop_open(args.login, args.command == "reopen-shop")
        if args.command == "close-shop":
            return f"Closed /shop/{slug}: the link and logins stopped. Nothing was erased."
        return f"Opened /shop/{slug} again. The seller can log in."
    if args.command == "erase-shop":
        size = await shop_size(args.login)
        print(
            f"{size.name} (/shop/{size.slug}): {size.products} products, {size.orders} orders, "
            f"{size.customers} customers.\nThis can't be undone (nightly backups keep it 30 days)."
        )
        typed = input("Type the shop's link name to erase it for good: ")
        files = await erase_shop(args.login, typed)
        return f"Erased {size.name} and {files} photo files."
    if args.command == "test-shop":
        shop = await make_test_shop(args.name)
        return (
            f"Made /shop/{shop.slug}. Log in with {shop.email} and {shop.password}\n"
            f"Close it when you're done: python -m app.admin close-shop {shop.email}"
        )
    if args.command == "move-photos":
        moved = await move_photos(args.old, args.new)
        return f"Moved the photo addresses of {moved.products} products and {moved.logos} logos."
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
        commands.add_parser(name, help=help_text).add_argument(
            "login", help="the seller's phone number, or email for accounts from before 2026-10-09"
        )
    test = commands.add_parser("test-shop", help="make a shop to try things on (load test)")
    test.add_argument("--name", default="Load Test Shop", help="the shop's name")
    move = commands.add_parser("move-photos", help="point saved photos at a new R2 address")
    move.add_argument("old", help="the address photos have now, e.g. https://pub-xxxx.r2.dev")
    move.add_argument("new", help="the new address, e.g. https://images.oaksolve.com")
    args = parser.parse_args(argv)
    try:
        print(asyncio.run(_run(args)))
    except AdminError as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
