import uuid
from datetime import timedelta
import pytest
from httpx import AsyncClient

from backend.app.core.security import create_access_token


@pytest.mark.asyncio
async def test_login_success(unauthed_client: AsyncClient):
    """Verify valid credentials return HTTP 200, JWT token, and session cookie."""
    response = await unauthed_client.post(
        "/api/v1/auth/login",
        json={"email": "agent@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "agent@example.com"
    assert data["user"]["role"] == "agent"
    assert "access_token" in response.cookies


@pytest.mark.asyncio
async def test_login_invalid_password(unauthed_client: AsyncClient):
    """Verify wrong password returns HTTP 401 Unauthorized."""
    response = await unauthed_client.post(
        "/api/v1/auth/login",
        json={"email": "agent@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_unknown_email(unauthed_client: AsyncClient):
    """Verify non-existent email returns HTTP 401 Unauthorized."""
    response = await unauthed_client.post(
        "/api/v1/auth/login",
        json={"email": "unknown@example.com", "password": "password123"},
    )
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(unauthed_client: AsyncClient):
    """Verify unauthenticated requests to protected endpoints return HTTP 401."""
    # Test Deals
    res_deals = await unauthed_client.get("/api/v1/deals")
    assert res_deals.status_code == 401
    assert "not authenticated" in res_deals.json()["detail"].lower()

    # Test Contacts
    res_contacts = await unauthed_client.get("/api/v1/contacts")
    assert res_contacts.status_code == 401

    # Test Companies
    res_companies = await unauthed_client.get("/api/v1/companies")
    assert res_companies.status_code == 401

    # Test Tasks
    res_tasks = await unauthed_client.get("/api/v1/tasks")
    assert res_tasks.status_code == 401

    # Test Dashboard
    res_dash = await unauthed_client.get("/api/v1/dashboard/metrics")
    assert res_dash.status_code == 401


@pytest.mark.asyncio
async def test_invalid_token_rejected(unauthed_client: AsyncClient):
    """Verify forged/invalid JWT tokens are rejected with HTTP 401."""
    headers = {"Authorization": "Bearer forged.invalid.token"}
    response = await unauthed_client.get("/api/v1/deals", headers=headers)
    assert response.status_code == 401
    assert "could not validate credentials" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_expired_token_rejected(unauthed_client: AsyncClient):
    """Verify expired JWT tokens are rejected with HTTP 401."""
    expired_token = create_access_token(
        subject=uuid.uuid4(),
        expires_delta=timedelta(minutes=-10),  # expired 10 minutes ago
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = await unauthed_client.get("/api/v1/deals", headers=headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_header_impersonation_prevented(unauthed_client: AsyncClient):
    """Verify arbitrary client-supplied X-User-Id header is rejected without valid JWT."""
    arbitrary_id = "b0000000-0000-0000-0000-000000000001"
    headers = {"X-User-Id": arbitrary_id}
    response = await unauthed_client.get("/api/v1/deals", headers=headers)
    assert response.status_code == 401
    assert "not authenticated" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_role_authorization_forbidden(client: AsyncClient):
    """Verify standard agent role is forbidden (HTTP 403) from admin operations."""
    # Attempt to create user via admin endpoint using default agent token
    response = await client.post(
        "/api/v1/auth/users",
        json={
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "password123",
            "role": "agent",
        },
    )
    assert response.status_code == 403
    assert "not permitted" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_role_authorization_admin_allowed(unauthed_client: AsyncClient, admin_token: str):
    """Verify admin role is allowed to access admin-restricted user creation."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = await unauthed_client.post(
        "/api/v1/auth/users",
        headers=headers,
        json={
            "email": "newagent@example.com",
            "full_name": "New Agent",
            "password": "password123",
            "role": "agent",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newagent@example.com"
    assert data["role"] == "agent"


@pytest.mark.asyncio
async def test_get_current_user_me(client: AsyncClient):
    """Verify /auth/me returns authenticated user profile."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "agent@example.com"
    assert data["full_name"] == "Agent Smith"
    assert data["role"] == "agent"
    assert "password" not in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_logout_endpoint(client: AsyncClient):
    """Verify logout endpoint returns confirmation message."""
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert "logged out" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_register_success(unauthed_client: AsyncClient):
    """Verify public registration creates account, returns token, and sets cookie."""
    response = await unauthed_client.post(
        "/api/v1/auth/register",
        json={
            "email": "sarah.connor@example.com",
            "full_name": "Sarah Connor",
            "password": "securepassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "sarah.connor@example.com"
    assert data["user"]["full_name"] == "Sarah Connor"
    assert data["user"]["role"] == "agent"
    assert data["user"]["last_active_at"] is not None
    assert data["user"]["dateLastActive"] is not None
    assert "access_token" in response.cookies


@pytest.mark.asyncio
async def test_register_with_company_assigns_normal_agent_role_not_admin(unauthed_client: AsyncClient):
    """Verify public signup with company assigns normal agent role without admin center access."""
    response = await unauthed_client.post(
        "/api/v1/auth/register",
        json={
            "email": "normal.signup@example.com",
            "full_name": "Normal Employee",
            "company_name": "Acme Ventures",
            "password": "securepassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["role"] == "agent"
    assert data["user"]["company_name"] == "Acme Ventures"
    assert data["user"]["last_active_at"] is not None
    assert data["user"]["dateLastActive"] is not None

    token = data["access_token"]
    # Normal user must be blocked from Admin Center
    admin_res = await unauthed_client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert admin_res.status_code == 403


@pytest.mark.asyncio
async def test_register_duplicate_email(unauthed_client: AsyncClient):
    """Verify attempting to register with an existing email returns HTTP 400."""
    response = await unauthed_client.post(
        "/api/v1/auth/register",
        json={
            "email": "agent@example.com",  # Already seeded in conftest
            "full_name": "Duplicate Agent",
            "password": "securepassword123",
        },
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_account_data_isolation(client: AsyncClient, unauthed_client: AsyncClient):
    """Verify that different accounts have strictly isolated workspaces."""
    # 1. User A creates a deal
    stage_id = "a0000000-0000-0000-0000-000000000001"
    deal_resp = await client.post(
        "/api/v1/deals",
        json={"title": "User A Private Deal", "amount": "5000.00", "stage_id": stage_id},
    )
    assert deal_resp.status_code == 201
    user_a_deal_id = deal_resp.json()["id"]

    # 2. Register User B
    reg_resp = await unauthed_client.post(
        "/api/v1/auth/register",
        json={
            "email": "user_b@company.com",
            "full_name": "User B",
            "password": "userb_password",
        },
    )
    assert reg_resp.status_code == 201
    user_b_token = reg_resp.json()["access_token"]
    user_b_headers = {"Authorization": f"Bearer {user_b_token}"}

    # 3. User B lists deals -> should NOT see User A's deal
    user_b_deals = await unauthed_client.get("/api/v1/deals", headers=user_b_headers)
    assert user_b_deals.status_code == 200
    assert user_b_deals.json()["total"] == 0
    assert len(user_b_deals.json()["items"]) == 0

    # 4. User B attempts to access User A's deal by ID -> returns 404 Not Found
    get_a_deal = await unauthed_client.get(f"/api/v1/deals/{user_a_deal_id}", headers=user_b_headers)
    assert get_a_deal.status_code == 404

    # 5. User B creates their own deal
    b_deal_resp = await unauthed_client.post(
        "/api/v1/deals",
        json={"title": "User B Private Deal", "amount": "9000.00", "stage_id": stage_id},
        headers=user_b_headers,
    )
    assert b_deal_resp.status_code == 201

    # 6. User A lists deals -> should see only User A's deal, not User B's deal
    user_a_deals = await client.get("/api/v1/deals")
    assert user_a_deals.status_code == 200
    deal_titles = [d["title"] for d in user_a_deals.json()["items"]]
    assert "User A Private Deal" in deal_titles
    assert "User B Private Deal" not in deal_titles


@pytest.mark.asyncio
async def test_update_user_profile_name_and_company(client: AsyncClient, unauthed_client: AsyncClient, admin_token: str):
    """Verify authenticated users and admins can edit their profile details."""
    # 1. Agent updates name
    patch_resp = await client.patch(
        "/api/v1/auth/me",
        json={"full_name": "Agent Smith Updated"},
    )
    assert patch_resp.status_code == 200
    data = patch_resp.json()
    assert data["full_name"] == "Agent Smith Updated"

    # 2. Admin updates name and company name
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    admin_patch = await unauthed_client.patch(
        "/api/v1/auth/me",
        headers=admin_headers,
        json={"full_name": "Admin Superuser", "company_name": "Telugu Cine Global"},
    )
    assert admin_patch.status_code == 200
    admin_data = admin_patch.json()
    assert admin_data["full_name"] == "Admin Superuser"
    assert admin_data["company_name"] == "Telugu Cine Global"


@pytest.mark.asyncio
async def test_update_user_profile_password(unauthed_client: AsyncClient):
    """Verify changing account password requires valid current password and allows subsequent login."""
    # Register test user
    reg = await unauthed_client.post(
        "/api/v1/auth/register",
        json={"email": "passchange@example.com", "full_name": "Password User", "password": "oldpassword123"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Wrong current password
    fail_resp = await unauthed_client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={"current_password": "wrongpassword", "new_password": "newpassword123"},
    )
    assert fail_resp.status_code == 400
    assert "incorrect" in fail_resp.json()["detail"].lower()

    # Correct password change
    ok_resp = await unauthed_client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={"current_password": "oldpassword123", "new_password": "newpassword123"},
    )
    assert ok_resp.status_code == 200

    # Login with new password
    login_resp = await unauthed_client.post(
        "/api/v1/auth/login",
        json={"email": "passchange@example.com", "password": "newpassword123"},
    )
    assert login_resp.status_code == 200


