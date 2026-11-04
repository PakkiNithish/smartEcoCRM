import uuid
import pytest
from httpx import AsyncClient
from backend.tests.conftest import TEST_COMPANY_ID


@pytest.mark.asyncio
async def test_create_contact_success(client: AsyncClient):
    """Verify creating a contact with full details and valid company association."""
    payload = {
        "first_name": "Sarah",
        "last_name": "Connor",
        "email": "sarah.connor@example.com",
        "phone": "+15551234567",
        "job_title": "Head of Security",
        "company_id": str(TEST_COMPANY_ID),
    }
    res = await client.post("/api/v1/contacts", json=payload)
    assert res.status_code == 201
    contact = res.json()
    assert contact["first_name"] == "Sarah"
    assert contact["last_name"] == "Connor"
    assert contact["full_name"] == "Sarah Connor"
    assert contact["job_title"] == "Head of Security"
    assert contact["company"]["name"] == "Acme Corp"
    assert "id" in contact


@pytest.mark.asyncio
async def test_create_contact_invalid_company(client: AsyncClient):
    """Verify 400 Bad Request when associating with nonexistent company."""
    payload = {
        "first_name": "John",
        "last_name": "Doe",
        "company_id": str(uuid.uuid4()),
    }
    res = await client.post("/api/v1/contacts", json=payload)
    assert res.status_code == 400
    assert "does not exist" in res.json()["detail"]


@pytest.mark.asyncio
async def test_create_contact_validation_error(client: AsyncClient):
    """Verify 422 Unprocessable Entity for missing required first_name or last_name."""
    res = await client.post("/api/v1/contacts", json={"first_name": ""})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_get_contact_by_id(client: AsyncClient):
    """Verify retrieving a contact by UUID."""
    create_res = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Bruce", "last_name": "Wayne", "email": "bruce@wayne.com"},
    )
    contact_id = create_res.json()["id"]

    res = await client.get(f"/api/v1/contacts/{contact_id}")
    assert res.status_code == 200
    assert res.json()["id"] == contact_id
    assert res.json()["full_name"] == "Bruce Wayne"


@pytest.mark.asyncio
async def test_get_contact_not_found(client: AsyncClient):
    """Verify 404 for nonexistent contact UUID."""
    res = await client.get(f"/api/v1/contacts/{uuid.uuid4()}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_list_and_filter_contacts(client: AsyncClient):
    """Verify contact listing, search matching, and company filtering."""
    # List seeded contacts
    res = await client.get("/api/v1/contacts")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1

    # Filter by seeded company
    filtered_res = await client.get(f"/api/v1/contacts?company_id={TEST_COMPANY_ID}")
    assert filtered_res.status_code == 200
    assert len(filtered_res.json()["items"]) >= 1

    # Search keyword
    search_res = await client.get("/api/v1/contacts?search=Alice")
    assert search_res.status_code == 200
    assert any(c["first_name"] == "Alice" for c in search_res.json()["items"])


@pytest.mark.asyncio
async def test_update_contact_patch(client: AsyncClient):
    """Verify partially updating a contact."""
    create_res = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Clark", "last_name": "Kent", "job_title": "Reporter"},
    )
    contact_id = create_res.json()["id"]

    patch_res = await client.patch(
        f"/api/v1/contacts/{contact_id}",
        json={"job_title": "Senior Investigative Journalist", "phone": "+1999888777"},
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["job_title"] == "Senior Investigative Journalist"
    assert updated["phone"] == "+1999888777"


@pytest.mark.asyncio
async def test_delete_contact(client: AsyncClient):
    """Verify deleting a contact returns 204."""
    create_res = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Temporary", "last_name": "Contact"},
    )
    contact_id = create_res.json()["id"]

    del_res = await client.delete(f"/api/v1/contacts/{contact_id}")
    assert del_res.status_code == 204

    get_res = await client.get(f"/api/v1/contacts/{contact_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_contacts_sorting_and_user_eager_load(client: AsyncClient):
    """Verify sorting order (asc/desc) and eager loading of user relationship."""
    res_desc = await client.get("/api/v1/contacts?sort_field=created_at&sort_order=desc&limit=10")
    assert res_desc.status_code == 200
    items_desc = res_desc.json()["items"]
    assert isinstance(items_desc, list)

    res_asc = await client.get("/api/v1/contacts?sort_field=created_at&sort_order=asc&limit=10")
    assert res_asc.status_code == 200
    items_asc = res_asc.json()["items"]
    assert isinstance(items_asc, list)

    # Verify user field exists on items
    if items_desc:
        assert "user" in items_desc[0]


@pytest.mark.asyncio
async def test_create_contact_duplicate_name_rejected(client: AsyncClient):
    """Verify 409 Conflict when creating a contact with the same first and last name (case-insensitive)."""
    res1 = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Arthur", "last_name": "Dent", "email": "arthur@earth.org"},
    )
    assert res1.status_code == 201

    res2 = await client.post(
        "/api/v1/contacts",
        json={"first_name": "arthur", "last_name": "DENT", "email": "different@earth.org"},
    )
    assert res2.status_code == 409
    assert "duplicate contact detected" in res2.json()["detail"].lower()
    assert "arthur dent" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_contact_duplicate_email_rejected(client: AsyncClient):
    """Verify 409 Conflict when creating a contact with an already registered email."""
    res1 = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Ford", "last_name": "Prefect", "email": "ford@guide.galaxy"},
    )
    assert res1.status_code == 201

    res2 = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Zaphod", "last_name": "Beeblebrox", "email": "FORD@guide.galaxy"},
    )
    assert res2.status_code == 409
    assert "duplicate contact detected" in res2.json()["detail"].lower()
    assert "ford@guide.galaxy" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_contact_duplicate_phone_rejected(client: AsyncClient):
    """Verify 409 Conflict when creating a contact with an already registered phone number."""
    res1 = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Tricia", "last_name": "McMillan", "phone": "+1 (555) 321-7890"},
    )
    assert res1.status_code == 201

    res2 = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Trillian", "last_name": "Astra", "phone": "15553217890"},
    )
    assert res2.status_code == 409
    assert "duplicate contact detected" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_update_contact_duplicate_rejected(client: AsyncClient):
    """Verify 409 Conflict when updating a contact to collide with another contact's name."""
    res_a = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Contact", "last_name": "One", "email": "one@example.com"},
    )
    assert res_a.status_code == 201

    res_b = await client.post(
        "/api/v1/contacts",
        json={"first_name": "Contact", "last_name": "Two", "email": "two@example.com"},
    )
    assert res_b.status_code == 201
    b_id = res_b.json()["id"]

    # Try to rename Contact Two to Contact One
    patch_res = await client.patch(
        f"/api/v1/contacts/{b_id}",
        json={"first_name": "Contact", "last_name": "One"},
    )
    assert patch_res.status_code == 409
    assert "duplicate contact detected" in patch_res.json()["detail"].lower()
