import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.app.schemas.company import CompanyMinimalResponse
from backend.app.schemas.contact import ContactMinimalResponse
from backend.app.schemas.pipeline_stage import PipelineStageResponse
from backend.app.schemas.user import UserMinimalResponse


class DealBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Deal title / opportunity name")
    amount: Decimal = Field(default=Decimal("0.00"), ge=0, description="Monetary value of the deal")
    currency: str = Field(default="INR", min_length=3, max_length=3, description="ISO 4217 currency code")
    stage_id: Optional[uuid.UUID] = Field(default=None, description="ID of the pipeline stage")
    contact_id: Optional[uuid.UUID] = Field(default=None, description="Associated primary contact ID")
    company_id: Optional[uuid.UUID] = Field(default=None, description="Associated company ID")
    responsible_user_id: Optional[uuid.UUID] = Field(default=None, description="Responsible agent/user ID")
    company_name: Optional[str] = Field(default=None, description="Workspace company name")
    expected_close_date: Optional[date] = Field(default=None, description="Expected deal closing date")
    description: Optional[str] = Field(default=None, max_length=2000, description="Notes and deal description")
    custom_fields: Optional[Dict[str, Any]] = Field(default=None, description="Dynamic custom fields values")

    @field_validator("stage_id", "contact_id", "company_id", "responsible_user_id", mode="before")
    @classmethod
    def empty_str_to_none_uuid(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("expected_close_date", mode="before")
    @classmethod
    def empty_str_to_none_date(cls, v):
        if v == "" or v is None:
            return None
        return v


class DealCreate(DealBase):
    """Schema for creating a new Deal."""
    pass


class DealUpdate(BaseModel):
    """Schema for partially updating a Deal (PATCH). All fields are optional."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default=None, min_length=3, max_length=3)
    stage_id: Optional[uuid.UUID] = None
    contact_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    responsible_user_id: Optional[uuid.UUID] = None
    company_name: Optional[str] = None
    expected_close_date: Optional[date] = None
    description: Optional[str] = Field(default=None, max_length=2000)
    custom_fields: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="forbid")


class DealResponse(DealBase):
    """Schema for returning deal details with populated relationships."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    stage: Optional[PipelineStageResponse] = None
    contact: Optional[ContactMinimalResponse] = None
    company: Optional[CompanyMinimalResponse] = None
    responsible_user: Optional[UserMinimalResponse] = None

    model_config = ConfigDict(from_attributes=True)


class DealListResponse(BaseModel):
    """Paginated list of deals."""
    items: List[DealResponse]
    total: int
    skip: int
    limit: int


class DealMinimalResponse(BaseModel):
    """Minimal deal summary for nested relationships in Company/Contact responses."""
    id: uuid.UUID
    title: str
    amount: Decimal
    currency: str

    model_config = ConfigDict(from_attributes=True)


class BulkDeleteRequest(BaseModel):
    """Request model for batch deletion of entities."""
    ids: List[uuid.UUID] = Field(..., min_length=1, description="List of UUIDs to delete")


class BulkDeleteResponse(BaseModel):
    """Response model for batch deletion results."""
    deleted_count: int
    message: str


class BulkDealCreateRequest(BaseModel):
    """Request model for batch creating deals."""
    items: List[DealCreate] = Field(..., min_length=1, description="List of deals to create")


class BulkDealCreateResponse(BaseModel):
    """Response model for batch deal creation results."""
    created_count: int
    items: List[DealResponse]

