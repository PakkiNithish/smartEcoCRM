import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_active_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.deal import (
    BulkDealCreateRequest,
    BulkDealCreateResponse,
    BulkDeleteRequest,
    BulkDeleteResponse,
    DealCreate,
    DealListResponse,
    DealResponse,
    DealUpdate,
)
from backend.app.services.deal_service import DealService

router = APIRouter()


@router.get(
    "",
    response_model=DealListResponse,
    status_code=status.HTTP_200_OK,
    summary="List deals",
    description="Retrieve deals with pagination, search query filtering, and optional pipeline stage, company, or contact filter.",
)
async def list_deals(
    skip: int = Query(default=0, ge=0, description="Records to skip for pagination"),
    limit: int = Query(default=50, ge=1, le=100, description="Max records to return"),
    search: Optional[str] = Query(default=None, description="Search term matching title or description"),
    stage_id: Optional[uuid.UUID] = Query(default=None, description="Filter by pipeline stage ID"),
    company_id: Optional[uuid.UUID] = Query(default=None, description="Filter by company ID"),
    contact_id: Optional[uuid.UUID] = Query(default=None, description="Filter by contact ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    items, total = await DealService.get_deals(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        stage_id=stage_id,
        company_id=company_id,
        contact_id=contact_id,
        current_user=current_user,
    )
    return DealListResponse(items=items, total=total, skip=skip, limit=limit)


@router.post(
    "",
    response_model=DealResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create deal",
    description="Create a new deal opportunity in the pipeline.",
)
async def create_deal(
    deal_in: DealCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await DealService.create_deal(db=db, deal_in=deal_in, current_user=current_user)


@router.post(
    "/bulk",
    response_model=BulkDealCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk create deals",
    description="Batch create multiple deal opportunities in the pipeline.",
)
async def bulk_create_deals(
    batch_in: BulkDealCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    created_items = []
    for item in batch_in.items:
        deal = await DealService.create_deal(db=db, deal_in=item, current_user=current_user)
        created_items.append(deal)
    await db.commit()
    return BulkDealCreateResponse(
        created_count=len(created_items),
        items=created_items,
    )


@router.post(
    "/bulk-delete",
    response_model=BulkDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Bulk delete deals",
    description="Batch delete multiple deals by their UUIDs.",
)
async def bulk_delete_deals(
    batch_in: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    deleted_count = 0
    for deal_id in batch_in.ids:
        deal = await DealService.get_deal_by_id(db=db, deal_id=deal_id, current_user=current_user)
        if deal:
            await DealService.delete_deal(db=db, deal=deal)
            deleted_count += 1
    await db.commit()
    return BulkDeleteResponse(
        deleted_count=deleted_count,
        message=f"Successfully deleted {deleted_count} deal(s).",
    )


@router.get(
    "/{deal_id}",
    response_model=DealResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve deal",
    description="Retrieve a single deal by its UUID with all related entities.",
)
async def get_deal(
    deal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    deal = await DealService.get_deal_by_id(db=db, deal_id=deal_id, current_user=current_user)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deal with ID '{deal_id}' not found",
        )
    return deal


@router.patch(
    "/{deal_id}",
    response_model=DealResponse,
    status_code=status.HTTP_200_OK,
    summary="Partially update deal",
    description="Update one or more fields of an existing deal.",
)
async def update_deal(
    deal_id: uuid.UUID,
    deal_in: DealUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    deal = await DealService.get_deal_by_id(db=db, deal_id=deal_id, current_user=current_user)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deal with ID '{deal_id}' not found",
        )
    return await DealService.update_deal(db=db, deal=deal, deal_in=deal_in)


@router.delete(
    "/{deal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete deal",
    description="Permanently delete a deal from the pipeline.",
)
async def delete_deal(
    deal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    deal = await DealService.get_deal_by_id(db=db, deal_id=deal_id, current_user=current_user)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deal with ID '{deal_id}' not found",
        )
    await DealService.delete_deal(db=db, deal=deal)
    return None
