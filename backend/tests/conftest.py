import asyncio
from decimal import Decimal
import os
import sys
import uuid
from typing import AsyncGenerator
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.db.base import Base
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.models.company import Company
from backend.app.models.contact import Contact
from backend.app.models.pipeline_stage import PipelineStage
from backend.app.models.user import User

# In-memory async SQLite engine for isolated, non-destructive test execution
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Seed stage constants
STAGE_NEW_ID = uuid.UUID("a0000000-0000-0000-0000-000000000001")
STAGE_PAPERS_ID = uuid.UUID("a0000000-0000-0000-0000-000000000002")
STAGE_INVOICE_ID = uuid.UUID("a0000000-0000-0000-0000-000000000003")
STAGE_PROGRESS_ID = uuid.UUID("a0000000-0000-0000-0000-000000000004")
STAGE_FINAL_INVOICE_ID = uuid.UUID("a0000000-0000-0000-0000-000000000005")
STAGE_CLOSE_DEAL_ID = uuid.UUID("a0000000-0000-0000-0000-000000000006")

TEST_USER_ID = uuid.UUID("b0000000-0000-0000-0000-000000000001")
TEST_ADMIN_ID = uuid.UUID("b0000000-0000-0000-0000-000000000002")
TEST_COMPANY_ID = uuid.UUID("c0000000-0000-0000-0000-000000000001")
TEST_CONTACT_ID = uuid.UUID("d0000000-0000-0000-0000-000000000001")


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Creates database schema, seeds required defaults, and provides clean test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        # Seed default pipeline stages matching production seed
        stages = [
            PipelineStage(id=STAGE_NEW_ID, name="New", order=1, color="#00AEEF", is_won=False, is_lost=False),
            PipelineStage(id=STAGE_PAPERS_ID, name="Create papers", order=2, color="#47BBEF", is_won=False, is_lost=False),
            PipelineStage(id=STAGE_INVOICE_ID, name="Invoice", order=3, color="#FFA900", is_won=False, is_lost=False),
            PipelineStage(id=STAGE_PROGRESS_ID, name="In progress", order=4, color="#58CC02", is_won=False, is_lost=False),
            PipelineStage(id=STAGE_FINAL_INVOICE_ID, name="Final invoice", order=5, color="#9B51E0", is_won=False, is_lost=False),
            PipelineStage(id=STAGE_CLOSE_DEAL_ID, name="Close deal", order=6, color="#27AE60", is_won=True, is_lost=False),
        ]
        session.add_all(stages)

        # Seed sample User, Company, Contact for relational testing
        user = User(
            id=TEST_USER_ID,
            email="agent@example.com",
            full_name="Agent Smith",
            hashed_password=get_password_hash("password123"),
            role="agent",
            is_active=True,
        )
        admin_user = User(
            id=TEST_ADMIN_ID,
            email="admin@example.com",
            full_name="Admin Boss",
            hashed_password=get_password_hash("admin123"),
            role="admin",
            is_active=True,
        )
        company = Company(
            id=TEST_COMPANY_ID,
            name="Acme Corp",
            industry="Software",
            phone="+1234567890",
            user_id=TEST_USER_ID,
        )
        contact = Contact(
            id=TEST_CONTACT_ID,
            first_name="Alice",
            last_name="Johnson",
            email="alice@example.com",
            company_id=TEST_COMPANY_ID,
            user_id=TEST_USER_ID,
        )
        session.add_all([user, admin_user, company, contact])
        await session.commit()

        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def auth_token() -> str:
    """Generate valid JWT token for default test user."""
    return create_access_token(TEST_USER_ID, role="agent")


@pytest.fixture
def admin_token() -> str:
    """Generate valid JWT token with admin role."""
    return create_access_token(TEST_ADMIN_ID, role="admin")


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession, auth_token: str) -> AsyncGenerator[AsyncClient, None]:
    """Configures authenticated test client with database dependency override and valid JWT."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {auth_token}"}
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def unauthed_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Configures unauthenticated test client to verify HTTP 401 rejection."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
