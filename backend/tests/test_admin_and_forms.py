import pytest
from httpx import AsyncClient

from backend.app.models.user import User
from backend.tests.conftest import TEST_ADMIN_ID, TEST_USER_ID


@pytest.mark.asyncio
async def test_admin_list_and_create_company_users(
    client: AsyncClient, db_session, admin_token: str
):
    """Verify an admin can view and create company team members."""
    # Set company_name on admin user
    admin_user = await db_session.get(User, TEST_ADMIN_ID)
    admin_user.company_name = "Acme Corp"
    await db_session.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create a company employee
    create_payload = {
        "email": "employee@acmecorp.com",
        "full_name": "Acme Employee",
        "password": "strongPassword123",
        "role": "agent",
    }
    res = await client.post("/api/v1/admin/users", json=create_payload, headers=headers)
    assert res.status_code == 201
    created_user = res.json()
    assert created_user["email"] == "employee@acmecorp.com"
    assert created_user["company_name"] == "Acme Corp"
    assert created_user["role"] == "agent"

    # 2. List company users
    list_res = await client.get("/api/v1/admin/users", headers=headers)
    assert list_res.status_code == 200
    users = list_res.json()
    emails = [u["email"] for u in users]
    assert "employee@acmecorp.com" in emails
    assert all("dateLastActive" in u for u in users)
    assert all("last_active_at" in u for u in users)

    # 3. Toggle user active status
    patch_res = await client.patch(
        f"/api/v1/admin/users/{created_user['id']}",
        json={"is_active": False, "role": "manager"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["is_active"] is False
    assert updated["role"] == "manager"

    # 4. Remove company user
    delete_res = await client.delete(
        f"/api/v1/admin/users/{created_user['id']}",
        headers=headers,
    )
    assert delete_res.status_code == 204

    # Verify user is gone from company users list
    list_after = await client.get("/api/v1/admin/users", headers=headers)
    assert "employee@acmecorp.com" not in [u["email"] for u in list_after.json()]


@pytest.mark.asyncio
async def test_normal_user_blocked_from_admin_endpoints(
    client: AsyncClient, auth_token: str
):
    """Verify regular agents are forbidden from accessing admin user endpoints."""
    headers = {"Authorization": f"Bearer {auth_token}"}

    res = await client.get("/api/v1/admin/users", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_form_config_retrieval_and_customization(
    client: AsyncClient, db_session, admin_token: str, auth_token: str
):
    """Verify admins can customize form fields and agents receive the customized configuration."""
    admin_user = await db_session.get(User, TEST_ADMIN_ID)
    agent_user = await db_session.get(User, TEST_USER_ID)
    admin_user.company_name = "InnovateTech"
    agent_user.company_name = "InnovateTech"
    await db_session.commit()

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    agent_headers = {"Authorization": f"Bearer {auth_token}"}

    # 1. Agent fetches default deal form config
    res = await client.get("/api/v1/forms/deal", headers=agent_headers)
    assert res.status_code == 200
    config_data = res.json()
    assert config_data["entity_type"] == "deal"
    field_keys = [f["key"] for f in config_data["fields_config"]]
    assert "title" in field_keys
    assert "amount" in field_keys

    # 2. Admin adds a custom field
    custom_field = {
        "key": "cf_budget_approved",
        "label": "Budget Approved",
        "type": "checkbox",
        "required": False,
        "enabled": True,
        "is_custom": True,
    }
    updated_fields = config_data["fields_config"] + [custom_field]

    update_res = await client.put(
        "/api/v1/forms/deal",
        json={"fields_config": updated_fields},
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    saved = update_res.json()
    saved_keys = [f["key"] for f in saved["fields_config"]]
    assert "cf_budget_approved" in saved_keys

    # 3. Agent now gets the customized config with the custom field
    agent_res = await client.get("/api/v1/forms/deal", headers=agent_headers)
    assert agent_res.status_code == 200
    agent_config = agent_res.json()
    agent_keys = [f["key"] for f in agent_config["fields_config"]]
    assert "cf_budget_approved" in agent_keys

    # 4. Agent can also add/update form configs for their company
    agent_put = await client.put(
        "/api/v1/forms/deal",
        json={"fields_config": updated_fields},
        headers=agent_headers,
    )
    assert agent_put.status_code == 200


@pytest.mark.asyncio
async def test_admin_change_role_agent_to_admin_and_back(
    client: AsyncClient, db_session, admin_token: str
):
    """Verify an admin can promote an agent to admin and demote back to agent."""
    admin_user = await db_session.get(User, TEST_ADMIN_ID)
    admin_user.company_name = "TechFlow"
    await db_session.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create a user with agent role
    create_res = await client.post(
        "/api/v1/admin/users",
        json={
            "email": "agent_promote@techflow.com",
            "full_name": "Promote Test Agent",
            "password": "Password123!",
            "role": "agent",
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    user_data = create_res.json()
    assert user_data["role"] == "agent"
    target_id = user_data["id"]

    # 2. Promote agent to admin
    promote_res = await client.patch(
        f"/api/v1/admin/users/{target_id}",
        json={"role": "admin"},
        headers=headers,
    )
    assert promote_res.status_code == 200
    assert promote_res.json()["role"] == "admin"

    # 3. Demote admin back to agent
    demote_res = await client.patch(
        f"/api/v1/admin/users/{target_id}",
        json={"role": "agent"},
        headers=headers,
    )
    assert demote_res.status_code == 200
    assert demote_res.json()["role"] == "agent"

    # 4. Prevent admin from demoting their own account
    self_demote_res = await client.patch(
        f"/api/v1/admin/users/{TEST_ADMIN_ID}",
        json={"role": "agent"},
        headers=headers,
    )
    assert self_demote_res.status_code == 400
    assert "cannot demote their own account" in self_demote_res.json()["detail"].lower()


