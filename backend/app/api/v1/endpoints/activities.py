import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_active_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.activity import (
    ActivityCreate,
    ActivityListResponse,
    ActivityResponse,
    ActivityUpdate,
)
from backend.app.services.activity_service import ActivityService

router = APIRouter()


@router.get("", response_model=ActivityListResponse)
async def list_activities(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max items to return"),
    search: Optional[str] = Query(None, description="Search keyword in subject/notes"),
    type: Optional[str] = Query(None, description="Filter by activity type (call, meeting, email, note, follow_up)"),
    is_completed: Optional[bool] = Query(None, description="Filter by completion status"),
    deal_id: Optional[uuid.UUID] = Query(None, description="Filter by related deal UUID"),
    contact_id: Optional[uuid.UUID] = Query(None, description="Filter by related contact UUID"),
    company_id: Optional[uuid.UUID] = Query(None, description="Filter by related company UUID"),
    user_id: Optional[uuid.UUID] = Query(None, description="Filter by creator user UUID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve a paginated list of CRM activities with type, record filters, and account isolation."""
    items, total = await ActivityService.get_activities(
        db,
        skip=skip,
        limit=limit,
        search=search,
        type_filter=type,
        is_completed=is_completed,
        deal_id=deal_id,
        contact_id=contact_id,
        company_id=company_id,
        user_id=user_id,
        current_user=current_user,
    )
    return ActivityListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(
    data: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Record a new CRM interaction (call, meeting, note, email, follow-up) linked to a Deal, Contact, or Company."""
    return await ActivityService.create_activity(db, data, current_user=current_user)


@router.get("/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve a specific CRM activity by UUID with account validation."""
    activity = await ActivityService.get_activity_by_id(db, activity_id, current_user=current_user)
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity '{activity_id}' not found.",
        )
    return activity


@router.patch("/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: uuid.UUID,
    data: ActivityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an activity's details, notes, or toggle completion status with account validation."""
    activity = await ActivityService.get_activity_by_id(db, activity_id, current_user=current_user)
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity '{activity_id}' not found.",
        )
    return await ActivityService.update_activity(db, activity_id, data)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a CRM activity with account validation."""
    activity = await ActivityService.get_activity_by_id(db, activity_id, current_user=current_user)
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity '{activity_id}' not found.",
        )
    await ActivityService.delete_activity(db, activity_id)
    return None
