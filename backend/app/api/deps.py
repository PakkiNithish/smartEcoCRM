from datetime import datetime, timezone
from typing import List, Optional, Union
import uuid
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.security import decode_access_token
from backend.app.db.session import get_db
from backend.app.models.user import User

# Optional HTTPBearer scheme so Swagger UI shows Authorize button
security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate authenticated user session from Bearer token or HttpOnly cookie.
    Rejects unauthenticated requests with HTTP 401.
    """
    token: Optional[str] = None

    # 1. Check Authorization Bearer header
    if auth_header and auth_header.credentials:
        token = auth_header.credentials
    # 2. Check HttpOnly access_token cookie
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Throttled refresh of last_active_at (at most once every 60 seconds)
    now = datetime.now(timezone.utc)
    last_active = user.last_active_at
    if last_active and last_active.tzinfo is None:
        last_active = last_active.replace(tzinfo=timezone.utc)
    if not last_active or (now - last_active).total_seconds() > 60:
        user.last_active_at = now
        await db.commit()
        await db.refresh(user)

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Enforces that authenticated user is active."""
    return current_user


def require_role(*roles: Union[str, List[str]]):
    """Enforce role-based access control (RBAC). Rejects unauthorized roles with HTTP 403."""
    flat_roles = []
    for r in roles:
        if isinstance(r, (list, tuple)):
            flat_roles.extend(r)
        else:
            flat_roles.append(r)

    async def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.role not in flat_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {', '.join(flat_roles)}",
            )
        return current_user

    return role_checker


async def get_current_user_optional(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Optional user resolution for non-critical contexts.
    Does NOT fall back to arbitrary user IDs or hardcoded agents.
    """
    try:
        return await get_current_user(request=request, auth_header=auth_header, db=db)
    except HTTPException:
        return None


__all__ = [
    "get_db",
    "get_current_user",
    "get_current_active_user",
    "require_role",
    "get_current_user_optional",
]
