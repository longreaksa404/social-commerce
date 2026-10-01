import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin, TenantMixin, UUIDPrimaryKeyMixin
from app.models.account import str_enum

Money = Numeric(12, 2)


class ProductStatus(enum.StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class Category(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    __tablename__ = "category"
    __table_args__ = (UniqueConstraint("store_id", "slug"),)

    name: Mapped[str] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(String(64))


class Product(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    __tablename__ = "product"
    __table_args__ = (
        UniqueConstraint("store_id", "slug"),
        Index("ix_product_store_id_status", "store_id", "status"),
        Index("ix_product_store_id_category_id", "store_id", "category_id"),
        CheckConstraint("price >= 0", name="price_not_negative"),
        CheckConstraint("stock_quantity IS NULL OR stock_quantity >= 0", name="stock_not_negative"),
    )

    # Same-store category is checked in the service layer; FK checks skip RLS.
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("category.id", ondelete="SET NULL")
    )
    name: Mapped[str] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(String(64))
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Money)
    image_urls: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    status: Mapped[ProductStatus] = mapped_column(
        str_enum(ProductStatus, "status"),
        default=ProductStatus.ACTIVE,
        server_default="active",
    )
    has_variants: Mapped[bool] = mapped_column(default=False, server_default="false")
    # Used only when has_variants is false; otherwise stock lives on variants.
    stock_quantity: Mapped[int | None]
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    variants: Mapped[list["ProductVariant"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductVariant.created_at",
    )


class ProductVariant(UUIDPrimaryKeyMixin, TenantMixin, CreatedAtMixin, Base):
    """store_id is denormalized from product so RLS covers variants directly
    (CLAUDE.md hard rule 1; an addition to 02_TECHNICAL.md section 5.2)."""

    __tablename__ = "product_variant"
    __table_args__ = (
        Index("ix_product_variant_store_id_product_id", "store_id", "product_id"),
        CheckConstraint("price_override IS NULL OR price_override >= 0", name="price_not_negative"),
        CheckConstraint("stock_quantity >= 0", name="stock_not_negative"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)  # e.g. "Red / L"
    sku: Mapped[str | None] = mapped_column(Text)
    price_override: Mapped[Decimal | None] = mapped_column(Money)
    stock_quantity: Mapped[int] = mapped_column(default=0, server_default="0")

    product: Mapped[Product] = relationship(back_populates="variants")
