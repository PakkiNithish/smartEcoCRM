import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FormFieldConfig(BaseModel):
    """Configuration for a single field in a creation form."""
    key: str = Field(..., description="Unique attribute key (e.g., 'title' or 'cf_lead_source')")
    label: str = Field(..., description="Display label for the input field")
    type: str = Field(
        default="text",
        description="Field input type: text, number, select, date, textarea, checkbox"
    )
    required: bool = Field(default=False, description="Whether the field is mandatory")
    enabled: bool = Field(default=True, description="Whether the field is shown in the form")
    is_custom: bool = Field(default=False, description="True if custom field, False if standard model field")
    options: Optional[List[str]] = Field(default=None, description="Select dropdown options if type is 'select'")
    placeholder: Optional[str] = Field(default=None, description="Input placeholder text")


class FormConfigResponse(BaseModel):
    """Schema for returning form configuration for an entity."""
    entity_type: str
    company_name: str
    fields_config: List[Dict[str, Any]]

    model_config = ConfigDict(from_attributes=True)


class FormConfigUpdateRequest(BaseModel):
    """Schema for updating form configuration for an entity."""
    fields_config: List[Dict[str, Any]]
