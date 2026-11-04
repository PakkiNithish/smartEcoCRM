import os
from pathlib import Path
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_alembic_migration_execution(tmp_path: Path):
    """Verify Alembic initial migration creates all tables and seeds stages cleanly."""
    db_file = tmp_path / "migration_test.db"
    test_db_url = f"sqlite:///{db_file}"

    # Path to alembic.ini
    backend_dir = Path(__file__).resolve().parent.parent
    alembic_ini_path = backend_dir / "alembic.ini"

    alembic_cfg = Config(str(alembic_ini_path))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", test_db_url)

    # Run upgrade to head
    command.upgrade(alembic_cfg, "head")

    # Verify tables were created in the SQLite database
    engine = create_engine(test_db_url)
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    expected_tables = {
        "users",
        "companies",
        "contacts",
        "pipeline_stages",
        "deals",
        "tasks",
        "activities",
        "alembic_version",
    }
    assert expected_tables.issubset(set(table_names))

    # Verify seeded pipeline stages exist
    with engine.connect() as conn:
        result = conn.exec_driver_sql("SELECT COUNT(*) FROM pipeline_stages")
        count = result.scalar()
        assert count == 6

    engine.dispose()
