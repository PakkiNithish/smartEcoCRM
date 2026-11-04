import uuid
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.activity import Activity
    from backend.app.models.contact import Contact
    from backend.app.models.deal import Deal
    from backend.app.models.task import Task
    from backend.app.models.user import User


class Company(Base, TimestampMixin):
    """Company/Organization account model."""
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
    )
    industry: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    website: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    address: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
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
    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="companies",
    )
    contacts: Mapped[List["Contact"]] = relationship(
        "Contact",
        back_populates="company",
    )
    deals: Mapped[List["Deal"]] = relationship(
        "Deal",
        back_populates="company",
    )
    tasks: Mapped[List["Task"]] = relationship(
        "Task",
        back_populates="company",
    )
    activities: Mapped[List["Activity"]] = relationship(
        "Activity",
        back_populates="company",
    )

    def __repr__(self) -> str:
        return f"<Company(name='{self.name}')>"
