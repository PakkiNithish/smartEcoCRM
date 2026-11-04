"""Add stage to companies and contacts

Revision ID: 0007_add_stage_to_companies_and_contacts
Revises: 0006_add_custom_fields_to_activities
Create Date: 2026-10-26 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0007_add_stage_to_companies_and_contacts"
down_revision: Union[str, None] = "0006_add_custom_fields_to_activities"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("stage", sa.String(length=100), nullable=True, server_default="Not Contacted")
        )
        batch_op.create_index(batch_op.f("ix_companies_stage"), ["stage"], unique=False)

    with op.batch_alter_table("contacts", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("stage", sa.String(length=100), nullable=True, server_default="Not Contacted")
        )
        batch_op.create_index(batch_op.f("ix_contacts_stage"), ["stage"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("contacts", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_contacts_stage"))
        batch_op.drop_column("stage")

    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_companies_stage"))
        batch_op.drop_column("stage")
