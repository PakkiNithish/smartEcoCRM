import uuid
import pytest
from httpx import AsyncClient
from backend.tests.conftest import (
    STAGE_NEW_ID,
    STAGE_PAPERS_ID,
    STAGE_INVOICE_ID,
    TEST_USER_ID,
    TEST_COMPANY_ID,
    TEST_CONTACT_ID,
)


@pytest.mark.asyncio
async def test_get_pipeline_stages(client: AsyncClient):
    """Verify configured pipeline stages retrieval in correct order."""
    response = await client.get("/api/v1/pipeline-stages")
    assert response.status_code == 200
    stages = response.json()
    assert len(stages) == 6
    assert stages[0]["name"] == "New"
    assert stages[0]["order"] == 1
    assert stages[5]["name"] == "Close deal"
    assert stages[5]["is_won"] is True


@pytest.mark.asyncio
async def test_create_deal_success(client: AsyncClient):
    """Verify successful deal creation with full relational links."""
    payload = {
        "title": "Enterprise Cloud Deal",
        "amount": "15000.50",
        "currency": "USD",
        "stage_id": str(STAGE_NEW_ID),
        "contact_id": str(TEST_CONTACT_ID),
        "company_id": str(TEST_COMPANY_ID),
        "responsible_user_id": str(TEST_USER_ID),
        "expected_close_date": "2026-12-31",
        "description": "Annual enterprise license agreement",
    }
    response = await client.post("/api/v1/deals", json=payload)
    assert response.status_code == 201
    deal = response.json()
    assert deal["title"] == payload["title"]
    assert float(deal["amount"]) == 15000.50
    assert deal["currency"] == "USD"
    assert deal["stage"]["name"] == "New"
    assert deal["contact"]["first_name"] == "Alice"
    assert deal["company"]["name"] == "Acme Corp"
    assert deal["responsible_user"]["full_name"] == "Agent Smith"
    assert "id" in deal
    assert "created_at" in deal
    assert "updated_at" in deal


@pytest.mark.asyncio
async def test_create_deal_minimal(client: AsyncClient):
    """Verify deal creation with only required fields."""
    payload = {
        "title": "Quick Consultation Deal",
        "amount": "500.00",
        "currency": "USD",
        "stage_id": str(STAGE_NEW_ID),
    }
    response = await client.post("/api/v1/deals", json=payload)
    assert response.status_code == 201
    deal = response.json()
    assert deal["title"] == "Quick Consultation Deal"
    assert deal["contact"] is None
    assert deal["company"] is None


