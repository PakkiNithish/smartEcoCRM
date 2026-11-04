import uuid
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.duplicate_detection import check_contact_duplicate
from backend.app.models.company import Company
from backend.app.models.contact import Contact
from backend.app.models.user import User
from backend.app.schemas.contact import ContactCreate, ContactUpdate


class ContactService:
    @staticmethod
    async def get_contacts(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        company_id: Optional[uuid.UUID] = None,
        sort_field: Optional[str] = "created_at",
        sort_order: Optional[str] = "desc",
        current_user: Optional[User] = None,
    ) -> Tuple[List[Contact], int]:
        """Fetch a paginated list of contacts with optional search, company filtering, sorting, and account isolation."""
        base_query = select(Contact)

        if current_user:
            if getattr(current_user, "company_name", None):
                base_query = base_query.where(Contact.company_name == current_user.company_name)
            elif getattr(current_user, "role", "agent") != "admin":
                base_query = base_query.where(Contact.user_id == current_user.id)

        if company_id:
            base_query = base_query.where(Contact.company_id == company_id)

        if search and search.strip():
            term = f"%{search.strip()}%"
            base_query = base_query.where(
                or_(
                    Contact.first_name.ilike(term),
                    Contact.last_name.ilike(term),
                    Contact.email.ilike(term),
                    Contact.phone.ilike(term),
                    Contact.job_title.ilike(term),
                    Contact.stage.ilike(term),
                )
            )

        # Count total matching
        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Determine sort column
        allowed_sorts = {
            "created_at": Contact.created_at,
            "first_name": Contact.first_name,
            "last_name": Contact.last_name,
            "email": Contact.email,
            "phone": Contact.phone,
            "job_title": Contact.job_title,
            "stage": Contact.stage,
        }
        col = allowed_sorts.get(sort_field or "created_at", Contact.created_at)
        order_clause = col.asc() if (sort_order or "").lower() == "asc" else col.desc()

        # Eager load company, user, deals, and activities
        stmt = (
            base_query.options(
                selectinload(Contact.company),
                selectinload(Contact.user),
                selectinload(Contact.deals),
                selectinload(Contact.activities),
            )
            .order_by(order_clause)
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    @staticmethod
    async def get_contact_by_id(
        db: AsyncSession, contact_id: uuid.UUID, current_user: Optional[User] = None
    ) -> Optional[Contact]:
        """Fetch a single contact by UUID with company, user, deals, and activities eagerly loaded and account validation."""
        stmt = (
            select(Contact)
            .where(Contact.id == contact_id)
            .options(
                selectinload(Contact.company),
                selectinload(Contact.user),
                selectinload(Contact.deals),
                selectinload(Contact.activities),
            )
        )
        if current_user:
            if getattr(current_user, "company_name", None):
                stmt = stmt.where(Contact.company_name == current_user.company_name)
            elif getattr(current_user, "role", "agent") != "admin":
                stmt = stmt.where(Contact.user_id == current_user.id)

        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_contact(
        db: AsyncSession, contact_in: ContactCreate, current_user: Optional[User] = None
    ) -> Contact:
        """Create a new contact after validating company existence, verifying duplicate detection, and assigning owner."""
        if contact_in.company_id:
            company_stmt = select(Company).where(Company.id == contact_in.company_id)
            company_res = await db.execute(company_stmt)
            if not company_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Company with ID '{contact_in.company_id}' does not exist",
                )

        contact_data = contact_in.model_dump()
        workspace = None
        user_id = None
        is_admin = False

        if current_user:
            workspace = getattr(current_user, "company_name", None)
            user_id = current_user.id
            is_admin = getattr(current_user, "role", "agent") == "admin"

            if not contact_data.get("company_name") and workspace:
                contact_data["company_name"] = workspace
            if not contact_data.get("user_id") or not is_admin:
                contact_data["user_id"] = user_id

        target_workspace = contact_data.get("company_name") or workspace

        # Check for duplicates based on (first_name + last_name), email, and phone
        await check_contact_duplicate(
            db=db,
            first_name=contact_in.first_name,
            last_name=contact_in.last_name,
            email=contact_in.email,
            phone=contact_in.phone,
            workspace=target_workspace,
            user_id=user_id,
            is_admin=is_admin,
        )

        new_contact = Contact(**contact_data)
        db.add(new_contact)
        await db.flush()

        created = await ContactService.get_contact_by_id(db, new_contact.id)
        if not created:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created contact",
            )
        return created

    @staticmethod
    async def update_contact(
        db: AsyncSession, contact: Contact, contact_in: ContactUpdate, current_user: Optional[User] = None
    ) -> Contact:
        """Partially update an existing contact after validating duplicate detection for modified identity fields."""
        contact_id = contact.id
        update_data = contact_in.model_dump(exclude_unset=True)

        # Check if identity fields (name, email, phone) were changed
        new_fn = update_data.get("first_name", contact.first_name)
        new_ln = update_data.get("last_name", contact.last_name)
        new_em = update_data.get("email", contact.email)
        new_ph = update_data.get("phone", contact.phone)

        identity_changed = (
            ("first_name" in update_data and (new_fn or "").strip().lower() != (contact.first_name or "").strip().lower())
            or ("last_name" in update_data and (new_ln or "").strip().lower() != (contact.last_name or "").strip().lower())
            or ("email" in update_data and (new_em or "").strip().lower() != (contact.email or "").strip().lower())
            or ("phone" in update_data and (new_ph or "").strip() != (contact.phone or "").strip())
        )

        if identity_changed:
            workspace = contact.company_name or (getattr(current_user, "company_name", None) if current_user else None)
            user_id = current_user.id if current_user else contact.user_id
            is_admin = getattr(current_user, "role", "agent") == "admin" if current_user else False

            await check_contact_duplicate(
                db=db,
                first_name=new_fn,
                last_name=new_ln,
                email=new_em,
                phone=new_ph,
                exclude_id=contact_id,
                workspace=workspace,
                user_id=user_id,
                is_admin=is_admin,
            )

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
                contact.company = company_obj
                contact.company_id = update_data["company_id"]
            else:
                contact.company = None
                contact.company_id = None
                update_data.pop("company_id", None)

        for field, value in update_data.items():
            setattr(contact, field, value)

        await db.flush()
        updated = await ContactService.get_contact_by_id(db, contact_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated contact",
            )
        return updated

    @staticmethod
    async def delete_contact(db: AsyncSession, contact: Contact) -> None:
        """Delete a contact."""
        await db.delete(contact)
        await db.flush()
