import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import JSON, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.activity import Activity
    from backend.app.models.company import Company
    from backend.app.models.contact import Contact
    from backend.app.models.pipeline_stage import PipelineStage
    from backend.app.models.task import Task
    from backend.app.models.user import User


class Deal(Base, TimestampMixin):
    """Core CRM Deal model tracking sales pipeline opportunities."""
    __tablename__ = "deals"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        default=Decimal("0.00"),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        default="INR",
        nullable=False,
    )
    stage_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("pipeline_stages.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    contact_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("contacts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    responsible_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    company_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        index=True,
        nullable=True,
    )
    expected_close_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    custom_fields: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )

    # Relationships
    stage: Mapped["PipelineStage"] = relationship(
        "PipelineStage",
        back_populates="deals",
    )
    contact: Mapped[Optional["Contact"]] = relationship(
        "Contact",
        back_populates="deals",
    )
    company: Mapped[Optional["Company"]] = relationship(
        "Company",
        back_populates="deals",
    )
    responsible_user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="deals",
    )
    tasks: Mapped[List["Task"]] = relationship(
        "Task",
        back_populates="deal",
        cascade="all, delete-orphan",
    )
    activities: Mapped[List["Activity"]] = relationship(
        "Activity",
        back_populates="deal",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Deal(id={self.id}, title='{self.title}', amount={self.amount} {self.currency})>"
