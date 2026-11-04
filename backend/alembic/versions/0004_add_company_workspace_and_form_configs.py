"""Add company workspace and form configs

Revision ID: 0004_add_company_workspace_and_form_configs
Revises: 0003_add_user_id_to_contacts_and_companies
Create Date: 2026-10-21 18:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from backend.app.db.base import GUID


# revision identifiers, used by Alembic.
revision: str = "0004_add_company_workspace_and_form_configs"
down_revision: Union[str, None] = "0003_add_user_id_to_contacts_and_companies"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users: company_name
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("company_name", sa.String(255), nullable=True))
        batch_op.create_index("ix_users_company_name", ["company_name"])

    # 2. deals: company_name, custom_fields
    with op.batch_alter_table("deals", schema=None) as batch_op:
        batch_op.add_column(sa.Column("company_name", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("custom_fields", sa.JSON(), nullable=True))
        batch_op.create_index("ix_deals_company_name", ["company_name"])

    # 3. contacts: company_name, custom_fields
    with op.batch_alter_table("contacts", schema=None) as batch_op:
        batch_op.add_column(sa.Column("company_name", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("custom_fields", sa.JSON(), nullable=True))
        batch_op.create_index("ix_contacts_company_name", ["company_name"])

    # 4. companies: company_name, custom_fields
    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.add_column(sa.Column("company_name", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("custom_fields", sa.JSON(), nullable=True))
        batch_op.create_index("ix_companies_company_name", ["company_name"])

    # 5. tasks: company_name, custom_fields
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.add_column(sa.Column("company_name", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("custom_fields", sa.JSON(), nullable=True))
        batch_op.create_index("ix_tasks_company_name", ["company_name"])

    # 6. activities: company_name
    with op.batch_alter_table("activities", schema=None) as batch_op:
        batch_op.add_column(sa.Column("company_name", sa.String(255), nullable=True))
        batch_op.create_index("ix_activities_company_name", ["company_name"])

    # 7. form_configs table
    op.create_table(
        "form_configs",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("fields_config", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("company_name", "entity_type", name="uq_company_entity_form_config"),
    )
    with op.batch_alter_table("form_configs", schema=None) as batch_op:
        batch_op.create_index("ix_form_configs_company_name", ["company_name"])
        batch_op.create_index("ix_form_configs_entity_type", ["entity_type"])


def downgrade() -> None:
    op.drop_table("form_configs")

    with op.batch_alter_table("activities", schema=None) as batch_op:
        batch_op.drop_index("ix_activities_company_name")
        batch_op.drop_column("company_name")

    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.drop_index("ix_tasks_company_name")
        batch_op.drop_column("custom_fields")
        batch_op.drop_column("company_name")

    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.drop_index("ix_companies_company_name")
        batch_op.drop_column("custom_fields")
        batch_op.drop_column("company_name")

    with op.batch_alter_table("contacts", schema=None) as batch_op:
        batch_op.drop_index("ix_contacts_company_name")
        batch_op.drop_column("custom_fields")
        batch_op.drop_column("company_name")

    with op.batch_alter_table("deals", schema=None) as batch_op:
        batch_op.drop_index("ix_deals_company_name")
        batch_op.drop_column("custom_fields")
        batch_op.drop_column("company_name")

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_index("ix_users_company_name")
        batch_op.drop_column("company_name")
