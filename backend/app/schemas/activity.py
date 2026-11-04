import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from backend.app.schemas.company import CompanyMinimalResponse
from backend.app.schemas.contact import ContactMinimalResponse
from backend.app.schemas.deal import DealMinimalResponse
from backend.app.schemas.user import UserMinimalResponse


class ActivityBase(BaseModel):
    type: str = Field(default="note", description="Activity type: call, meeting, email, note, follow_up")
    subject: str = Field(..., min_length=1, max_length=255, description="Subject / title")
    notes: Optional[str] = Field(default=None, description="Detailed activity notes")
    scheduled_at: Optional[datetime] = Field(default=None, description="Scheduled date and time")
    is_completed: bool = Field(default=False, description="Whether activity is completed")
    deal_id: Optional[uuid.UUID] = Field(default=None, description="Associated deal ID")
    contact_id: Optional[uuid.UUID] = Field(default=None, description="Associated contact ID")
    company_id: Optional[uuid.UUID] = Field(default=None, description="Associated company ID")
    user_id: Optional[uuid.UUID] = Field(default=None, description="User who performed/scheduled the activity")
    custom_fields: Optional[dict] = Field(default=None, description="Custom dynamic form fields")


class ActivityCreate(ActivityBase):
    """Schema for recording a new activity."""
    pass


class ActivityUpdate(BaseModel):
    """Schema for partially updating an activity (PATCH). All fields optional."""
    type: Optional[str] = None
    subject: Optional[str] = Field(default=None, min_length=1, max_length=255)
    notes: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    is_completed: Optional[bool] = None
    deal_id: Optional[uuid.UUID] = None
    contact_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    custom_fields: Optional[dict] = None

    model_config = ConfigDict(extra="forbid")


class ActivityMinimalResponse(BaseModel):
    """Minimal activity representation."""
    id: uuid.UUID
    type: str
    subject: str
    scheduled_at: Optional[datetime] = None
    is_completed: bool = False
    deal_id: Optional[uuid.UUID] = None
    contact_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


class ActivityResponse(ActivityBase):
    """Complete activity representation with populated CRM relationships."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    deal: Optional[DealMinimalResponse] = None
    contact: Optional[ContactMinimalResponse] = None
    company: Optional[CompanyMinimalResponse] = None
    user: Optional[UserMinimalResponse] = None

    model_config = ConfigDict(from_attributes=True)


class ActivityListResponse(BaseModel):
    """Paginated list of activities."""
    items: List[ActivityResponse]
    total: int
    skip: int
    limit: int
