import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_active_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.task import TaskCreate, TaskListResponse, TaskResponse, TaskUpdate
from backend.app.services.task_service import TaskService

router = APIRouter()


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max items to return"),
    search: Optional[str] = Query(None, description="Search keyword in title/description"),
    status: Optional[str] = Query(None, description="Filter by status (pending, in_progress, completed, cancelled)"),
    priority: Optional[str] = Query(None, description="Filter by priority (low, medium, high, urgent)"),
    assigned_to_id: Optional[uuid.UUID] = Query(None, description="Filter by assigned user UUID"),
    deal_id: Optional[uuid.UUID] = Query(None, description="Filter by related deal UUID"),
    contact_id: Optional[uuid.UUID] = Query(None, description="Filter by related contact UUID"),
    company_id: Optional[uuid.UUID] = Query(None, description="Filter by related company UUID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve a paginated list of CRM tasks with keyword search, relationship filters, and account isolation."""
    items, total = await TaskService.get_tasks(
        db,
        skip=skip,
        limit=limit,
        search=search,
        status_filter=status,
        priority_filter=priority,
        assigned_to_id=assigned_to_id,
        deal_id=deal_id,
        contact_id=contact_id,
        company_id=company_id,
        current_user=current_user,
    )
    return TaskListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new CRM task linked to a deal, contact, or company with assigned team member."""
    return await TaskService.create_task(db, data, current_user=current_user)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve a specific CRM task by UUID with account validation."""
    task = await TaskService.get_task_by_id(db, task_id, current_user=current_user)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a task's status, priority, due date, description, or assigned user with account validation."""
    task = await TaskService.get_task_by_id(db, task_id, current_user=current_user)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )
    return await TaskService.update_task(db, task_id, data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a CRM task with account validation."""
    task = await TaskService.get_task_by_id(db, task_id, current_user=current_user)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )
    await TaskService.delete_task(db, task_id)
    return None
