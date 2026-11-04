import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_active_user, get_db, require_role
from backend.app.core.security import get_password_hash
from backend.app.models.user import User
from backend.app.schemas.auth import AdminUserUpdateRequest, UserCreateRequest, UserResponse

router = APIRouter()


@router.get(
    "/users",
    response_model=List[UserResponse],
    summary="List all users in the administrator's company workspace",
)
async def list_company_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    """Retrieve all users associated with the current admin's company."""
    stmt = select(User)
    if current_user.company_name:
        # Filter strictly by company name
        stmt = stmt.where(User.company_name == current_user.company_name)
    stmt = stmt.order_by(User.created_at.desc())

    result = await db.scalars(stmt)
    return list(result.all())


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user within the administrator's company",
)
async def create_company_user(
    user_in: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    """Admin creates a new user (agent/manager) belonging to their company."""
    clean_email = user_in.email.lower().strip()
    existing = await db.scalar(select(User).where(User.email == clean_email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Assign to admin's company
    target_company = current_user.company_name or user_in.company_name

    new_user = User(
        email=clean_email,
        full_name=user_in.full_name.strip(),
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role if user_in.role in ["agent", "manager", "admin"] else "agent",
        company_name=target_company,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Update a user's role, status, or password in the administrator's company",
)
async def update_company_user(
    user_id: uuid.UUID,
    user_update: AdminUserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    """Admin updates user status (active/inactive), role, or password."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Ensure admin cannot modify users outside their company
    if current_user.company_name and user.company_name != current_user.company_name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot manage users from another company workspace",
        )

    # Prevent admin from deactivating themselves
    if user.id == current_user.id and user_update.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    # Prevent admin from demoting their own account to avoid lockout
    if user.id == current_user.id and user_update.role is not None and user_update.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot demote their own account from admin.",
        )

    if user_update.role is not None:
        if user_update.role in ["agent", "manager", "admin"]:
            user.role = user_update.role
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    if user_update.password is not None:
        user.hashed_password = get_password_hash(user_update.password)

    await db.commit()
    await db.refresh(user)
    return user


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a user from the administrator's company",
)
async def delete_company_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    """Admin removes a user from their company workspace."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Ensure admin cannot delete users outside their company
    if current_user.company_name and user.company_name != current_user.company_name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot manage users from another company workspace",
        )

    # Prevent admin from deleting themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot remove their own account.",
        )

    await db.delete(user)
    await db.commit()

