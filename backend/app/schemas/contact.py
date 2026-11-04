import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field
from backend.app.schemas.company import CompanyMinimalResponse
from backend.app.schemas.user import UserMinimalResponse


class ContactBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100, description="Contact first name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Contact last name")
    email: Optional[EmailStr] = Field(default=None, description="Contact email address")
    phone: Optional[str] = Field(default=None, max_length=50, description="Phone number")
    job_title: Optional[str] = Field(default=None, max_length=100, description="Job title / role")
    company_id: Optional[uuid.UUID] = Field(default=None, description="Associated company ID")
    user_id: Optional[uuid.UUID] = Field(default=None, description="Owner user ID")
    company_name: Optional[str] = Field(default=None, description="Workspace company name")
    stage: Optional[str] = Field(default="Not Contacted", max_length=100, description="Lifecycle stage")
    custom_fields: Optional[Dict[str, Any]] = Field(default=None, description="Dynamic custom fields values")


class ContactCreate(ContactBase):
    """Schema for creating a new contact."""
    pass


class ContactUpdate(BaseModel):
    """Schema for partially updating a contact (PATCH)."""
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=50)
    job_title: Optional[str] = Field(default=None, max_length=100)
    stage: Optional[str] = Field(default=None, max_length=100)
    company_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    company_name: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="forbid")


class ContactMinimalResponse(BaseModel):
    """Minimal contact representation for lookups and nested associations."""
    id: uuid.UUID
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    stage: Optional[str] = None
    company_id: Optional[uuid.UUID] = None

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    model_config = ConfigDict(from_attributes=True)


class ContactDealSummary(BaseModel):
    """Deal summary nested inside contact response."""
    id: uuid.UUID
    title: str
    amount: Decimal
    currency: str

    model_config = ConfigDict(from_attributes=True)


class ContactResponse(ContactBase):
    """Full contact representation including associated company details and timestamps."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    company: Optional[CompanyMinimalResponse] = None
    user: Optional[UserMinimalResponse] = None
    deals_count: int = 0
    activities_count: int = 0
    latest_activity: Optional[Dict[str, Any]] = None
    deals: Optional[List[ContactDealSummary]] = None

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    model_config = ConfigDict(from_attributes=True)


class ContactListResponse(BaseModel):
    """Paginated list of contacts."""
    items: List[ContactResponse]
    total: int
    skip: int
    limit: int


class BulkContactCreateRequest(BaseModel):
    """Request model for batch creating contacts."""
    items: List[ContactCreate] = Field(..., min_length=1, description="List of contacts to create")


class BulkContactCreateResponse(BaseModel):
    """Response model for batch contact creation results."""
    created_count: int
    items: List[ContactResponse]
