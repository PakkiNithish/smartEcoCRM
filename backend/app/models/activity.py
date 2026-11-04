import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.company import Company
    from backend.app.models.contact import Contact
    from backend.app.models.deal import Deal
    from backend.app.models.user import User


class Activity(Base, TimestampMixin):
    """Activity tracking model for calls, meetings, emails, notes, and follow-ups."""
    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    type: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
        default="note",  # call, meeting, email, note, follow_up
    )
    subject: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    deal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("deals.id", ondelete="CASCADE"),
        nullable=True,
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
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    is_completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    custom_fields: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )

    # Relationships
    deal: Mapped[Optional["Deal"]] = relationship(
        "Deal",
        back_populates="activities",
    )
    contact: Mapped[Optional["Contact"]] = relationship(
        "Contact",
        back_populates="activities",
    )
    company: Mapped[Optional["Company"]] = relationship(
        "Company",
        back_populates="activities",
    )
    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="activities",
    )

    def __repr__(self) -> str:
        return f"<Activity(id={self.id}, type='{self.type}', subject='{self.subject}')>"
