import pytest
from httpx import AsyncClient

from backend.app.models.pipeline_stage import PipelineStage


@pytest.mark.asyncio
async def test_deals_bulk_create_and_delete(client: AsyncClient, auth_token: str, db_session):
    """Test bulk creating and bulk deleting deals."""
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Fetch stage ID
    stages_res = await client.get("/api/v1/pipeline-stages", headers=headers)
    stage_id = stages_res.json()[0]["id"]

    # 1. Bulk create 3 deals (one with AED currency)
    bulk_payload = {
        "items": [
            {
                "title": "Enterprise Cloud UAE",
                "amount": "150000.00",
                "currency": "AED",
                "stage_id": stage_id,
            },
            {
                "title": "Dubai Tech Deal",
                "amount": "85000.00",
                "currency": "AED",
                "stage_id": stage_id,
            },
            {
                "title": "Global License",
                "amount": "25000.00",
                "currency": "USD",
                "stage_id": stage_id,
            },
        ]
    }
    create_res = await client.post("/api/v1/deals/bulk", json=bulk_payload, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["created_count"] == 3
    assert len(created_data["items"]) == 3
    assert created_data["items"][0]["currency"] == "AED"
    deal_ids = [d["id"] for d in created_data["items"]]

    # 2. Bulk delete 2 deals
    delete_payload = {"ids": [deal_ids[0], deal_ids[1]]}
    del_res = await client.post("/api/v1/deals/bulk-delete", json=delete_payload, headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["deleted_count"] == 2

    # Verify first deal is gone
    get_res = await client.get(f"/api/v1/deals/{deal_ids[0]}", headers=headers)
    assert get_res.status_code == 404

    # Verify third deal is still present
    get_res3 = await client.get(f"/api/v1/deals/{deal_ids[2]}", headers=headers)
    assert get_res3.status_code == 200


@pytest.mark.asyncio
async def test_contacts_bulk_create_and_delete(client: AsyncClient, auth_token: str):
    """Test bulk creating and bulk deleting contacts."""
    headers = {"Authorization": f"Bearer {auth_token}"}

    bulk_payload = {
        "items": [
            {"first_name": "Tariq", "last_name": "Mansour", "email": "tariq@uaebiz.ae"},
            {"first_name": "Fatima", "last_name": "Al-Zahra", "email": "fatima@uaebiz.ae"},
        ]
    }
    create_res = await client.post("/api/v1/contacts/bulk", json=bulk_payload, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["created_count"] == 2
    contact_ids = [c["id"] for c in created_data["items"]]

    # Bulk delete contacts
    del_res = await client.post("/api/v1/contacts/bulk-delete", json={"ids": contact_ids}, headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["deleted_count"] == 2


@pytest.mark.asyncio
async def test_companies_bulk_create_and_delete(client: AsyncClient, auth_token: str):
    """Test bulk creating and bulk deleting companies."""
    headers = {"Authorization": f"Bearer {auth_token}"}

    bulk_payload = {
        "items": [
            {"name": "Emirates FinTech Group", "industry": "Finance", "website": "https://emiratesfintech.ae"},
            {"name": "Gulf Logistics Ltd", "industry": "Logistics", "website": "https://gulflogistics.ae"},
        ]
    }
    create_res = await client.post("/api/v1/companies/bulk", json=bulk_payload, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["created_count"] == 2
    company_ids = [c["id"] for c in created_data["items"]]

    # Bulk delete companies
    del_res = await client.post("/api/v1/companies/bulk-delete", json={"ids": company_ids}, headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["deleted_count"] == 2
