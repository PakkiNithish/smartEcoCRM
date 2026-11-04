"""Initial CRM database schema and default pipeline stages seed

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-14 20:30:00.000000

"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from backend.app.db.base import GUID


# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Deterministic Seed UUIDs for reproducibility
SEEDED_STAGES = [
    {
        "id": uuid.UUID("a0000000-0000-0000-0000-000000000001"),
        "name": "New",
        "order": 1,
        "color": "#00AEEF",
        "is_won": False,
        "is_lost": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    },
    {
        "id": uuid.UUID("a0000000-0000-0000-0000-000000000002"),
        "name": "Create papers",
        "order": 2,
        "color": "#47BBEF",
        "is_won": False,
        "is_lost": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    },
    {
        "id": uuid.UUID("a0000000-0000-0000-0000-000000000003"),
        "name": "Invoice",
        "order": 3,
        "color": "#FFA900",
        "is_won": False,
        "is_lost": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    },
    {
        "id": uuid.UUID("a0000000-0000-0000-0000-000000000004"),
        "name": "In progress",
        "order": 4,
        "color": "#58CC02",
        "is_won": False,
        "is_lost": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    },
    {
        "id": uuid.UUID("a0000000-0000-0000-0000-000000000005"),
        "name": "Final invoice",
        "order": 5,
        "color": "#9B51E0",
        "is_won": False,
        "is_lost": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    },
    {
        "id": uuid.UUID("a0000000-0000-0000-0000-000000000006"),
        "name": "Close deal",
        "order": 6,
        "color": "#27AE60",
        "is_won": True,
        "is_lost": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    },
]


def upgrade() -> None:
    # 1. users
    op.create_table(
        "users",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="agent"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. companies
    op.create_table(
        "companies",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("industry", sa.String(100), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("website", sa.String(255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_companies_name", "companies", ["name"])

    # 3. contacts
    op.create_table(
        "contacts",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("job_title", sa.String(100), nullable=True),
        sa.Column("company_id", GUID(), sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_contacts_first_name", "contacts", ["first_name"])
    op.create_index("ix_contacts_last_name", "contacts", ["last_name"])
    op.create_index("ix_contacts_email", "contacts", ["email"])
    op.create_index("ix_contacts_company_id", "contacts", ["company_id"])

    # 4. pipeline_stages
    pipeline_stages_table = op.create_table(
        "pipeline_stages",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("color", sa.String(30), nullable=False, server_default="#00AEEF"),
        sa.Column("is_won", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_lost", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_pipeline_stages_name", "pipeline_stages", ["name"], unique=True)
    op.create_index("ix_pipeline_stages_order", "pipeline_stages", ["order"])

    # 5. deals
    op.create_table(
        "deals",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("stage_id", GUID(), sa.ForeignKey("pipeline_stages.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("contact_id", GUID(), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("company_id", GUID(), sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("responsible_user_id", GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("expected_close_date", sa.Date(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_deals_title", "deals", ["title"])
    op.create_index("ix_deals_amount", "deals", ["amount"])
    op.create_index("ix_deals_stage_id", "deals", ["stage_id"])
    op.create_index("ix_deals_contact_id", "deals", ["contact_id"])
    op.create_index("ix_deals_company_id", "deals", ["company_id"])
    op.create_index("ix_deals_responsible_user_id", "deals", ["responsible_user_id"])

    # 6. tasks
    op.create_table(
        "tasks",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("priority", sa.String(30), nullable=False, server_default="medium"),
        sa.Column("deal_id", GUID(), sa.ForeignKey("deals.id", ondelete="CASCADE"), nullable=True),
        sa.Column("assigned_to_id", GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_deal_id", "tasks", ["deal_id"])
    op.create_index("ix_tasks_assigned_to_id", "tasks", ["assigned_to_id"])

    # 7. activities
    op.create_table(
        "activities",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("type", sa.String(50), nullable=False, server_default="note"),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("deal_id", GUID(), sa.ForeignKey("deals.id", ondelete="CASCADE"), nullable=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_activities_type", "activities", ["type"])
    op.create_index("ix_activities_deal_id", "activities", ["deal_id"])
    op.create_index("ix_activities_user_id", "activities", ["user_id"])

    # Seed Default Pipeline Stages
    op.bulk_insert(pipeline_stages_table, SEEDED_STAGES)


def downgrade() -> None:
    op.drop_table("activities")
    op.drop_table("tasks")
    op.drop_table("deals")
    op.drop_table("pipeline_stages")
    op.drop_table("contacts")
    op.drop_table("companies")
    op.drop_table("users")
