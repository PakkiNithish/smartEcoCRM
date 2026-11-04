import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PipelineStageBase(BaseModel):
    name: str
    order: int = 0
    color: str = "#00AEEF"
    is_won: bool = False
    is_lost: bool = False


class PipelineStageCreate(PipelineStageBase):
    pass


class PipelineStageResponse(PipelineStageBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
