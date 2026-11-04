import uuid
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.activity import Activity
    from backend.app.models.company import Company
    from backend.app.models.deal import Deal
    from backend.app.models.task import Task
    from backend.app.models.user import User


class Contact(Base, TimestampMixin):
    """Contact individual model."""
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    first_name: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
    )
    last_name: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        index=True,
        nullable=True,
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    job_title: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
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
    stage: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default="Not Contacted",
        index=True,
    )
    custom_fields: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )

    # Relationships
    company: Mapped[Optional["Company"]] = relationship(
        "Company",
        back_populates="contacts",
    )
    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="contacts",
    )
    deals: Mapped[List["Deal"]] = relationship(
        "Deal",
        back_populates="contact",
    )
    tasks: Mapped[List["Task"]] = relationship(
        "Task",
        back_populates="contact",
    )
    activities: Mapped[List["Activity"]] = relationship(
        "Activity",
        back_populates="contact",
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def __repr__(self) -> str:
        return f"<Contact(name='{self.full_name}', email='{self.email}')>"
