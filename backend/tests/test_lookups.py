import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_users_lookup(client: AsyncClient):
    """Verify listing active users for assignment."""
    res = await client.get("/api/v1/users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 1
    assert any(u["email"] == "agent@example.com" for u in users)
