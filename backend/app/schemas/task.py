import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from backend.app.schemas.company import CompanyMinimalResponse
from backend.app.schemas.contact import ContactMinimalResponse
from backend.app.schemas.deal import DealMinimalResponse
from backend.app.schemas.user import UserMinimalResponse


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Task title")
    description: Optional[str] = Field(default=None, description="Detailed task description")
    status: str = Field(default="pending", description="Status: pending, in_progress, completed, cancelled")
    priority: str = Field(default="medium", description="Priority: low, medium, high, urgent")
    due_date: Optional[datetime] = Field(default=None, description="Due date and time")
    deal_id: Optional[uuid.UUID] = Field(default=None, description="Associated deal ID")
    contact_id: Optional[uuid.UUID] = Field(default=None, description="Associated contact ID")
    company_id: Optional[uuid.UUID] = Field(default=None, description="Associated company ID")
    assigned_to_id: Optional[uuid.UUID] = Field(default=None, description="Assigned team member ID")
    company_name: Optional[str] = Field(default=None, description="Workspace company name")
    custom_fields: Optional[Dict[str, Any]] = Field(default=None, description="Dynamic custom fields values")


class TaskCreate(TaskBase):
    """Schema for creating a task."""
    created_by_id: Optional[uuid.UUID] = None


class TaskUpdate(BaseModel):
    """Schema for updating a task (PATCH). All fields optional."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    deal_id: Optional[uuid.UUID] = None
    contact_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    assigned_to_id: Optional[uuid.UUID] = None
    company_name: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="forbid")


class TaskMinimalResponse(BaseModel):
    """Minimal representation of a task."""
    id: uuid.UUID
    title: str
    status: str
    priority: str
    due_date: Optional[datetime] = None
    deal_id: Optional[uuid.UUID] = None
    contact_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


class TaskResponse(TaskBase):
    """Complete representation of a task including related CRM records."""
    id: uuid.UUID
    created_by_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    deal: Optional[DealMinimalResponse] = None
    contact: Optional[ContactMinimalResponse] = None
    company: Optional[CompanyMinimalResponse] = None
    assigned_to: Optional[UserMinimalResponse] = None
    created_by: Optional[UserMinimalResponse] = None

    model_config = ConfigDict(from_attributes=True)


class TaskListResponse(BaseModel):
    """Paginated list of tasks."""
    items: List[TaskResponse]
    total: int
    skip: int
    limit: int
