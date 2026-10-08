"""The founder's tools, run by hand from backend/ (docs/ADMIN.md):

    python -m app.admin reset-password seller@example.com

On the live database: put Neon's direct connection string in
DATABASE_URL for that one command (it wins over the .env file).

There's no admin screen in the MVP; these are the few things only the
founder does.
"""

import argparse
import asyncio
import secrets

from sqlalchemy import delete, select

from app.core import security
from app.db.session import unscoped_session
from app.models import RefreshToken, Seller

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


async def _run(args: argparse.Namespace) -> str:
    if args.command == "reset-password":
        password = await reset_password(args.email)
        return (
            f"New password for {args.email}: {password}\n"
            "Every phone is logged out. Send it to the seller and ask them to change it "
            "in Settings → Your account."
        )
    raise AdminError(f"Unknown command {args.command}.")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="python -m app.admin",
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    commands = parser.add_subparsers(dest="command", required=True)
    reset = commands.add_parser("reset-password", help="give a seller a new password")
    reset.add_argument("email")
    args = parser.parse_args(argv)
    try:
        print(asyncio.run(_run(args)))
    except AdminError as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
