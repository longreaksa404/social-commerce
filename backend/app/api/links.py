"""The seller's shareable links (02_TECHNICAL.md section 6.2, "Seller - Links")."""

import uuid

from fastapi import APIRouter, status

from app.api.deps import Seller, TenantDb
from app.schemas.link import LinkCreate, LinkOut, LinkStatsOut
from app.services import link as link_service

router = APIRouter(prefix="/seller/links", tags=["links"])


@router.get("", response_model=list[LinkOut])
async def list_links(seller: Seller, db: TenantDb) -> list[LinkOut]:
    """Newest first, each with its views and orders."""
    return await link_service.list_links(db, seller.store_id)


@router.post("", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
async def create_link(data: LinkCreate, seller: Seller, db: TenantDb) -> LinkOut:
    """A link to the shop, a product or a category for one place it's
    posted. Making the same one again returns the existing link."""
    return await link_service.create_link(db, seller.store_id, data)


@router.get("/{link_id}/stats", response_model=LinkStatsOut)
async def link_stats(link_id: uuid.UUID, seller: Seller, db: TenantDb) -> LinkStatsOut:
    """Its views and orders, with the orders themselves."""
    return await link_service.link_stats(db, seller.store_id, link_id)
