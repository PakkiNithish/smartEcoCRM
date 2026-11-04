import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_active_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.contact import (
    BulkContactCreateRequest,
    BulkContactCreateResponse,
    ContactCreate,
    ContactListResponse,
    ContactResponse,
    ContactUpdate,
)
from backend.app.schemas.deal import BulkDeleteRequest, BulkDeleteResponse
from backend.app.services.contact_service import ContactService

router = APIRouter()


def augment_contact_response(c, resp: ContactResponse) -> ContactResponse:
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
    response_model=ContactListResponse,
    status_code=status.HTTP_200_OK,
    summary="List contacts",
    description="Retrieve contacts with pagination, search by name/email/phone, company filtering, and account isolation.",
)
async def list_contacts(
    skip: int = Query(default=0, ge=0, description="Records to skip"),
    limit: int = Query(default=50, ge=1, le=100, description="Max records to return"),
    search: Optional[str] = Query(default=None, description="Search by name, email, or phone"),
    company_id: Optional[uuid.UUID] = Query(default=None, description="Filter by company UUID"),
    sort_field: Optional[str] = Query(default="created_at", description="Field to sort by"),
    sort_order: Optional[str] = Query(default="desc", description="Sort direction ('asc' or 'desc')"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    items, total = await ContactService.get_contacts(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        company_id=company_id,
        sort_field=sort_field,
        sort_order=sort_order,
        current_user=current_user,
    )
    # Augment counts & activities
    response_items = []
    for c in items:
        resp = ContactResponse.model_validate(c)
        response_items.append(augment_contact_response(c, resp))

    return ContactListResponse(items=response_items, total=total, skip=skip, limit=limit)


@router.post(
    "",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create contact",
    description="Create a new contact individual in the CRM.",
)
async def create_contact(
    contact_in: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    contact = await ContactService.create_contact(db=db, contact_in=contact_in, current_user=current_user)
    resp = ContactResponse.model_validate(contact)
    return augment_contact_response(contact, resp)


@router.post(
    "/bulk",
    response_model=BulkContactCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk create contacts",
    description="Batch create multiple contacts in the CRM.",
)
async def bulk_create_contacts(
    batch_in: BulkContactCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    created_items = []
    for item in batch_in.items:
        contact = await ContactService.create_contact(db=db, contact_in=item, current_user=current_user)
        resp = ContactResponse.model_validate(contact)
        resp.deals_count = len(contact.deals) if contact.deals else 0
        created_items.append(resp)
    await db.commit()
    return BulkContactCreateResponse(
        created_count=len(created_items),
        items=created_items,
    )


@router.post(
    "/bulk-delete",
    response_model=BulkDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Bulk delete contacts",
    description="Batch delete multiple contacts by their UUIDs.",
)
async def bulk_delete_contacts(
    batch_in: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    deleted_count = 0
    for contact_id in batch_in.ids:
        contact = await ContactService.get_contact_by_id(db=db, contact_id=contact_id, current_user=current_user)
        if contact:
            await ContactService.delete_contact(db=db, contact=contact)
            deleted_count += 1
    await db.commit()
    return BulkDeleteResponse(
        deleted_count=deleted_count,
        message=f"Successfully deleted {deleted_count} contact(s).",
    )


@router.get(
    "/{contact_id}",
    response_model=ContactResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve contact",
    description="Retrieve a single contact by UUID with associated company details.",
)
async def get_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    contact = await ContactService.get_contact_by_id(db=db, contact_id=contact_id, current_user=current_user)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with ID '{contact_id}' not found",
        )
    resp = ContactResponse.model_validate(contact)
    return augment_contact_response(contact, resp)


@router.patch(
    "/{contact_id}",
    response_model=ContactResponse,
    status_code=status.HTTP_200_OK,
    summary="Partially update contact",
    description="Update one or more fields of an existing contact.",
)
async def update_contact(
    contact_id: uuid.UUID,
    contact_in: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    contact = await ContactService.get_contact_by_id(db=db, contact_id=contact_id, current_user=current_user)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with ID '{contact_id}' not found",
        )
    updated = await ContactService.update_contact(
        db=db, contact=contact, contact_in=contact_in, current_user=current_user
    )
    resp = ContactResponse.model_validate(updated)
    return augment_contact_response(updated, resp)


@router.delete(
    "/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete contact",
    description="Permanently delete a contact from the CRM.",
)
async def delete_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    contact = await ContactService.get_contact_by_id(db=db, contact_id=contact_id, current_user=current_user)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with ID '{contact_id}' not found",
        )
    await ContactService.delete_contact(db=db, contact=contact)
    return None
