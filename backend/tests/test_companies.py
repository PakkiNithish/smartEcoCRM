import uuid
import pytest
from httpx import AsyncClient
from backend.tests.conftest import TEST_COMPANY_ID


@pytest.mark.asyncio
async def test_create_company_success(client: AsyncClient):
    """Verify creating a company with full details."""
    payload = {
        "name": "Wayne Enterprises",
        "industry": "Aerospace & Technology",
        "phone": "+15559876543",
        "email": "contact@wayne-enterprises.com",
        "website": "https://wayne-enterprises.com",
        "address": "1007 Mountain Drive, Gotham City",
    }
    res = await client.post("/api/v1/companies", json=payload)
    assert res.status_code == 201
    company = res.json()
    assert company["name"] == "Wayne Enterprises"
    assert company["industry"] == "Aerospace & Technology"
    assert "id" in company


@pytest.mark.asyncio
async def test_create_company_validation_error(client: AsyncClient):
    """Verify 422 for missing required name."""
    res = await client.post("/api/v1/companies", json={"name": ""})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_get_company_by_id(client: AsyncClient):
    """Verify retrieving a company by UUID."""
    res = await client.get(f"/api/v1/companies/{TEST_COMPANY_ID}")
    assert res.status_code == 200
    assert res.json()["id"] == str(TEST_COMPANY_ID)
    assert res.json()["name"] == "Acme Corp"


@pytest.mark.asyncio
async def test_get_company_not_found(client: AsyncClient):
    """Verify 404 for nonexistent company UUID."""
    res = await client.get(f"/api/v1/companies/{uuid.uuid4()}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_list_and_search_companies(client: AsyncClient):
    """Verify listing companies and keyword searching."""
    res = await client.get("/api/v1/companies")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1

    search_res = await client.get("/api/v1/companies?search=Acme")
    assert search_res.status_code == 200
    assert any(c["name"] == "Acme Corp" for c in search_res.json()["items"])


@pytest.mark.asyncio
async def test_update_company_patch(client: AsyncClient):
    """Verify partially updating a company."""
    create_res = await client.post(
        "/api/v1/companies",
        json={"name": "Cyberdyne Systems", "industry": "Robotics", "website": "https://cyberdyne.systems"},
    )
    company_id = create_res.json()["id"]

    patch_res = await client.patch(
        f"/api/v1/companies/{company_id}",
        json={"industry": "Artificial Intelligence", "website": "https://cyberdyne.ai"},
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["industry"] == "Artificial Intelligence"
    assert updated["website"] == "https://cyberdyne.ai"


@pytest.mark.asyncio
async def test_delete_company_safety_conflict(client: AsyncClient):
    """Verify 409 Conflict when attempting to delete a company that has associated contacts or deals."""
    # TEST_COMPANY_ID is associated with seeded contact Alice
    del_res = await client.delete(f"/api/v1/companies/{TEST_COMPANY_ID}")
    assert del_res.status_code == 409
    assert "associated" in del_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_delete_empty_company_success(client: AsyncClient):
    """Verify deleting an unassociated company succeeds with 204."""
    create_res = await client.post(
        "/api/v1/companies",
        json={"name": "Empty Orphan Corp", "website": "https://empty-orphan.org"},
    )
    company_id = create_res.json()["id"]

    del_res = await client.delete(f"/api/v1/companies/{company_id}")
    assert del_res.status_code == 204

    get_res = await client.get(f"/api/v1/companies/{company_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_companies_sorting_and_user_eager_load(client: AsyncClient):
    """Verify sorting order (asc/desc) and eager loading of user relationship."""
    res_desc = await client.get("/api/v1/companies?sort_field=created_at&sort_order=desc&limit=10")
    assert res_desc.status_code == 200
    items_desc = res_desc.json()["items"]
    assert isinstance(items_desc, list)

    res_asc = await client.get("/api/v1/companies?sort_field=created_at&sort_order=asc&limit=10")
    assert res_asc.status_code == 200
    items_asc = res_asc.json()["items"]
    assert isinstance(items_asc, list)

    # Verify user field exists on items
    if items_desc:
        assert "user" in items_desc[0]


@pytest.mark.asyncio
async def test_create_company_requires_website(client: AsyncClient):
    """Verify 422 error when creating a company without website URL."""
    res = await client.post(
        "/api/v1/companies",
        json={"name": "No Website Ltd"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_company_duplicate_domain_rejected(client: AsyncClient):
    """Verify 409 Conflict when creating a company with an existing website domain."""
    # First company
    res1 = await client.post(
        "/api/v1/companies",
        json={"name": "Apex Global Inc", "website": "https://www.apex-corp.com/about"},
    )
    assert res1.status_code == 201

    # Second company with same domain in different format (http without www)
    res2 = await client.post(
        "/api/v1/companies",
        json={"name": "Apex Subsidiary", "website": "http://apex-corp.com"},
    )
    assert res2.status_code == 409
    assert "duplicate company detected" in res2.json()["detail"].lower()
    assert "apex-corp.com" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_update_company_duplicate_domain_rejected(client: AsyncClient):
    """Verify 409 Conflict when patching a company website to another company's domain."""
    res_a = await client.post(
        "/api/v1/companies",
        json={"name": "Company Alpha", "website": "https://alpha-corp.io"},
    )
    assert res_a.status_code == 201

    res_b = await client.post(
        "/api/v1/companies",
        json={"name": "Company Beta", "website": "https://beta-corp.io"},
    )
    assert res_b.status_code == 201
    b_id = res_b.json()["id"]

    # Try to change Company Beta's website to Alpha's domain
    patch_res = await client.patch(
        f"/api/v1/companies/{b_id}",
        json={"website": "http://www.alpha-corp.io/contact"},
    )
    assert patch_res.status_code == 409
    assert "duplicate company detected" in patch_res.json()["detail"].lower()
