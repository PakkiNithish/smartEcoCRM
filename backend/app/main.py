from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.app.api.v1.api import api_router
from backend.app.api.v1.endpoints.health import router as health_router
from backend.app.core.config import settings
from backend.app.core.limiter import limiter
from backend.app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and graceful shutdown."""
    # Ensure any missing SQLite columns are present in development
    if "sqlite" in settings.async_database_url.lower():
        try:
            async with engine.begin() as conn:
                res = await conn.exec_driver_sql("PRAGMA table_info(activities)")
                columns = [row[1] for row in res.fetchall()]
                if columns and "custom_fields" not in columns:
                    await conn.exec_driver_sql("ALTER TABLE activities ADD COLUMN custom_fields JSON")
        except Exception:
            pass

    yield
    # Dispose of engine connection pool on shutdown
    await engine.dispose()


is_production = settings.ENVIRONMENT.lower() == "production"

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="smartEco CRM Backend API (Simple CRM Mode)",
    version="0.1.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Connect SlowAPI rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# CORS Middleware - allows all HTTP and HTTPS origins with credentials so CORS never blocks
cors_origins = [str(origin).rstrip("/") for origin in (settings.BACKEND_CORS_ORIGINS or [])]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=settings.BACKEND_CORS_ORIGIN_REGEX or r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root health endpoint at /api/health
app.include_router(health_router, prefix="/api")

# API v1 endpoints mounted at /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": None if is_production else "/docs",
        "health": "/api/health",
        "version": "0.1.0",
    }
