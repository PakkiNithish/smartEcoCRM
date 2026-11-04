"""Add user_id to contacts and companies for account isolation

Revision ID: 0003_add_user_id_to_contacts_and_companies
Revises: 0002_add_crm_relations
Create Date: 2026-10-16 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from backend.app.db.base import GUID


# revision identifiers, used by Alembic.
revision: str = "0003_add_user_id_to_contacts_and_companies"
down_revision: Union[str, None] = "0002_add_crm_relations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add user_id to contacts
    with op.batch_alter_table("contacts", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "user_id",
                GUID(),
                sa.ForeignKey("users.id", name="fk_contacts_user_id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.create_index("ix_contacts_user_id", ["user_id"])

    # 2. Add user_id to companies
    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "user_id",
                GUID(),
                sa.ForeignKey("users.id", name="fk_companies_user_id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.create_index("ix_companies_user_id", ["user_id"])


def downgrade() -> None:
    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.drop_index("ix_companies_user_id")
        batch_op.drop_column("user_id")

    with op.batch_alter_table("contacts", schema=None) as batch_op:
        batch_op.drop_index("ix_contacts_user_id")
        batch_op.drop_column("user_id")
