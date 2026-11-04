import pytest
from httpx import ASGITransport, AsyncClient
from pydantic_core import ValidationError

from backend.app.core.config import Settings
from backend.app.core.limiter import Limiter
from backend.app.schemas.auth import RegisterRequest, UserCreateRequest


def test_production_secret_key_rejection():
    """Verify that Settings raises ValidationError if default SECRET_KEY is used in production."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="default_development_secret_key_change_in_production_32bytes",
        )
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(exc_info.value)


def test_production_short_secret_key_rejection():
    """Verify that Settings raises ValidationError if SECRET_KEY is shorter than 32 characters in production."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="too_short_key",
        )
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(exc_info.value)


def test_production_valid_secret_key_allowed():
    """Verify that Settings successfully loads when a strong 32+ char key is provided."""
    strong_key = "a_very_strong_production_secret_key_that_is_long_enough_12345"
    s = Settings(
        ENVIRONMENT="production",
        SECRET_KEY=strong_key,
    )
    assert s.ENVIRONMENT == "production"
    assert s.SECRET_KEY == strong_key


def test_password_policy_schema_validation():
    """Verify that passwords shorter than 8 characters fail schema validation."""
    # Under 8 chars should fail
    with pytest.raises(ValidationError):
        RegisterRequest(
            email="test@example.com",
            full_name="Test User",
            password="short",  # 5 chars
        )

    with pytest.raises(ValidationError):
        UserCreateRequest(
            email="test@example.com",
            full_name="Test User",
            password="123",  # 3 chars
        )

    # 8 or more chars should succeed
    valid_reg = RegisterRequest(
        email="test@example.com",
        full_name="Test User",
        password="eightchars",
    )
    assert valid_reg.password == "eightchars"


@pytest.mark.asyncio
async def test_register_short_password_api_rejected(client: AsyncClient):
    """Verify that API endpoint rejects registration with 422 if password has fewer than 8 characters."""
    payload = {
        "email": "shortpw@example.com",
        "full_name": "Short Password User",
        "password": "12345",  # 5 characters
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
