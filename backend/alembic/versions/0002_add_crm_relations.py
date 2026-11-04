"""Add contact and company relationships to tasks and activities

Revision ID: 0002_add_crm_relations
Revises: 0001_initial_schema
Create Date: 2026-10-14 23:46:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from backend.app.db.base import GUID


# revision identifiers, used by Alembic.
revision: str = "0002_add_crm_relations"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add contact_id, company_id, created_by_id to tasks
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "contact_id",
                GUID(),
                sa.ForeignKey("contacts.id", name="fk_tasks_contact_id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "company_id",
                GUID(),
                sa.ForeignKey("companies.id", name="fk_tasks_company_id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "created_by_id",
                GUID(),
                sa.ForeignKey("users.id", name="fk_tasks_created_by_id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.create_index("ix_tasks_contact_id", ["contact_id"])
        batch_op.create_index("ix_tasks_company_id", ["company_id"])
        batch_op.create_index("ix_tasks_created_by_id", ["created_by_id"])

    # 2. Add contact_id, company_id to activities
    with op.batch_alter_table("activities", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "contact_id",
                GUID(),
                sa.ForeignKey("contacts.id", name="fk_activities_contact_id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "company_id",
                GUID(),
                sa.ForeignKey("companies.id", name="fk_activities_company_id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.create_index("ix_activities_contact_id", ["contact_id"])
        batch_op.create_index("ix_activities_company_id", ["company_id"])


def downgrade() -> None:
    with op.batch_alter_table("activities", schema=None) as batch_op:
        batch_op.drop_index("ix_activities_company_id")
        batch_op.drop_index("ix_activities_contact_id")
        batch_op.drop_column("company_id")
        batch_op.drop_column("contact_id")

    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.drop_index("ix_tasks_created_by_id")
        batch_op.drop_index("ix_tasks_company_id")
        batch_op.drop_index("ix_tasks_contact_id")
        batch_op.drop_column("created_by_id")
        batch_op.drop_column("company_id")
        batch_op.drop_column("contact_id")
