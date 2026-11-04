"""Add last_active_at to users

Revision ID: 0005_add_last_active_at_to_users
Revises: 0004_add_company_workspace_and_form_configs
Create Date: 2026-10-22 10:27:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0005_add_last_active_at_to_users"
down_revision: Union[str, None] = "0004_add_company_workspace_and_form_configs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("last_active_at")
