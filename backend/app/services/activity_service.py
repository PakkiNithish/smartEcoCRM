import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.activity import Activity
from backend.app.models.company import Company
from backend.app.models.contact import Contact
from backend.app.models.deal import Deal
from backend.app.models.user import User
from backend.app.schemas.activity import ActivityCreate, ActivityUpdate


class ActivityService:
    @staticmethod
    async def _validate_foreign_keys(
        db: AsyncSession,
        deal_id: Optional[uuid.UUID] = None,
        contact_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> None:
        """Validate that any provided foreign key references an existing record."""
        if deal_id is not None:
            deal_exists = await db.scalar(select(func.count(Deal.id)).where(Deal.id == deal_id))
            if not deal_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Referenced Deal '{deal_id}' does not exist.",
                )

        if contact_id is not None:
            contact_exists = await db.scalar(select(func.count(Contact.id)).where(Contact.id == contact_id))
            if not contact_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Referenced Contact '{contact_id}' does not exist.",
                )

        if company_id is not None:
            company_exists = await db.scalar(select(func.count(Company.id)).where(Company.id == company_id))
            if not company_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Referenced Company '{company_id}' does not exist.",
                )

        if user_id is not None:
            user_exists = await db.scalar(select(func.count(User.id)).where(User.id == user_id))
            if not user_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Referenced User '{user_id}' does not exist.",
                )

    @staticmethod
    async def get_activities(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        type_filter: Optional[str] = None,
        is_completed: Optional[bool] = None,
        deal_id: Optional[uuid.UUID] = None,
        contact_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        current_user: Optional[User] = None,
    ) -> Tuple[List[Activity], int]:
        """Fetch a paginated list of activities with filtering by type, status, and account isolation."""
        base_query = select(Activity)

        if current_user:
            if getattr(current_user, "company_name", None):
                base_query = base_query.where(Activity.company_name == current_user.company_name)
            elif getattr(current_user, "role", "agent") != "admin":
                base_query = base_query.where(Activity.user_id == current_user.id)

        if search and search.strip():
            term = f"%{search.strip()}%"
            base_query = base_query.where(
                or_(
                    Activity.subject.ilike(term),
                    Activity.notes.ilike(term),
                )
            )

        if type_filter:
            base_query = base_query.where(Activity.type == type_filter)

        if is_completed is not None:
            base_query = base_query.where(Activity.is_completed == is_completed)

        if deal_id:
            base_query = base_query.where(Activity.deal_id == deal_id)

        if contact_id:
            base_query = base_query.where(Activity.contact_id == contact_id)

        if company_id:
            base_query = base_query.where(Activity.company_id == company_id)

        if user_id:
            base_query = base_query.where(Activity.user_id == user_id)

        # Count total matching records
        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Eager load relationships for customer interaction timeline
        stmt = (
            base_query.options(
                selectinload(Activity.deal),
                selectinload(Activity.contact),
                selectinload(Activity.company),
                selectinload(Activity.user),
            )
            .order_by(Activity.scheduled_at.desc().nulls_last(), Activity.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    @staticmethod
    async def get_activity_by_id(
        db: AsyncSession, activity_id: uuid.UUID, current_user: Optional[User] = None
    ) -> Optional[Activity]:
        """Retrieve an activity by UUID with all linked CRM records and account validation."""
        stmt = (
            select(Activity)
            .where(Activity.id == activity_id)
            .options(
                selectinload(Activity.deal),
                selectinload(Activity.contact),
                selectinload(Activity.company),
                selectinload(Activity.user),
            )
        )
        if current_user:
            if getattr(current_user, "company_name", None):
                stmt = stmt.where(Activity.company_name == current_user.company_name)
            elif getattr(current_user, "role", "agent") != "admin":
                stmt = stmt.where(Activity.user_id == current_user.id)

        result = await db.execute(stmt)
        return result.scalars().first()

    @classmethod
    async def create_activity(
        cls,
        db: AsyncSession,
        data: ActivityCreate,
        current_user: Optional[User] = None,
    ) -> Activity:
        """Record a new CRM activity (call, meeting, note, email, follow_up)."""
        user_id = data.user_id
        if current_user and (not user_id or getattr(current_user, "role", "agent") != "admin"):
            user_id = current_user.id
        elif user_id is None:
            user_id = await db.scalar(select(User.id).where(User.is_active == True).limit(1))

        await cls._validate_foreign_keys(
            db,
            deal_id=data.deal_id,
            contact_id=data.contact_id,
            company_id=data.company_id,
            user_id=user_id,
        )

        company_name = getattr(current_user, "company_name", None) if current_user else None
        activity = Activity(
            type=data.type or "note",
            subject=data.subject,
            notes=data.notes,
            scheduled_at=data.scheduled_at,
            is_completed=data.is_completed,
            deal_id=data.deal_id,
            contact_id=data.contact_id,
            company_id=data.company_id,
            user_id=user_id,
            company_name=company_name,
            custom_fields=data.custom_fields or {},
        )

        db.add(activity)
        await db.commit()
        await db.refresh(activity)
        return await cls.get_activity_by_id(db, activity.id)  # type: ignore

    @classmethod
    async def update_activity(cls, db: AsyncSession, activity_id: uuid.UUID, data: ActivityUpdate) -> Activity:
        """Update an activity (notes, completion status, scheduled date)."""
        activity = await cls.get_activity_by_id(db, activity_id)
        if not activity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Activity '{activity_id}' not found.",
            )

        update_dict = data.model_dump(exclude_unset=True)

        await cls._validate_foreign_keys(
            db,
            deal_id=update_dict.get("deal_id"),
            contact_id=update_dict.get("contact_id"),
            company_id=update_dict.get("company_id"),
            user_id=update_dict.get("user_id"),
        )

        for key, value in update_dict.items():
            setattr(activity, key, value)

        activity.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(activity)
        return await cls.get_activity_by_id(db, activity.id)  # type: ignore

    @classmethod
    async def delete_activity(cls, db: AsyncSession, activity_id: uuid.UUID) -> bool:
        """Delete an activity."""
        activity = await cls.get_activity_by_id(db, activity_id)
        if not activity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Activity '{activity_id}' not found.",
            )

        await db.delete(activity)
        await db.commit()
        return True