@pytest.mark.asyncio
async def test_create_deal_invalid_foreign_key(client: AsyncClient):
    """Verify 400 Bad Request when referencing nonexistent pipeline stage or contact."""
    nonexistent_uuid = str(uuid.uuid4())
    payload = {
        "title": "Invalid Deal",
        "amount": "100.00",
        "stage_id": nonexistent_uuid,
    }
    response = await client.post("/api/v1/deals", json=payload)
    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_deal_invalid_inputs(client: AsyncClient):
    """Verify 422 Unprocessable Entity for negative amount or missing/empty title."""
    # Negative amount
    response = await client.post(
        "/api/v1/deals",
        json={"title": "Negative Deal", "amount": "-50.00", "stage_id": str(STAGE_NEW_ID)},
    )
    assert response.status_code == 422

    # Blank title
    response = await client.post(
        "/api/v1/deals",
        json={"title": "", "amount": "100.00", "stage_id": str(STAGE_NEW_ID)},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_deal_by_id(client: AsyncClient):
    """Verify retrieving a deal by its UUID."""
    # Create deal first
    create_res = await client.post(
        "/api/v1/deals",
        json={"title": "Deal to Get", "amount": "2000.00", "stage_id": str(STAGE_NEW_ID)},
    )
    deal_id = create_res.json()["id"]

    # Fetch deal
    get_res = await client.get(f"/api/v1/deals/{deal_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == deal_id
    assert get_res.json()["title"] == "Deal to Get"


@pytest.mark.asyncio
async def test_get_deal_not_found(client: AsyncClient):
    """Verify 404 Not Found for nonexistent deal UUID."""
    random_uuid = str(uuid.uuid4())
    response = await client.get(f"/api/v1/deals/{random_uuid}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_list_and_filter_deals(client: AsyncClient):
    """Verify listing deals, search query matching, and stage filtering."""
    # Create 3 deals in different stages
    await client.post(
        "/api/v1/deals",
        json={"title": "Alpha Website Redesign", "amount": "3000.00", "stage_id": str(STAGE_NEW_ID)},
    )
    await client.post(
        "/api/v1/deals",
        json={"title": "Beta Mobile App", "amount": "7000.00", "stage_id": str(STAGE_PAPERS_ID)},
    )
    await client.post(
        "/api/v1/deals",
        json={"title": "Gamma Cloud Migration", "amount": "12000.00", "stage_id": str(STAGE_INVOICE_ID)},
    )

    # List all
    all_res = await client.get("/api/v1/deals")
    assert all_res.status_code == 200
    all_data = all_res.json()
    assert all_data["total"] >= 3

    # Filter by stage_id
    stage_res = await client.get(f"/api/v1/deals?stage_id={STAGE_PAPERS_ID}")
    assert stage_res.status_code == 200
    stage_data = stage_res.json()
    assert len(stage_data["items"]) == 1
    assert stage_data["items"][0]["title"] == "Beta Mobile App"

    # Search by keyword
    search_res = await client.get("/api/v1/deals?search=Migration")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert len(search_data["items"]) == 1
    assert search_data["items"][0]["title"] == "Gamma Cloud Migration"


@pytest.mark.asyncio
async def test_update_deal_patch(client: AsyncClient):
    """Verify partially updating a deal (PATCH)."""
    create_res = await client.post(
        "/api/v1/deals",
        json={"title": "Original Deal", "amount": "1000.00", "stage_id": str(STAGE_NEW_ID)},
    )
    deal_id = create_res.json()["id"]

    # Partial update: change title, amount, and move to STAGE_PAPERS
    patch_res = await client.patch(
        f"/api/v1/deals/{deal_id}",
        json={"title": "Updated Deal Title", "amount": "4500.00", "stage_id": str(STAGE_PAPERS_ID)},
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["title"] == "Updated Deal Title"
    assert float(updated["amount"]) == 4500.00
    assert updated["stage"]["name"] == "Create papers"


@pytest.mark.asyncio
async def test_update_deal_not_found(client: AsyncClient):
    """Verify 404 for updating nonexistent deal."""
    random_uuid = str(uuid.uuid4())
    patch_res = await client.patch(f"/api/v1/deals/{random_uuid}", json={"title": "New Title"})
    assert patch_res.status_code == 404


@pytest.mark.asyncio
async def test_delete_deal(client: AsyncClient):
    """Verify deleting a deal returns 204 and subsequently 404 on fetch."""
    create_res = await client.post(
        "/api/v1/deals",
        json={"title": "Deal to Delete", "amount": "100.00", "stage_id": str(STAGE_NEW_ID)},
    )
    deal_id = create_res.json()["id"]

    # Delete
    del_res = await client.delete(f"/api/v1/deals/{deal_id}")
    assert del_res.status_code == 204

    # Verify no longer exists
    get_res = await client.get(f"/api/v1/deals/{deal_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_delete_deal_not_found(client: AsyncClient):
    """Verify 404 for deleting nonexistent deal."""
    random_uuid = str(uuid.uuid4())
    del_res = await client.delete(f"/api/v1/deals/{random_uuid}")
    assert del_res.status_code == 404


@pytest.mark.asyncio
async def test_create_deal_with_empty_strings(client: AsyncClient):
    """Verify creating a deal with empty string optional fields succeeds and defaults stage."""
    payload = {
        "title": "Deal with Empty Strings",
        "stage_id": "",
        "contact_id": "",
        "company_id": "",
        "responsible_user_id": "",
        "expected_close_date": "",
    }
    response = await client.post("/api/v1/deals", json=payload)
    assert response.status_code == 201
    deal = response.json()
    assert deal["title"] == "Deal with Empty Strings"
    assert deal["stage"] is not None
    assert deal["contact"] is None
    assert deal["company"] is None


@pytest.mark.asyncio
async def test_create_deal_with_company_selection(client: AsyncClient):
    """Verify creating a deal with selected company properly populates company relation."""
    payload = {
        "title": "Corporate Expansion Deal",
        "stage_id": str(STAGE_NEW_ID),
        "company_id": str(TEST_COMPANY_ID),
        "amount": 50000,
    }
    response = await client.post("/api/v1/deals", json=payload)
    assert response.status_code == 201
    deal = response.json()
    assert deal["company"] is not None
    assert deal["company"]["id"] == str(TEST_COMPANY_ID)
    assert deal["company"]["name"] == "Acme Corp"
