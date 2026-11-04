import uuid
from typing import List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from backend.app.models.company import Company
from backend.app.models.contact import Contact
from backend.app.models.deal import Deal
from backend.app.models.pipeline_stage import PipelineStage
from backend.app.models.user import User
from backend.app.schemas.deal import DealCreate, DealUpdate


class DealService:
    @staticmethod
    async def get_pipeline_stages(db: AsyncSession) -> List[PipelineStage]:
        """Fetch all pipeline stages ordered by their progression sequence."""
        stmt = select(PipelineStage).order_by(PipelineStage.order.asc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_deals(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        stage_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
        contact_id: Optional[uuid.UUID] = None,
        current_user: Optional[User] = None,
    ) -> Tuple[List[Deal], int]:
        """Fetch a paginated list of deals with optional search, stage filtering, company/contact filter, and account isolation."""
        base_query = select(Deal)

        if current_user:
            if getattr(current_user, "company_name", None):
                base_query = base_query.where(Deal.company_name == current_user.company_name)
            elif getattr(current_user, "role", "agent") != "admin":
                base_query = base_query.where(Deal.responsible_user_id == current_user.id)

        if stage_id:
            base_query = base_query.where(Deal.stage_id == stage_id)

        if company_id:
            base_query = base_query.where(Deal.company_id == company_id)

        if contact_id:
            base_query = base_query.where(Deal.contact_id == contact_id)

        if search and search.strip():
            term = f"%{search.strip()}%"
            base_query = base_query.where(
                or_(
                    Deal.title.ilike(term),
                    Deal.description.ilike(term),
                )
            )

        # Count total matching records
        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Execute paginated query with relationship eager loading
        stmt = (
            base_query.options(
                selectinload(Deal.stage),
                selectinload(Deal.contact),
                selectinload(Deal.company),
                selectinload(Deal.responsible_user),
            )
            .order_by(Deal.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    @staticmethod
    async def get_deal_by_id(
        db: AsyncSession, deal_id: uuid.UUID, current_user: Optional[User] = None
    ) -> Optional[Deal]:
        """Fetch a single deal by its ID with all relationships eagerly loaded and account validation."""
        stmt = (
            select(Deal)
            .where(Deal.id == deal_id)
            .options(
                selectinload(Deal.stage),
                selectinload(Deal.contact),
                selectinload(Deal.company),
                selectinload(Deal.responsible_user),
            )
        )
        if current_user:
            if getattr(current_user, "company_name", None):
                stmt = stmt.where(Deal.company_name == current_user.company_name)
            elif getattr(current_user, "role", "agent") != "admin":
                stmt = stmt.where(Deal.responsible_user_id == current_user.id)

        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_deal(
        db: AsyncSession, deal_in: DealCreate, current_user: Optional[User] = None
    ) -> Deal:
        """Create a new deal after validating foreign keys and assigning responsible user."""
        # 1. Validate or default PipelineStage
        if not deal_in.stage_id:
            first_stage_stmt = select(PipelineStage).order_by(PipelineStage.order.asc())
            first_stage_res = await db.execute(first_stage_stmt)
            first_stage = first_stage_res.scalars().first()
            if first_stage:
                deal_in.stage_id = first_stage.id
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No pipeline stages available. Please configure a pipeline stage first.",
                )

        stage_stmt = select(PipelineStage).where(PipelineStage.id == deal_in.stage_id)
        stage_res = await db.execute(stage_stmt)
        if not stage_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Pipeline stage with ID '{deal_in.stage_id}' does not exist",
            )

        # 2. Validate Contact if supplied
        if deal_in.contact_id:
            contact_stmt = select(Contact).where(Contact.id == deal_in.contact_id)
            contact_res = await db.execute(contact_stmt)
            if not contact_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Contact with ID '{deal_in.contact_id}' does not exist",
                )

        # 3. Validate Company if supplied
        if deal_in.company_id:
            company_stmt = select(Company).where(Company.id == deal_in.company_id)
            company_res = await db.execute(company_stmt)
            if not company_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Company with ID '{deal_in.company_id}' does not exist",
                )

        # 4. Validate Responsible User if supplied
        if deal_in.responsible_user_id:
            user_stmt = select(User).where(User.id == deal_in.responsible_user_id)
            user_res = await db.execute(user_stmt)
            if not user_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User with ID '{deal_in.responsible_user_id}' does not exist",
                )

        # 5. Persist the deal
        deal_data = deal_in.model_dump()
        if current_user:
            if not deal_data.get("company_name") and getattr(current_user, "company_name", None):
                deal_data["company_name"] = current_user.company_name
            if not deal_data.get("responsible_user_id") or getattr(current_user, "role", "agent") != "admin":
                deal_data["responsible_user_id"] = current_user.id

        new_deal = Deal(**deal_data)
        db.add(new_deal)
        await db.flush()
        deal_id = new_deal.id

        # Re-fetch with loaded relations
        created = await DealService.get_deal_by_id(db, deal_id)
        if not created:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created deal",
            )
        return created

    @staticmethod
    async def update_deal(db: AsyncSession, deal: Deal, deal_in: DealUpdate) -> Deal:
        """Partially update an existing deal."""
        deal_id = deal.id
        update_data = deal_in.model_dump(exclude_unset=True)

        if "stage_id" in update_data:
            if update_data["stage_id"] is not None:
                stage_stmt = select(PipelineStage).where(PipelineStage.id == update_data["stage_id"])
                stage_res = await db.execute(stage_stmt)
                stage_obj = stage_res.scalar_one_or_none()
                if not stage_obj:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Pipeline stage with ID '{update_data['stage_id']}' does not exist",
                    )
                deal.stage = stage_obj
                deal.stage_id = update_data["stage_id"]
            update_data.pop("stage_id", None)

        if "contact_id" in update_data:
            if update_data["contact_id"] is not None:
                contact_stmt = select(Contact).where(Contact.id == update_data["contact_id"])
                contact_res = await db.execute(contact_stmt)
                contact_obj = contact_res.scalar_one_or_none()
                if not contact_obj:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Contact with ID '{update_data['contact_id']}' does not exist",
                    )
                deal.contact = contact_obj
                deal.contact_id = update_data["contact_id"]
            else:
                deal.contact = None
                deal.contact_id = None
            update_data.pop("contact_id", None)

        if "company_id" in update_data:
            if update_data["company_id"] is not None:
                company_stmt = select(Company).where(Company.id == update_data["company_id"])
                company_res = await db.execute(company_stmt)
                company_obj = company_res.scalar_one_or_none()
                if not company_obj:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Company with ID '{update_data['company_id']}' does not exist",
                    )
                deal.company = company_obj
                deal.company_id = update_data["company_id"]
            else:
                deal.company = None
                deal.company_id = None
            update_data.pop("company_id", None)

        if "responsible_user_id" in update_data:
            if update_data["responsible_user_id"] is not None:
                user_stmt = select(User).where(User.id == update_data["responsible_user_id"])
                user_res = await db.execute(user_stmt)
                user_obj = user_res.scalar_one_or_none()
                if not user_obj:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"User with ID '{update_data['responsible_user_id']}' does not exist",
                    )
                deal.responsible_user = user_obj
                deal.responsible_user_id = update_data["responsible_user_id"]
            else:
                deal.responsible_user = None
                deal.responsible_user_id = None
            update_data.pop("responsible_user_id", None)

        for field, value in update_data.items():
            setattr(deal, field, value)

        await db.flush()
        updated = await DealService.get_deal_by_id(db, deal_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated deal",
            )
        return updated

    @staticmethod
    async def delete_deal(db: AsyncSession, deal: Deal) -> None:
        """Delete a deal."""
        await db.delete(deal)
        await db.flush()
