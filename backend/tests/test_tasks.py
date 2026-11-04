import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_task_success(client: AsyncClient):
    """Verify creating a basic task."""
    payload = {
        "title": "Prepare NDA agreement",
        "description": "Send standard mutual NDA before call",
        "status": "pending",
        "priority": "high",
    }
    res = await client.post("/api/v1/tasks", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == payload["title"]
    assert data["status"] == "pending"
    assert data["priority"] == "high"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_task_invalid_foreign_key(client: AsyncClient):
    """Verify 400 Bad Request when linking to a non-existent deal or company."""
    fake_id = str(uuid.uuid4())
    payload = {
        "title": "Invalid link task",
        "deal_id": fake_id,
    }
    res = await client.post("/api/v1/tasks", json=payload)
    assert res.status_code == 400
    assert "does not exist" in res.json()["detail"]


@pytest.mark.asyncio
async def test_create_task_validation_error(client: AsyncClient):
    """Verify 422 Unprocessable Entity when title is missing or empty."""
    res = await client.post("/api/v1/tasks", json={"title": ""})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_get_task_by_id(client: AsyncClient):
    """Verify retrieving a task by UUID."""
    create_res = await client.post(
        "/api/v1/tasks",
        json={"title": "Client follow-up task", "priority": "urgent"},
    )
    task_id = create_res.json()["id"]

    res = await client.get(f"/api/v1/tasks/{task_id}")
    assert res.status_code == 200
    assert res.json()["id"] == task_id
    assert res.json()["title"] == "Client follow-up task"


@pytest.mark.asyncio
async def test_get_task_not_found(client: AsyncClient):
    """Verify 404 for nonexistent task UUID."""
    res = await client.get(f"/api/v1/tasks/{uuid.uuid4()}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_list_and_filter_tasks(client: AsyncClient):
    """Verify searching and filtering tasks by status and priority."""
    await client.post(
        "/api/v1/tasks",
        json={"title": "Alpha unique task search term", "status": "in_progress", "priority": "urgent"},
    )

    # Search keyword
    res = await client.get("/api/v1/tasks?search=Alpha unique")
    assert res.status_code == 200
    assert res.json()["total"] >= 1

    # Filter status
    res = await client.get("/api/v1/tasks?status=in_progress")
    assert res.status_code == 200
    for item in res.json()["items"]:
        assert item["status"] == "in_progress"

    # Filter priority
    res = await client.get("/api/v1/tasks?priority=urgent")
    assert res.status_code == 200
    for item in res.json()["items"]:
        assert item["priority"] == "urgent"


@pytest.mark.asyncio
async def test_update_task_patch(client: AsyncClient):
    """Verify updating task status and priority."""
    create_res = await client.post(
        "/api/v1/tasks",
        json={"title": "To be completed", "status": "pending"},
    )
    task_id = create_res.json()["id"]

    res = await client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"status": "completed", "priority": "low"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "completed"
    assert res.json()["priority"] == "low"


@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient):
    """Verify deleting a task."""
    create_res = await client.post(
        "/api/v1/tasks",
        json={"title": "Temporary Task"},
    )
    task_id = create_res.json()["id"]

    res = await client.delete(f"/api/v1/tasks/{task_id}")
    assert res.status_code == 204

    # Verify 404 on subsequent get
    res = await client.get(f"/api/v1/tasks/{task_id}")
    assert res.status_code == 404
