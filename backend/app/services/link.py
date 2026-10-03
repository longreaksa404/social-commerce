"""Shareable links: the seller makes one per place they post (the red dress
on TikTok), and each counts the views and orders it brings
(02_TECHNICAL.md section 9).

A link's address is the page's own address plus ?l=<token>. Opening it
records a view; the customer's device remembers the last link for 7 days
(decided 2026-10-03), and an order placed in that time counts for it and
gets its source.

Every query filters by store_id (layer 1) on a tenant session where RLS
enforces the same thing (layer 2).
"""

import logging
import secrets
import string
import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, NotFound
from app.db.session import tenant_session
from app.models import (
    Category,
    LinkEvent,
    LinkEventType,
    LinkTarget,
    Order,
    Product,
    ProductStatus,
    ShareableLink,
    Store,
)
from app.schemas.link import LinkCreate, LinkOut, LinkStatsOut
from app.services import order as order_service

logger = logging.getLogger(__name__)

TOKEN_ALPHABET = string.ascii_lowercase + string.digits
TOKEN_LENGTH = 8  # 36^8, about 2.8 trillion
# The Links page lists this many, newest first.
MAX_LINKS = 200
# A link's page lists this many of its orders, newest first.
MAX_ORDERS = 100


def _new_token() -> str:
    return "".join(secrets.choice(TOKEN_ALPHABET) for _ in range(TOKEN_LENGTH))


@dataclass(frozen=True)
class _Target:
    name: str
    slug: str
    live: bool  # its page opens in the shop


async def _targets(
    db: AsyncSession, store_id: uuid.UUID, links: list[ShareableLink]
) -> dict[uuid.UUID, _Target]:
    """The products and categories these links open, by id."""
    ids = {
        kind: {link.target_id for link in links if link.target_type is kind}
        for kind in (LinkTarget.PRODUCT, LinkTarget.CATEGORY)
    }
    targets: dict[uuid.UUID, _Target] = {}
    if ids[LinkTarget.PRODUCT]:
        rows = await db.execute(
            select(Product.id, Product.name, Product.slug, Product.status).where(
                Product.store_id == store_id, Product.id.in_(ids[LinkTarget.PRODUCT])
            )
        )
        for id_, name, slug, status in rows:
            targets[id_] = _Target(name, slug, status is ProductStatus.ACTIVE)
    if ids[LinkTarget.CATEGORY]:
        rows = await db.execute(
            select(Category.id, Category.name, Category.slug).where(
                Category.store_id == store_id, Category.id.in_(ids[LinkTarget.CATEGORY])
            )
        )
        for id_, name, slug in rows:
            targets[id_] = _Target(name, slug, True)
    return targets


def _path(store: Store, link: ShareableLink, target: _Target | None) -> str | None:
    """The address to share, with the current slugs (02 section 9.1)."""
    shop = f"/shop/{store.slug}"
    query = f"?l={link.token}"
    if link.target_type is LinkTarget.STORE:
        return shop + query
    if target is None or not target.live:
        return None
    kind = "product" if link.target_type is LinkTarget.PRODUCT else "category"
    return f"{shop}/{kind}/{target.slug}{query}"


async def _counts(
    db: AsyncSession, store_id: uuid.UUID, link_ids: list[uuid.UUID]
) -> dict[tuple[uuid.UUID, LinkEventType], int]:
    if not link_ids:
        return {}
    rows = await db.execute(
        select(LinkEvent.link_id, LinkEvent.event_type, func.count())
        .where(LinkEvent.store_id == store_id, LinkEvent.link_id.in_(link_ids))
        .group_by(LinkEvent.link_id, LinkEvent.event_type)
    )
    return {(link_id, kind): count for link_id, kind, count in rows}


async def _out(db: AsyncSession, store: Store, links: list[ShareableLink]) -> list[LinkOut]:
    targets = await _targets(db, store.id, links)
    counts = await _counts(db, store.id, [link.id for link in links])
    out = []
    for link in links:
        target = targets.get(link.target_id) if link.target_id else None
        out.append(
            LinkOut(
                id=link.id,
                target_type=link.target_type,
                target_id=link.target_id,
                target_name=target.name if target else None,
                path=_path(store, link, target),
                token=link.token,
                source=link.source,
                campaign=link.campaign,
                created_at=link.created_at,
                view_count=counts.get((link.id, LinkEventType.VIEW), 0),
                order_count=counts.get((link.id, LinkEventType.ORDER), 0),
            )
        )
    return out


