from fastapi import APIRouter, Depends
from backend.app.api.deps import get_current_active_user
from backend.app.api.v1.endpoints import (
    activities,
    admin_users,
    auth,
    companies,
    contacts,
    dashboard,
    deals,
    form_configs,
    health,
    lookups,
    pipeline_stages,
    reports,
    tasks,
)

api_router = APIRouter()

# Public endpoints
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Protected endpoints requiring active authenticated session
protected_deps = [Depends(get_current_active_user)]

api_router.include_router(
    deals.router,
    prefix="/deals",
    tags=["Deals"],
    dependencies=protected_deps,
)
api_router.include_router(
    pipeline_stages.router,
    prefix="/pipeline-stages",
    tags=["Pipeline Stages"],
    dependencies=protected_deps,
)
api_router.include_router(
    contacts.router,
    prefix="/contacts",
    tags=["Contacts"],
    dependencies=protected_deps,
)
api_router.include_router(
    companies.router,
    prefix="/companies",
    tags=["Companies"],
    dependencies=protected_deps,
)
api_router.include_router(
    tasks.router,
    prefix="/tasks",
    tags=["Tasks"],
    dependencies=protected_deps,
)
api_router.include_router(
    activities.router,
    prefix="/activities",
    tags=["Activities"],
    dependencies=protected_deps,
)
api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=protected_deps,
)
api_router.include_router(
    lookups.router,
    tags=["Lookups"],
    dependencies=protected_deps,
)
api_router.include_router(
    admin_users.router,
    prefix="/admin",
    tags=["Admin"],
    dependencies=protected_deps,
)
api_router.include_router(
    form_configs.router,
    prefix="/forms",
    tags=["Form Configuration"],
    dependencies=protected_deps,
)
api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["Reports"],
    dependencies=protected_deps,
)

