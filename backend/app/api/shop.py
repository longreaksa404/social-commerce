"""Public storefront: no login, scoped by the store slug in the path."""

import uuid
from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from app.api.deps import Shop, ShopDb
from app.core.config import get_settings
from app.core.ratelimit import check_limit, limiter
from app.schemas.link import TrackViewIn
from app.schemas.order import OrderCreate, PaymentClaimIn, ShopOrderOut
from app.schemas.storefront import (
    ShopCategoryPageOut,
    ShopProductCard,
    ShopProductOut,
    ShopStoreOut,
)
from app.services import checkout as checkout_service
from app.services import link as link_service
from app.services import notifications
from app.services import preview as preview_service
from app.services import storefront as storefront_service

# Per IP, across all storefront endpoints. Generous because customers on
# mobile data often share one public IP (carrier NAT); this only has to
# stop scraping and slug guessing.
SHOP_RATE_LIMIT = "300/minute"
# Per IP, on top of that, for placing orders: each one writes to the
# database and lands in a seller's order list.
ORDER_RATE_LIMIT = "10/minute"
# Per IP, for "I've paid": each one can alert a seller.
CLAIM_RATE_LIMIT = "10/minute"
# Per IP, for counting link views. The app counts a link once per device
# per half hour, so this only stops someone inflating a seller's numbers.
VIEW_RATE_LIMIT = "60/minute"
# Per IP, for link-preview pictures: each new one is drawn on the server.
# Facebook and Telegram ask once per link and keep a copy.
PREVIEW_RATE_LIMIT = "30/minute"


# A shared scope, because slowapi otherwise keys limits on the full URL and
# every guessed slug would get a fresh budget. A router dependency rather
# than a decorator on each endpoint, because those run only after the shop
# lookup, whose 404 would skip the limit.
@limiter.shared_limit(SHOP_RATE_LIMIT, scope="storefront")
async def _rate_limit(request: Request) -> None:
    pass


async def _order_rate_limit(request: Request) -> None:
    check_limit(ORDER_RATE_LIMIT, "place-order", request)


async def _view_rate_limit(request: Request) -> None:
    check_limit(VIEW_RATE_LIMIT, "track-view", request)


async def _claim_rate_limit(request: Request) -> None:
    check_limit(CLAIM_RATE_LIMIT, "payment-claim", request)


async def _preview_rate_limit(request: Request) -> None:
    check_limit(PREVIEW_RATE_LIMIT, "preview-picture", request)


router = APIRouter(
    prefix="/shop/{store_slug}", tags=["storefront"], dependencies=[Depends(_rate_limit)]
)


@router.get("", response_model=ShopStoreOut)
async def get_store(shop: Shop, db: ShopDb) -> ShopStoreOut:
    return await storefront_service.store_page(db, shop)


@router.get("/products", response_model=list[ShopProductCard])
async def list_products(shop: Shop, db: ShopDb) -> list[ShopProductCard]:
    return await storefront_service.list_products(db, shop.id)


@router.get("/products/{product_slug}", response_model=ShopProductOut)
async def get_product(product_slug: str, shop: Shop, db: ShopDb) -> ShopProductOut:
    return await storefront_service.get_product(db, shop.id, product_slug)


@router.get("/categories/{category_slug}", response_model=ShopCategoryPageOut)
async def get_category(category_slug: str, shop: Shop, db: ShopDb) -> ShopCategoryPageOut:
    return await storefront_service.category_page(db, shop.id, category_slug)


@router.post(
    "/orders",
    response_model=ShopOrderOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_order_rate_limit)],
)
async def place_order(
    data: OrderCreate, shop: Shop, db: ShopDb, background: BackgroundTasks
) -> ShopOrderOut:
    """Guest checkout (02_TECHNICAL.md section 5.4)."""
    order, stock_alerts = await checkout_service.place_order(
        db, shop.id, data, link_token=data.link
    )
    # After the response, so a slow Telegram never holds up the customer.
    background.add_task(notifications.notify_new_order, shop.id, order.id, stock_alerts)
    return await checkout_service.shop_order_out(db, shop, order)


@router.get("/orders/{order_id}", response_model=ShopOrderOut)
async def track_order(
    order_id: uuid.UUID,
    phone: Annotated[str, Query(max_length=32)],
    shop: Shop,
    db: ShopDb,
) -> ShopOrderOut:
    """Order tracking: the order link plus the phone it was placed with
    (02_TECHNICAL.md section 8)."""
    order = await checkout_service.track_order(db, shop.id, order_id, phone)
    return await checkout_service.shop_order_out(db, shop, order)


@router.post(
    "/orders/{order_id}/paid",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(_claim_rate_limit)],
)
async def say_paid(
    order_id: uuid.UUID, data: PaymentClaimIn, shop: Shop, db: ShopDb, background: BackgroundTasks
) -> None:
    """ "I've paid" (founder's pick 6B): with the order's link and phone,
    like tracking. The seller gets the bell and a Telegram alert (not
    again within 30 minutes); the payment stays pending until they check."""
    if await checkout_service.claim_payment(db, shop, order_id, data.phone):
        background.add_task(notifications.notify_payment_claimed, shop.id, order_id)


@router.post(
    "/track-view",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(_view_rate_limit)],
)
async def track_view(data: TrackViewIn, shop: Shop, background: BackgroundTasks) -> None:
    """A page was opened through one of the shop's links (?l=<token>,
    02_TECHNICAL.md section 9.2). Written after the response; an unknown
    token is ignored, so the answer is the same either way."""
    background.add_task(link_service.record_view, shop.id, data.token)


@router.get("/preview/logo", dependencies=[Depends(_preview_rate_limit)])
async def logo_preview(shop: Shop) -> Response:
    """og:image for a shop link (frontend/middleware.ts): the shop's logo
    with our mark in the corner, or our plain mark without a logo."""
    if not shop.logo_url:
        return _plain_mark()
    return await _preview(preview_service.logo_picture, shop.logo_url)


@router.get("/preview/products/{product_slug}", dependencies=[Depends(_preview_rate_limit)])
async def product_preview(product_slug: str, shop: Shop, db: ShopDb) -> Response:
    """og:image for a product link: its first photo as a 1200 × 630 card
    with our mark; the shop's picture if it has no photo."""
    photo = await storefront_service.product_photo(db, shop.id, product_slug)
    if photo is None:
        return await logo_preview(shop)
    return await _preview(preview_service.product_picture, photo)


async def _preview(draw: Callable[[str], Awaitable[bytes]], url: str) -> Response:
    try:
        picture = await draw(url)
    except preview_service.NoPicture:
        return _plain_mark()
    # The middleware adds ?v=<the photo's address>, so a new photo is a new URL.
    return Response(
        picture, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=86400"}
    )


def _plain_mark() -> RedirectResponse:
    """Our mark on navy, a fixed picture in the web app."""
    app_url = get_settings().public_app_url.rstrip("/") or "http://localhost:5173"
    return RedirectResponse(
        f"{app_url}/og/oak-mark.png",
        status_code=302,
        headers={"Cache-Control": "public, max-age=300"},
    )
