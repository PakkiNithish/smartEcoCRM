import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.company import Company
from backend.app.models.contact import Contact
from backend.app.models.deal import Deal
from backend.app.models.task import Task
from backend.app.models.user import User
from backend.app.schemas.task import TaskCreate, TaskUpdate


class TaskService:
    @staticmethod
    async def _validate_foreign_keys(
        db: AsyncSession,
        deal_id: Optional[uuid.UUID] = None,
        contact_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
        assigned_to_id: Optional[uuid.UUID] = None,
        created_by_id: Optional[uuid.UUID] = None,
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

        if assigned_to_id is not None:
            user_exists = await db.scalar(select(func.count(User.id)).where(User.id == assigned_to_id))
            if not user_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Referenced User (assigned_to) '{assigned_to_id}' does not exist.",
                )

        if created_by_id is not None:
            creator_exists = await db.scalar(select(func.count(User.id)).where(User.id == created_by_id))
            if not creator_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Referenced User (created_by) '{created_by_id}' does not exist.",
                )

    @staticmethod
    async def get_tasks(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        priority_filter: Optional[str] = None,
        assigned_to_id: Optional[uuid.UUID] = None,
        deal_id: Optional[uuid.UUID] = None,
        contact_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
        current_user: Optional[User] = None,
    ) -> Tuple[List[Task], int]:
        """Fetch a paginated list of tasks with flexible filtering, search, and account isolation."""
        base_query = select(Task)

        if current_user:
            if getattr(current_user, "company_name", None):
                base_query = base_query.where(Task.company_name == current_user.company_name)
            elif getattr(current_user, "role", "agent") != "admin":
                base_query = base_query.where(
                    or_(
                        Task.assigned_to_id == current_user.id,
                        Task.created_by_id == current_user.id,
                    )
                )

        if search and search.strip():
            term = f"%{search.strip()}%"
            base_query = base_query.where(
                or_(
                    Task.title.ilike(term),
                    Task.description.ilike(term),
                )
            )

        if status_filter:
            base_query = base_query.where(Task.status == status_filter)

        if priority_filter:
            base_query = base_query.where(Task.priority == priority_filter)

        if assigned_to_id:
            base_query = base_query.where(Task.assigned_to_id == assigned_to_id)

        if deal_id:
            base_query = base_query.where(Task.deal_id == deal_id)

        if contact_id:
            base_query = base_query.where(Task.contact_id == contact_id)

        if company_id:
            base_query = base_query.where(Task.company_id == company_id)

        # Count total matching records
        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Eager load relationships for complete workflow display
        stmt = (
            base_query.options(
                selectinload(Task.deal),
                selectinload(Task.contact),
                selectinload(Task.company),
                selectinload(Task.assigned_to),
                selectinload(Task.created_by),
            )
            .order_by(Task.due_date.asc().nulls_last(), Task.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    @staticmethod
    async def get_task_by_id(
        db: AsyncSession, task_id: uuid.UUID, current_user: Optional[User] = None
    ) -> Optional[Task]:
        """Retrieve a task by UUID with all related CRM entities and account validation."""
        stmt = (
            select(Task)
            .where(Task.id == task_id)
            .options(
                selectinload(Task.deal),
                selectinload(Task.contact),
                selectinload(Task.company),
                selectinload(Task.assigned_to),
                selectinload(Task.created_by),
            )
        )
        if current_user:
            if getattr(current_user, "company_name", None):
                stmt = stmt.where(Task.company_name == current_user.company_name)
            elif getattr(current_user, "role", "agent") != "admin":
                stmt = stmt.where(
                    or_(
                        Task.assigned_to_id == current_user.id,
                        Task.created_by_id == current_user.id,
                    )
                )
        result = await db.execute(stmt)
        return result.scalars().first()

    @classmethod
    async def create_task(
        cls,
        db: AsyncSession,
        data: TaskCreate,
        current_user: Optional[User] = None,
    ) -> Task:
        """Create a new CRM task with full relationship validation."""
        assigned_to_id = data.assigned_to_id
        if assigned_to_id is None and current_user and current_user.id:
            assigned_to_id = current_user.id

        created_by_id = data.created_by_id
        if created_by_id is None:
            if current_user and current_user.id:
                created_by_id = current_user.id
            else:
                created_by_id = assigned_to_id or await db.scalar(select(User.id).where(User.is_active == True).limit(1))

        await cls._validate_foreign_keys(
            db,
            deal_id=data.deal_id,
            contact_id=data.contact_id,
            company_id=data.company_id,
            assigned_to_id=assigned_to_id,
            created_by_id=created_by_id,
        )

        company_name = data.company_name or (getattr(current_user, "company_name", None) if current_user else None)
        task = Task(
            title=data.title,
            description=data.description,
            status=data.status or "pending",
            priority=data.priority or "medium",
            due_date=data.due_date,
            deal_id=data.deal_id,
            contact_id=data.contact_id,
            company_id=data.company_id,
            assigned_to_id=assigned_to_id,
            created_by_id=created_by_id,
            company_name=company_name,
            custom_fields=data.custom_fields or {},
        )

        db.add(task)
        await db.commit()
        await db.refresh(task)
        return await cls.get_task_by_id(db, task.id)  # type: ignore

    @classmethod
    async def update_task(cls, db: AsyncSession, task_id: uuid.UUID, data: TaskUpdate) -> Task:
        """Update an existing task."""
        task = await cls.get_task_by_id(db, task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task '{task_id}' not found.",
            )

        update_dict = data.model_dump(exclude_unset=True)

        # Validate any updated foreign keys
        await cls._validate_foreign_keys(
            db,
            deal_id=update_dict.get("deal_id"),
            contact_id=update_dict.get("contact_id"),
            company_id=update_dict.get("company_id"),
            assigned_to_id=update_dict.get("assigned_to_id"),
        )

        for key, value in update_dict.items():
            setattr(task, key, value)

        task.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(task)
        return await cls.get_task_by_id(db, task.id)  # type: ignore

    @classmethod
    async def delete_task(cls, db: AsyncSession, task_id: uuid.UUID) -> bool:
        """Delete a task."""
        task = await cls.get_task_by_id(db, task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task '{task_id}' not found.",
            )

        await db.delete(task)
        await db.commit()
        return True
