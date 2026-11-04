from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint to verify API and database connectivity."""
    db_status = "connected"
    http_status = status.HTTP_200_OK

    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {type(exc).__name__}"
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE

    payload = {
        "status": "healthy" if http_status == status.HTTP_200_OK else "degraded",
        "database": db_status,
        "version": "0.1.0",
        "environment": settings.ENVIRONMENT,
    }

    return JSONResponse(status_code=http_status, content=payload)
