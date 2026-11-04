import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field
from backend.app.schemas.user import UserMinimalResponse


class CompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Company/Account name")
    industry: Optional[str] = Field(default=None, max_length=100, description="Industry sector")
    phone: Optional[str] = Field(default=None, max_length=50, description="Main telephone number")
    email: Optional[EmailStr] = Field(default=None, description="General contact email")
    website: Optional[str] = Field(default=None, max_length=255, description="Corporate website URL")
    address: Optional[str] = Field(default=None, description="Physical/postal address")
    user_id: Optional[uuid.UUID] = Field(default=None, description="Owner user ID")
    company_name: Optional[str] = Field(default=None, description="Workspace company name")
    stage: Optional[str] = Field(default="Not Contacted", max_length=100, description="Lifecycle stage")
    custom_fields: Optional[Dict[str, Any]] = Field(default=None, description="Dynamic custom fields values")


class CompanyCreate(CompanyBase):
    """Schema for creating a new company account."""
    website: str = Field(..., min_length=1, max_length=255, description="Corporate website URL (required)")


class CompanyUpdate(BaseModel):
    """Schema for partially updating a company (PATCH)."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    industry: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[EmailStr] = None
    website: Optional[str] = Field(default=None, max_length=255)
    address: Optional[str] = None
    stage: Optional[str] = Field(default=None, max_length=100)
    user_id: Optional[uuid.UUID] = None
    company_name: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="forbid")


class CompanyMinimalResponse(BaseModel):
    """Minimal company representation for lookups and nested relations."""
    id: uuid.UUID
    name: str
    industry: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    stage: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CompanyContactSummary(BaseModel):
    """Contact summary nested inside company response."""
    id: uuid.UUID
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    model_config = ConfigDict(from_attributes=True)


class CompanyDealSummary(BaseModel):
    """Deal summary nested inside company response."""
    id: uuid.UUID
    title: str
    amount: Decimal
    currency: str

    model_config = ConfigDict(from_attributes=True)


class CompanyResponse(CompanyBase):
    """Full company representation including relationship details and timestamps."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    contacts_count: int = 0
    deals_count: int = 0
    activities_count: int = 0
    latest_activity: Optional[Dict[str, Any]] = None
    user: Optional[UserMinimalResponse] = None
    contacts: Optional[List[CompanyContactSummary]] = None
    deals: Optional[List[CompanyDealSummary]] = None

    model_config = ConfigDict(from_attributes=True)


class CompanyListResponse(BaseModel):
    """Paginated list of companies."""
    items: List[CompanyResponse]
    total: int
    skip: int
    limit: int


class BulkCompanyCreateRequest(BaseModel):
    """Request model for batch creating companies."""
    items: List[CompanyCreate] = Field(..., min_length=1, description="List of companies to create")


class BulkCompanyCreateResponse(BaseModel):
    """Response model for batch company creation results."""
    created_count: int
    items: List[CompanyResponse]
