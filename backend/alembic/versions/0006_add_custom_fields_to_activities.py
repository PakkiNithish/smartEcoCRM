"""Add custom_fields to activities

Revision ID: 0006_add_custom_fields_to_activities
Revises: 0005_add_last_active_at_to_users
Create Date: 2026-10-23 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0006_add_custom_fields_to_activities"
down_revision: Union[str, None] = "0005_add_last_active_at_to_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("activities", schema=None) as batch_op:
        batch_op.add_column(sa.Column("custom_fields", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("activities", schema=None) as batch_op:
        batch_op.drop_column("custom_fields")
