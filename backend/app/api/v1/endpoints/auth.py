from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_active_user, get_db, require_role
from backend.app.core.config import settings
from backend.app.core.limiter import limiter
from backend.app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from backend.app.models.user import User
from backend.app.schemas.auth import (
    LoginRequest,
    LogoutResponse,
    RegisterRequest,
    TokenResponse,
    UserCreateRequest,
    UserProfileUpdateRequest,
    UserResponse,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account and log in immediately",
)
@limiter.limit("10/minute")
async def register(
    request: Request,
    register_data: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user account with email, full name, and password.
    Returns signed JWT and sets HttpOnly session cookie.
    Public registration strictly assigns normal account role ('agent') without admin privileges.
    """
    clean_email = register_data.email.lower().strip()
    existing = await db.scalar(select(User).where(User.email == clean_email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    company = register_data.company_name.strip() if register_data.company_name else None
    # Initial setup: The very first user created in a fresh deployment is assigned admin role
    total_users = await db.scalar(select(func.count(User.id)))
    role = "admin" if (total_users or 0) == 0 else "agent"

    now = datetime.now(timezone.utc)
    new_user = User(
        email=clean_email,
        full_name=register_data.full_name.strip(),
        hashed_password=get_password_hash(register_data.password),
        role=role,
        company_name=company,
        is_active=True,
        last_active_at=now,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    access_token = create_access_token(subject=new_user.id, role=new_user.role)

    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    is_production = settings.ENVIRONMENT.lower() == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=is_production,
        max_age=max_age,
        path="/",
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and return JWT access token",
)
@limiter.limit("15/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user with email and password.
    Returns signed JWT and sets HttpOnly session cookie.
    """
    stmt = select(User).where(User.email == login_data.email.lower().strip())
    user = await db.scalar(stmt)

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive. Please contact an administrator.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Seamlessly upgrade legacy plaintext passwords to bcrypt hash on valid login
    if user.hashed_password == "demo":
        user.hashed_password = get_password_hash("demo")

    # Update date last active on successful authentication
    user.last_active_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(subject=user.id, role=user.role)

    # Set secure HttpOnly cookie for web browser sessions
    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    is_production = settings.ENVIRONMENT.lower() == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=is_production,
        max_age=max_age,
        path="/",
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Clear authenticated session and cookies",
)
async def logout(response: Response):
    """Clear session authentication cookie."""
    response.delete_cookie(key="access_token", path="/")
    return LogoutResponse(message="Successfully logged out")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve profile and role information for currently authenticated user."""
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current authenticated user profile",
)
async def update_current_user_profile(
    profile_data: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update profile fields (full name, email, company name, password) for the current user."""
    if profile_data.full_name is not None:
        name = profile_data.full_name.strip()
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name cannot be blank.",
            )
        current_user.full_name = name

    if profile_data.email is not None:
        clean_email = profile_data.email.lower().strip()
        if clean_email != current_user.email:
            existing = await db.scalar(
                select(User).where(User.email == clean_email, User.id != current_user.id)
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with this email address already exists.",
                )
            current_user.email = clean_email

    if profile_data.company_name is not None and current_user.role == "admin":
        new_company = profile_data.company_name.strip()
        if new_company:
            current_user.company_name = new_company

    if profile_data.new_password:
        if not profile_data.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to set a new password.",
            )
        if not verify_password(profile_data.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect.",
            )
        current_user.hashed_password = get_password_hash(profile_data.new_password)

    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin"))],
    summary="Create new CRM user (Admin only)",
)
async def create_user_admin(
    user_in: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new CRM user. Requires admin role."""
    existing = await db.scalar(
        select(User).where(User.email == user_in.email.lower().strip())
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    new_user = User(
        email=user_in.email.lower().strip(),
        full_name=user_in.full_name.strip(),
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return UserResponse.model_validate(new_user)