async def _store(db: AsyncSession, store_id: uuid.UUID) -> Store:
    store = await db.scalar(select(Store).where(Store.id == store_id))
    assert store is not None  # the logged-in seller's own store
    return store


async def list_links(db: AsyncSession, store_id: uuid.UUID) -> list[LinkOut]:
    """Newest first."""
    links = list(
        await db.scalars(
            select(ShareableLink)
            .where(ShareableLink.store_id == store_id)
            .order_by(ShareableLink.created_at.desc(), ShareableLink.id)
            .limit(MAX_LINKS)
        )
    )
    return await _out(db, await _store(db, store_id), links)


async def create_link(db: AsyncSession, store_id: uuid.UUID, data: LinkCreate) -> LinkOut:
    """A new link, or the one already made for the same page, place and
    name (so tapping Share twice doesn't split the counts)."""
    await _check_target(db, store_id, data)
    link = await db.scalar(
        select(ShareableLink).where(
            ShareableLink.store_id == store_id,
            ShareableLink.target_type == data.target_type,
            ShareableLink.target_id.is_(None)
            if data.target_id is None
            else ShareableLink.target_id == data.target_id,
            ShareableLink.source == data.source,
            ShareableLink.campaign.is_(None)
            if data.campaign is None
            else ShareableLink.campaign == data.campaign,
        )
    )
    if link is None:
        link = ShareableLink(
            store_id=store_id,
            target_type=data.target_type,
            target_id=data.target_id,
            token=_new_token(),
            source=data.source,
            campaign=data.campaign,
        )
        db.add(link)
        await db.commit()
    return (await _out(db, await _store(db, store_id), [link]))[0]


async def _check_target(db: AsyncSession, store_id: uuid.UUID, data: LinkCreate) -> None:
    """The product or category is this store's, and its page opens."""
    if data.target_type is LinkTarget.PRODUCT:
        status = await db.scalar(
            select(Product.status).where(Product.id == data.target_id, Product.store_id == store_id)
        )
        if status is None:
            raise NotFound("PRODUCT_NOT_FOUND", "Product not found.")
        if status is not ProductStatus.ACTIVE:
            raise AppError(
                409,
                "PRODUCT_HIDDEN",
                "This product is hidden from your shop. Show it first, then share it.",
                "target_id",
            )
    elif data.target_type is LinkTarget.CATEGORY:
        found = await db.scalar(
            select(Category.id).where(Category.id == data.target_id, Category.store_id == store_id)
        )
        if found is None:
            raise NotFound("CATEGORY_NOT_FOUND", "Category not found.")


async def link_stats(db: AsyncSession, store_id: uuid.UUID, link_id: uuid.UUID) -> LinkStatsOut:
    """The link with its counts and the orders it brought."""
    link = await db.scalar(
        select(ShareableLink).where(ShareableLink.id == link_id, ShareableLink.store_id == store_id)
    )
    if link is None:
        raise NotFound("LINK_NOT_FOUND", "Link not found.")
    out = (await _out(db, await _store(db, store_id), [link]))[0]
    orders = await db.scalars(
        select(Order)
        .join(LinkEvent, LinkEvent.order_id == Order.id)
        .where(
            Order.store_id == store_id,
            LinkEvent.store_id == store_id,
            LinkEvent.link_id == link.id,
        )
        .options(*order_service.SUMMARY_LOADS)
        .order_by(Order.number.desc())
        .limit(MAX_ORDERS)
    )
    return LinkStatsOut(**out.model_dump(), orders=[order_service.order_summary(o) for o in orders])


async def find(db: AsyncSession, store_id: uuid.UUID, token: str) -> ShareableLink | None:
    """This store's link with this token. Another store's token, or one
    that never existed, finds nothing."""
    return await db.scalar(
        select(ShareableLink).where(
            ShareableLink.store_id == store_id, ShareableLink.token == token
        )
    )


async def record_view(store_id: uuid.UUID, token: str) -> None:
    """A view of a page opened through a link. Runs after the response
    (BackgroundTasks); a failure is logged and the customer never sees it."""
    try:
        async with tenant_session(store_id) as db:
            link = await find(db, store_id, token)
            if link is not None:
                db.add(LinkEvent(store_id=store_id, link_id=link.id, event_type=LinkEventType.VIEW))
                await db.commit()
    except Exception:
        logger.exception("Couldn't record a link view")


def order_event(link: ShareableLink, order: Order) -> LinkEvent:
    """The order counts for the link (saved with the order)."""
    return LinkEvent(
        store_id=link.store_id,
        link_id=link.id,
        event_type=LinkEventType.ORDER,
        order_id=order.id,
    )
