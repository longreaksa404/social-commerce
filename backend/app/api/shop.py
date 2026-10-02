"""Public storefront: no login, scoped by the store slug in the path."""

from fastapi import APIRouter, Depends, Request

from app.api.deps import Shop, ShopDb
from app.core.ratelimit import limiter
from app.schemas.storefront import (
    ShopCategoryPageOut,
    ShopProductCard,
    ShopProductOut,
    ShopStoreOut,
)
from app.services import storefront as storefront_service

# Per IP, across all storefront endpoints. Generous because customers on
# mobile data often share one public IP (carrier NAT); this only has to
# stop scraping and slug guessing.
SHOP_RATE_LIMIT = "300/minute"


# A shared scope, because slowapi otherwise keys limits on the full URL and
# every guessed slug would get a fresh budget. A router dependency rather
# than a decorator on each endpoint, because those run only after the shop
# lookup, whose 404 would skip the limit.
@limiter.shared_limit(SHOP_RATE_LIMIT, scope="storefront")
async def _rate_limit(request: Request) -> None:
    pass


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
