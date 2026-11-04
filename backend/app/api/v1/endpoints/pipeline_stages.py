from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.schemas.pipeline_stage import PipelineStageResponse
from backend.app.services.deal_service import DealService

router = APIRouter()


@router.get(
    "",
    response_model=List[PipelineStageResponse],
    status_code=status.HTTP_200_OK,
    summary="List pipeline stages",
    description="Retrieve all configured CRM pipeline stages ordered by display sequence.",
)
async def list_pipeline_stages(
    db: AsyncSession = Depends(get_db),
):
    return await DealService.get_pipeline_stages(db)
