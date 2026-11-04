import uuid
from typing import Any, Dict, List
from sqlalchemy import JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base, GUID, TimestampMixin


class FormConfig(Base, TimestampMixin):
    """Customizable creation form and fields configuration per company."""
    __tablename__ = "form_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    company_name: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,  # "deal", "contact", "company"
    )
    fields_config: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    __table_args__ = (
        UniqueConstraint("company_name", "entity_type", name="uq_company_entity_form_config"),
    )

    def __repr__(self) -> str:
        return f"<FormConfig(company='{self.company_name}', entity='{self.entity_type}')>"
