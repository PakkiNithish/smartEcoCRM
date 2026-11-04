from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field


class LoginRequest(BaseModel):
    """Schema for user login credentials."""
    email: EmailStr = Field(..., description="User account email address")
    password: str = Field(..., min_length=1, description="Account password")


class UserResponse(BaseModel):
    """Schema for user profile responses."""
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    company_name: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None

    @computed_field
    @property
    def dateLastActive(self) -> Optional[datetime]:
        """Alias for last_active_at matching frontend dateLastActive column."""
        return self.last_active_at

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdateRequest(BaseModel):
    """Schema for user updating their own profile details."""
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255, description="Full name")
    email: Optional[EmailStr] = Field(default=None, description="Email address")
    company_name: Optional[str] = Field(default=None, max_length=255, description="Company workspace name")
    current_password: Optional[str] = Field(default=None, min_length=1, description="Current password for verification")
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=128, description="New password")


class TokenResponse(BaseModel):
    """Schema for authenticated session response with JWT access token."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LogoutResponse(BaseModel):
    """Schema for logout confirmation response."""
    message: str


class UserCreateRequest(BaseModel):
    """Schema for admin creating new user."""
    email: EmailStr = Field(..., description="Email address for user")
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=128, description="Initial password (min 8 chars)")
    role: str = Field(default="agent", description="User role: agent, manager, admin")
    company_name: Optional[str] = Field(default=None, max_length=255, description="Company name")


class AdminUserUpdateRequest(BaseModel):
    """Schema for admin updating an existing company user."""
    role: Optional[str] = Field(default=None, description="Updated role: agent, manager, admin")
    is_active: Optional[bool] = Field(default=None, description="Active status")
    password: Optional[str] = Field(default=None, min_length=8, max_length=128, description="New password if resetting")


class RegisterRequest(BaseModel):
    """Schema for public user self-registration."""
    email: EmailStr = Field(..., description="User email address")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name")
    password: str = Field(..., min_length=8, max_length=128, description="Account password (min 8 chars)")
    company_name: Optional[str] = Field(default=None, max_length=255, description="Company name")



