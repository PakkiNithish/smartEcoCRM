import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_activity_success(client: AsyncClient):
    """Verify recording an activity (call, meeting, note)."""
    payload = {
        "type": "call",
        "subject": "Introductory Discovery Call",
        "notes": "Discussed contract scope and timeline with VP",
        "is_completed": True,
    }
    res = await client.post("/api/v1/activities", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["type"] == "call"
    assert data["subject"] == payload["subject"]
    assert data["is_completed"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_create_activity_invalid_foreign_key(client: AsyncClient):
    """Verify 400 Bad Request when linking to a non-existent deal or contact."""
    fake_id = str(uuid.uuid4())
    payload = {
        "type": "meeting",
        "subject": "Demo meeting",
        "contact_id": fake_id,
    }
    res = await client.post("/api/v1/activities", json=payload)
    assert res.status_code == 400
    assert "does not exist" in res.json()["detail"]


@pytest.mark.asyncio
async def test_create_activity_validation_error(client: AsyncClient):
    """Verify 422 Unprocessable Entity when subject is empty."""
    res = await client.post("/api/v1/activities", json={"subject": ""})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_get_activity_by_id(client: AsyncClient):
    """Verify retrieving an activity by UUID."""
    create_res = await client.post(
        "/api/v1/activities",
        json={"type": "email", "subject": "Sent proposal draft"},
    )
    activity_id = create_res.json()["id"]

    res = await client.get(f"/api/v1/activities/{activity_id}")
    assert res.status_code == 200
    assert res.json()["id"] == activity_id
    assert res.json()["subject"] == "Sent proposal draft"


@pytest.mark.asyncio
async def test_get_activity_not_found(client: AsyncClient):
    """Verify 404 for nonexistent activity UUID."""
    res = await client.get(f"/api/v1/activities/{uuid.uuid4()}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_list_and_filter_activities(client: AsyncClient):
    """Verify filtering activities by type and completion status."""
    await client.post(
        "/api/v1/activities",
        json={"type": "meeting", "subject": "Quarterly Review", "is_completed": False},
    )

    # Filter type
    res = await client.get("/api/v1/activities?type=meeting")
    assert res.status_code == 200
    for item in res.json()["items"]:
        assert item["type"] == "meeting"

    # Filter is_completed
    res = await client.get("/api/v1/activities?is_completed=false")
    assert res.status_code == 200
    for item in res.json()["items"]:
        assert item["is_completed"] is False


@pytest.mark.asyncio
async def test_update_activity_patch(client: AsyncClient):
    """Verify updating an activity."""
    create_res = await client.post(
        "/api/v1/activities",
        json={"type": "follow_up", "subject": "Check signing status", "is_completed": False},
    )
    activity_id = create_res.json()["id"]

    res = await client.patch(
        f"/api/v1/activities/{activity_id}",
        json={"is_completed": True, "notes": "Contract signed via DocuSign"},
    )
    assert res.status_code == 200
    assert res.json()["is_completed"] is True
    assert res.json()["notes"] == "Contract signed via DocuSign"


@pytest.mark.asyncio
async def test_delete_activity(client: AsyncClient):
    """Verify deleting an activity."""
    create_res = await client.post(
        "/api/v1/activities",
        json={"type": "note", "subject": "Scratchpad note"},
    )
    activity_id = create_res.json()["id"]

    res = await client.delete(f"/api/v1/activities/{activity_id}")
    assert res.status_code == 204

    res = await client.get(f"/api/v1/activities/{activity_id}")
    assert res.status_code == 404
