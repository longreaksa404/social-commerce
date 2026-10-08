import uuid

from fastapi import APIRouter, status

from app.api.deps import Owner, UnscopedDb
from app.schemas.staff import StaffCreate, StaffOut, StaffPassword
from app.services import staff as staff_service

# The owner only. The seller table isn't tenant-scoped: the service filters
# by the owner's store id from the access token.
router = APIRouter(prefix="/seller/staff", tags=["staff"])


@router.get("", response_model=list[StaffOut])
async def list_staff(seller: Owner, db: UnscopedDb) -> list[StaffOut]:
    return await staff_service.list_staff(db, seller.store_id)


@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
async def add_staff(data: StaffCreate, seller: Owner, db: UnscopedDb) -> StaffOut:
    return await staff_service.add_staff(db, seller.store_id, data)


@router.post("/{staff_id}/password", response_model=StaffOut)
async def set_password(
    staff_id: uuid.UUID, data: StaffPassword, seller: Owner, db: UnscopedDb
) -> StaffOut:
    return await staff_service.set_password(db, seller.store_id, staff_id, data.password)


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_staff(staff_id: uuid.UUID, seller: Owner, db: UnscopedDb) -> None:
    await staff_service.remove_staff(db, seller.store_id, staff_id)
