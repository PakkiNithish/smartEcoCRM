from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_active_user, get_db
from backend.app.models.user import User
from backend.app.schemas.report import ReportResponse
from backend.app.services.report_service import ReportService

router = APIRouter()


@router.get(
    "/efficiency",
    response_model=ReportResponse,
    summary="Generate user efficiency & performance report",
)
async def get_user_efficiency_report(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    user_id: Optional[uuid.UUID] = Query(None, description="Target user ID (admin only)"),
    stage: Optional[List[str]] = Query(None, description="Stage or status filter (supports multiple or comma-separated)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Generate live user performance metrics, task efficiency, and customer interaction statistics."""
    return await ReportService.get_efficiency_report(
        db=db,
        current_user=current_user,
        target_user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        stage=stage,
    )


@router.get(
    "/export",
    summary="Export user efficiency report as CSV",
)
async def export_efficiency_report(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    user_id: Optional[uuid.UUID] = Query(None, description="Target user ID (admin only)"),
    stage: Optional[List[str]] = Query(None, description="Stage or status filter (supports multiple or comma-separated)"),
    format: str = Query("csv", description="Export format (csv)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Download performance report in CSV format."""
    csv_content = await ReportService.export_csv(
        db=db,
        current_user=current_user,
        target_user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        stage=stage,
    )

    filename = f"crm_efficiency_report_{start_date or 'from'}_to_{end_date or 'today'}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )
