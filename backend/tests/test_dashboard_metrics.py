import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_metrics_activities_tasks_deals(client: AsyncClient):
    # 1. Fetch dashboard metrics
    response = await client.get("/api/v1/dashboard/metrics")
    assert response.status_code == 200
    data = response.json()

    # 2. Check structure focuses on tasks, activities, deals
    assert "tasks" in data
    assert "activities" in data
    assert "deals" in data
    assert "recent_deals" in data
    assert "upcoming_activities" in data
    assert "recent_activities" in data
    assert "follow_ups_due_soon" in data

    tasks = data["tasks"]
    assert "total" in tasks
    assert "pending" in tasks
    assert "completed" in tasks
    assert "overdue" in tasks

    activities = data["activities"]
    assert "total" in activities
    assert "calls" in activities
    assert "meetings" in activities
    assert "emails" in activities

    deals = data["deals"]
    assert "total" in deals
    assert "won" in deals
    assert "active" in deals
    assert "win_rate" in deals
