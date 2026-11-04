import os
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.app.core.config import settings

# Disable rate limiter during automated testing to prevent test run throttling
is_testing = (
    settings.ENVIRONMENT.lower() in ("test", "testing")
    or bool(os.environ.get("PYTEST_CURRENT_TEST"))
)

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute"],
    enabled=not is_testing,
)
