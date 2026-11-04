import pytest
from httpx import AsyncClient

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.user import User
from backend.tests.conftest import STAGE_NEW_ID


@pytest.mark.asyncio
async def test_shared_company_workspace_isolation(client: AsyncClient, db_session):
    """Verify that users in the same company share records, but are isolated from other companies."""
    # Create two users in Alpha Corp
    user_alpha1 = User(
        email="alpha1@alphacorp.com",
        full_name="Alpha One",
        hashed_password=get_password_hash("password123"),
        role="agent",
        company_name="Alpha Corp",
        is_active=True,
    )
    user_alpha2 = User(
        email="alpha2@alphacorp.com",
        full_name="Alpha Two",
        hashed_password=get_password_hash("password123"),
        role="agent",
        company_name="Alpha Corp",
        is_active=True,
    )
    # Create one user in Beta Corp
    user_beta = User(
        email="beta@betacorp.com",
        full_name="Beta User",
        hashed_password=get_password_hash("password123"),
        role="agent",
        company_name="Beta Corp",
        is_active=True,
    )
    db_session.add_all([user_alpha1, user_alpha2, user_beta])
    await db_session.commit()
    await db_session.refresh(user_alpha1)
    await db_session.refresh(user_alpha2)
    await db_session.refresh(user_beta)

    token_alpha1 = create_access_token(user_alpha1.id, role="agent")
    token_alpha2 = create_access_token(user_alpha2.id, role="agent")
    token_beta = create_access_token(user_beta.id, role="agent")

    headers_alpha1 = {"Authorization": f"Bearer {token_alpha1}"}
    headers_alpha2 = {"Authorization": f"Bearer {token_alpha2}"}
    headers_beta = {"Authorization": f"Bearer {token_beta}"}

    # 1. User Alpha1 creates a Deal
    deal_payload = {
        "title": "Alpha Corp Big Deal",
        "amount": "50000.00",
        "currency": "USD",
        "stage_id": str(STAGE_NEW_ID),
    }
    create_deal_res = await client.post("/api/v1/deals", json=deal_payload, headers=headers_alpha1)
    assert create_deal_res.status_code == 201
    created_deal = create_deal_res.json()
    assert created_deal["title"] == "Alpha Corp Big Deal"
    assert created_deal["company_name"] == "Alpha Corp"

    # 2. User Alpha2 can see Alpha1's deal in the shared workspace
    list_alpha2 = await client.get("/api/v1/deals", headers=headers_alpha2)
    assert list_alpha2.status_code == 200
    alpha2_deals = list_alpha2.json()["items"]
    assert any(d["id"] == created_deal["id"] for d in alpha2_deals)

    # 3. User Beta CANNOT see Alpha's deal
    list_beta = await client.get("/api/v1/deals", headers=headers_beta)
    assert list_beta.status_code == 200
    beta_deals = list_beta.json()["items"]
    assert not any(d["id"] == created_deal["id"] for d in beta_deals)

    # 4. User Beta cannot fetch Alpha's deal directly by ID
    get_beta = await client.get(f"/api/v1/deals/{created_deal['id']}", headers=headers_beta)
    assert get_beta.status_code == 404
