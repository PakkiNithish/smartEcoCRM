from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.user import UserMinimalResponse

router = APIRouter()


@router.get("/users", response_model=List[UserMinimalResponse], tags=["Lookups"])
async def list_users(db: AsyncSession = Depends(get_db)):
    """List active responsible users/agents for Deal and Task assignment."""
    stmt = select(User).where(User.is_active == True).order_by(User.full_name.asc())  # noqa: E712
    result = await db.execute(stmt)
    return list(result.scalars().all())
