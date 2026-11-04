from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class UserMinimalResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    company_name: Optional[str] = None
    is_active: bool = True
    last_active_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

