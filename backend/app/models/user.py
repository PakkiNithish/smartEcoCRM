from datetime import datetime
import uuid
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.activity import Activity
    from backend.app.models.company import Company
    from backend.app.models.contact import Contact
    from backend.app.models.deal import Deal
    from backend.app.models.task import Task


class User(Base, TimestampMixin):
    """User account model for agents, managers, and administrators."""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(50),
        default="agent",
        nullable=False,
    )
    company_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        index=True,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    last_active_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    deals: Mapped[List["Deal"]] = relationship(
        "Deal",
        back_populates="responsible_user",
    )
    contacts: Mapped[List["Contact"]] = relationship(
        "Contact",
        foreign_keys="Contact.user_id",
        back_populates="user",
    )
    companies: Mapped[List["Company"]] = relationship(
        "Company",
        foreign_keys="Company.user_id",
        back_populates="user",
    )
    assigned_tasks: Mapped[List["Task"]] = relationship(
        "Task",
        foreign_keys="Task.assigned_to_id",
        back_populates="assigned_to",
    )
    created_tasks: Mapped[List["Task"]] = relationship(
        "Task",
        foreign_keys="Task.created_by_id",
        back_populates="created_by",
    )
    activities: Mapped[List["Activity"]] = relationship(
        "Activity",
        back_populates="user",
    )

    def __repr__(self) -> str:
        return f"<User(email='{self.email}', full_name='{self.full_name}')>"
