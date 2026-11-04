import uuid
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.duplicate_detection import check_company_duplicate, extract_domain
from backend.app.models.company import Company
from backend.app.models.user import User
from backend.app.schemas.company import CompanyCreate, CompanyUpdate


class CompanyService:
    @staticmethod
    async def get_companies(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        sort_field: Optional[str] = "created_at",
        sort_order: Optional[str] = "desc",
        current_user: Optional[User] = None,
    ) -> Tuple[List[Company], int]:
        """Fetch a paginated list of companies with optional keyword search, sorting, and account isolation."""
        base_query = select(Company)

        if current_user:
            if getattr(current_user, "company_name", None):
                base_query = base_query.where(Company.company_name == current_user.company_name)
            elif getattr(current_user, "role", "agent") != "admin":
                base_query = base_query.where(Company.user_id == current_user.id)

        if search and search.strip():
            term = f"%{search.strip()}%"
            base_query = base_query.where(
                or_(
                    Company.name.ilike(term),
                    Company.industry.ilike(term),
                    Company.email.ilike(term),
                    Company.phone.ilike(term),
                    Company.website.ilike(term),
                    Company.stage.ilike(term),
                )
            )

        # Count total matching
        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Determine sort column
        allowed_sorts = {
            "created_at": Company.created_at,
            "name": Company.name,
            "industry": Company.industry,
            "email": Company.email,
            "phone": Company.phone,
            "website": Company.website,
            "stage": Company.stage,
        }
        col = allowed_sorts.get(sort_field or "created_at", Company.created_at)
        order_clause = col.asc() if (sort_order or "").lower() == "asc" else col.desc()

        # Eager load contacts, user, deals, and activities
        stmt = (
            base_query.options(
                selectinload(Company.contacts),
                selectinload(Company.user),
                selectinload(Company.deals),
                selectinload(Company.activities),
            )
            .order_by(order_clause)
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    @staticmethod
    async def get_company_by_id(
        db: AsyncSession, company_id: uuid.UUID, current_user: Optional[User] = None
    ) -> Optional[Company]:
        """Fetch a single company by UUID with all contacts, user, deals, and activities eagerly loaded and account validation."""
        stmt = (
            select(Company)
            .where(Company.id == company_id)
            .options(
                selectinload(Company.contacts),
                selectinload(Company.user),
                selectinload(Company.deals),
                selectinload(Company.activities),
            )
        )
        if current_user:
            if getattr(current_user, "company_name", None):
                stmt = stmt.where(Company.company_name == current_user.company_name)
            elif getattr(current_user, "role", "agent") != "admin":
                stmt = stmt.where(Company.user_id == current_user.id)

        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_company(
        db: AsyncSession, company_in: CompanyCreate, current_user: Optional[User] = None
    ) -> Company:
        """Create a new company account with user ownership after validating domain duplicate detection."""
        company_data = company_in.model_dump()
        workspace = None
        user_id = None
        is_admin = False

        if current_user:
            workspace = getattr(current_user, "company_name", None)
            user_id = current_user.id
            is_admin = getattr(current_user, "role", "agent") == "admin"

            if not company_data.get("company_name") and workspace:
                company_data["company_name"] = workspace
            if not company_data.get("user_id") or not is_admin:
                company_data["user_id"] = user_id

        target_workspace = company_data.get("company_name") or workspace

        # Duplicate detection based on website domain
        if company_in.website:
            await check_company_duplicate(
                db=db,
                website=company_in.website,
                workspace=target_workspace,
                user_id=user_id,
                is_admin=is_admin,
            )

        new_company = Company(**company_data)
        db.add(new_company)
        await db.flush()

        created = await CompanyService.get_company_by_id(db, new_company.id)
        if not created:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created company",
            )
        return created

    @staticmethod
    async def update_company(
        db: AsyncSession, company: Company, company_in: CompanyUpdate, current_user: Optional[User] = None
    ) -> Company:
        """Partially update an existing company after validating domain duplicate detection if website modified."""
        company_id = company.id
        update_data = company_in.model_dump(exclude_unset=True)

        # Check domain duplicate if website is changed
        if "website" in update_data and update_data["website"]:
            new_domain = extract_domain(update_data["website"])
            existing_domain = extract_domain(company.website)
            if new_domain != existing_domain:
                workspace = company.company_name or (getattr(current_user, "company_name", None) if current_user else None)
                user_id = current_user.id if current_user else company.user_id
                is_admin = getattr(current_user, "role", "agent") == "admin" if current_user else False

                await check_company_duplicate(
                    db=db,
                    website=update_data["website"],
                    exclude_id=company_id,
                    workspace=workspace,
                    user_id=user_id,
                    is_admin=is_admin,
                )

        for field, value in update_data.items():
            setattr(company, field, value)

        await db.flush()
        updated = await CompanyService.get_company_by_id(db, company_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated company",
            )
        return updated

    @staticmethod
    async def delete_company(db: AsyncSession, company: Company) -> None:
        """Safely delete a company. Prevents deletion if related contacts or deals exist."""
        # Check for related contacts or deals
        contact_count = len(company.contacts) if company.contacts else 0
        deal_count = len(company.deals) if company.deals else 0

        if contact_count > 0 or deal_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot delete company '{company.name}' because it has "
                    f"{contact_count} associated contact(s) and {deal_count} associated deal(s). "
                    "Please reassign or delete the associated records first."
                ),
            )

        await db.delete(company)
        await db.flush()
