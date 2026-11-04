import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_active_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.company import (
    BulkCompanyCreateRequest,
    BulkCompanyCreateResponse,
    CompanyCreate,
    CompanyListResponse,
    CompanyResponse,
    CompanyUpdate,
)
from backend.app.schemas.deal import BulkDeleteRequest, BulkDeleteResponse
from backend.app.services.company_service import CompanyService

router = APIRouter()


def augment_company_response(c, resp: CompanyResponse) -> CompanyResponse:
    resp.contacts_count = len(c.contacts) if c.contacts else 0
    resp.deals_count = len(c.deals) if c.deals else 0
    resp.activities_count = len(c.activities) if getattr(c, "activities", None) else 0
    if getattr(c, "activities", None):
        latest = sorted(
            c.activities,
            key=lambda a: a.scheduled_at or a.created_at,
            reverse=True,
        )[0]
        resp.latest_activity = {
            "id": str(latest.id),
            "type": latest.type,
            "subject": latest.subject,
            "scheduled_at": latest.scheduled_at.isoformat() if latest.scheduled_at else None,
            "is_completed": latest.is_completed,
        }
    return resp


@router.get(
    "",
    response_model=CompanyListResponse,
    status_code=status.HTTP_200_OK,
    summary="List companies",
    description="Retrieve company accounts with pagination, search by name/industry/email/phone, and account isolation.",
)
async def list_companies(
    skip: int = Query(default=0, ge=0, description="Records to skip"),
    limit: int = Query(default=50, ge=1, le=100, description="Max records to return"),
    search: Optional[str] = Query(default=None, description="Search by name, industry, email, phone"),
    sort_field: Optional[str] = Query(default="created_at", description="Field to sort by"),
    sort_order: Optional[str] = Query(default="desc", description="Sort direction ('asc' or 'desc')"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    items, total = await CompanyService.get_companies(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        sort_field=sort_field,
        sort_order=sort_order,
        current_user=current_user,
    )
    # Augment counts
    response_items = []
    for c in items:
        resp = CompanyResponse.model_validate(c)
        response_items.append(augment_company_response(c, resp))

    return CompanyListResponse(items=response_items, total=total, skip=skip, limit=limit)


@router.post(
    "",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create company",
    description="Create a new company account in the CRM.",
)
async def create_company(
    company_in: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    company = await CompanyService.create_company(db=db, company_in=company_in, current_user=current_user)
    resp = CompanyResponse.model_validate(company)
    return augment_company_response(company, resp)


@router.post(
    "/bulk",
    response_model=BulkCompanyCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk create companies",
    description="Batch create multiple companies in the CRM.",
)
async def bulk_create_companies(
    batch_in: BulkCompanyCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    created_items = []
    for item in batch_in.items:
        company = await CompanyService.create_company(db=db, company_in=item, current_user=current_user)
        resp = CompanyResponse.model_validate(company)
        resp.contacts_count = len(company.contacts) if company.contacts else 0
        resp.deals_count = len(company.deals) if company.deals else 0
        created_items.append(resp)
    await db.commit()
    return BulkCompanyCreateResponse(
        created_count=len(created_items),
        items=created_items,
    )


@router.post(
    "/bulk-delete",
    response_model=BulkDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Bulk delete companies",
    description="Batch delete multiple companies by their UUIDs.",
)
async def bulk_delete_companies(
    batch_in: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    deleted_count = 0
    skipped_count = 0
    for company_id in batch_in.ids:
        company = await CompanyService.get_company_by_id(db=db, company_id=company_id, current_user=current_user)
        if company:
            try:
                await CompanyService.delete_company(db=db, company=company)
                deleted_count += 1
            except HTTPException:
                skipped_count += 1
    await db.commit()
    msg = f"Successfully deleted {deleted_count} company(ies)."
    if skipped_count > 0:
        msg += f" ({skipped_count} skipped due to associated contacts/deals)."
    return BulkDeleteResponse(
        deleted_count=deleted_count,
        message=msg,
    )


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve company",
    description="Retrieve a single company by UUID with related contacts and deals counts.",
)
async def get_company(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    company = await CompanyService.get_company_by_id(db=db, company_id=company_id, current_user=current_user)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{company_id}' not found",
        )
    resp = CompanyResponse.model_validate(company)
    return augment_company_response(company, resp)


@router.patch(
    "/{company_id}",
    response_model=CompanyResponse,
    status_code=status.HTTP_200_OK,
    summary="Partially update company",
    description="Update one or more fields of an existing company account.",
)
async def update_company(
    company_id: uuid.UUID,
    company_in: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    company = await CompanyService.get_company_by_id(db=db, company_id=company_id, current_user=current_user)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{company_id}' not found",
        )
    updated = await CompanyService.update_company(
        db=db, company=company, company_in=company_in, current_user=current_user
    )
    resp = CompanyResponse.model_validate(updated)
    return augment_company_response(updated, resp)


@router.delete(
    "/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete company",
    description="Permanently delete a company from the CRM. Fails with 409 Conflict if active contacts or deals exist.",
)
async def delete_company(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    company = await CompanyService.get_company_by_id(db=db, company_id=company_id, current_user=current_user)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{company_id}' not found",
        )
    await CompanyService.delete_company(db=db, company=company)
    return None
