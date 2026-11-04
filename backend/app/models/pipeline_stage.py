import uuid
from typing import TYPE_CHECKING, List
from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.deal import Deal


class PipelineStage(Base, TimestampMixin):
    """Pipeline Stage model for CRM Kanban stages."""
    __tablename__ = "pipeline_stages"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    order: Mapped[int] = mapped_column(
        Integer,
        index=True,
        nullable=False,
        default=0,
    )
    color: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="#00AEEF",
    )
    is_won: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_lost: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Relationships
    deals: Mapped[List["Deal"]] = relationship(
        "Deal",
        back_populates="stage",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<PipelineStage(name='{self.name}', order={self.order})>"
