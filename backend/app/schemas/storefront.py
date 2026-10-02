"""Public storefront responses: only what a customer may see. No SKUs,
product status, payment/Telegram settings, or seller details."""

import uuid
from decimal import Decimal

from pydantic import BaseModel

from app.models import PaymentMethod
from app.models.account import Currency


class ShopCategoryRef(BaseModel):
    name: str
    slug: str


class ShopCategoryOut(ShopCategoryRef):
    product_count: int


class ShopStoreOut(BaseModel):
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    currency: Currency
    # Only categories with at least one product on sale.
    categories: list[ShopCategoryOut]
    # The ways to pay this shop takes, for checkout. Details (bank account,
    # KHQR) are shown only on the order page, after ordering.
    payment_methods: list[PaymentMethod]


class ShopProductCard(BaseModel):
    """A product in a grid."""

    id: uuid.UUID
    name: str
    slug: str
    image_url: str | None  # the first photo
    # Equal unless the product's variants have different prices.
    price_min: Decimal
    price_max: Decimal
    in_stock: bool


class ShopVariantOut(BaseModel):
    id: uuid.UUID
    name: str
    price: Decimal  # the variant's own price, or else the product's
    stock_quantity: int


class ShopProductOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    price: Decimal
    image_urls: list[str]
    has_variants: bool
    stock_quantity: int | None  # null when has_variants: stock is per variant
    variants: list[ShopVariantOut]
    category: ShopCategoryRef | None


class ShopCategoryPageOut(BaseModel):
    category: ShopCategoryRef
    products: list[ShopProductCard]
