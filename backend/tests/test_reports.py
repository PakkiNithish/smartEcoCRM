from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.activity import Activity
from backend.app.models.deal import Deal
from backend.app.models.task import Task
from backend.app.models.user import User
from backend.tests.conftest import (
    STAGE_CLOSE_DEAL_ID,
    STAGE_NEW_ID,
    TEST_ADMIN_ID,
    TEST_USER_ID,
)


@pytest.mark.asyncio
async def test_get_user_efficiency_report_agent(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify regular agent can fetch their own efficiency report."""
    now = datetime.now(timezone.utc)

    # Seed task for agent
    task = Task(
        title="Complete client audit",
        status="completed",
        priority="high",
        assigned_to_id=TEST_USER_ID,
        created_by_id=TEST_USER_ID,
        due_date=now + timedelta(days=2),
    )
    # Seed activity for agent
    activity = Activity(
        type="call",
        subject="Follow-up call with Alice",
        is_completed=True,
        user_id=TEST_USER_ID,
    )
    # Seed deal for agent
    deal = Deal(
        title="Enterprise CRM Contract",
        amount=Decimal("15000.00"),
        stage_id=STAGE_CLOSE_DEAL_ID,
        responsible_user_id=TEST_USER_ID,
    )

    db_session.add_all([task, activity, deal])
    await db_session.commit()

    start_date = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    end_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")

    res = await client.get(
        f"/api/v1/reports/efficiency?start_date={start_date}&end_date={end_date}"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_admin"] is False
    assert data["report"] is not None
    assert data["report"]["user"]["id"] == str(TEST_USER_ID)
    assert data["report"]["tasks"]["completed"] >= 1
    assert data["report"]["activities"]["calls"] >= 1
    assert data["report"]["deals"]["won"] >= 1
    assert data["report"]["deals"]["won_amount"] >= 15000.0
    assert data["report"]["efficiency_score"] > 0
    assert data["report"]["performance_rating"] in [
        "Top Performer",
        "High Efficiency",
        "Good",
        "Needs Improvement",
    ]


@pytest.mark.asyncio
async def test_agent_cannot_view_other_user_report(
    client: AsyncClient,
):
    """Verify regular agent is forbidden from passing another user's ID."""
    other_id = str(TEST_ADMIN_ID)
    res = await client.get(f"/api/v1/reports/efficiency?user_id={other_id}")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_team_report_and_user_selection(
    client: AsyncClient,
    admin_token: str,
    db_session: AsyncSession,
):
    """Verify admin can view team overview and select specific user from dropdown."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Team overview (no user_id specified)
    res = await client.get("/api/v1/reports/efficiency", headers=headers)
    assert res.status_code == 200
    team_data = res.json()
    assert team_data["is_admin"] is True
    assert team_data["is_team_overview"] is True
    assert len(team_data["user_reports"]) >= 2

    # 2. Specific user selection by admin
    agent_id = str(TEST_USER_ID)
    res_agent = await client.get(
        f"/api/v1/reports/efficiency?user_id={agent_id}", headers=headers
    )
    assert res_agent.status_code == 200
    agent_data = res_agent.json()
    assert agent_data["is_admin"] is True
    assert agent_data["selected_user_id"] == agent_id
    assert agent_data["report"]["user"]["id"] == agent_id


@pytest.mark.asyncio
async def test_export_efficiency_report_csv(
    client: AsyncClient,
):
    """Verify CSV export endpoint returns text/csv content."""
    res = await client.get("/api/v1/reports/export")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "smartEco CRM - User Efficiency" in res.text


@pytest.mark.asyncio
async def test_multiple_stages_efficiency_report(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verify filtering by multiple stages/categories simultaneously."""
    now = datetime.now(timezone.utc)

    # Seed task
    task = Task(
        title="Multi-stage test task",
        status="pending",
        priority="urgent",
        assigned_to_id=TEST_USER_ID,
        created_by_id=TEST_USER_ID,
    )
    # Seed activity
    activity = Activity(
        type="call",
        subject="Multi-stage test call",
        is_completed=True,
        user_id=TEST_USER_ID,
    )
    # Seed deal
    deal = Deal(
        title="Multi-stage test deal",
        amount=Decimal("5000.00"),
        stage_id=STAGE_NEW_ID,
        responsible_user_id=TEST_USER_ID,
    )
    db_session.add_all([task, activity, deal])
    await db_session.commit()

    # Query with multiple stages: activity and task only (deals excluded)
    res = await client.get(
        "/api/v1/reports/efficiency?stage=activities&stage=task:pending"
    )
    assert res.status_code == 200
    data = res.json()["report"]
    assert data["tasks"]["pending"] >= 1
    assert data["activities"]["total"] >= 1
    # Deals should be excluded since deal was not in the filter
    assert data["deals"]["total"] == 0

    # Query with comma-separated stages
    res2 = await client.get(
        "/api/v1/reports/efficiency?stage=activity:call,deals"
    )
    assert res2.status_code == 200
    data2 = res2.json()["report"]
    assert data2["activities"]["calls"] >= 1
    assert data2["deals"]["total"] >= 1
    assert data2["tasks"]["total_assigned"] == 0
