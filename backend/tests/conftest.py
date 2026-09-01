"""
SmartVault Pytest Configuration & Test Fixtures
"""

import os
import sys
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Ensure repository root is on sys.path
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

# Set testing environment variables before importing app
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_smartvault.db"
os.environ["STORAGE_DIR"] = "./test_storage"
os.environ["EVENT_CONSUMER_KEY"] = "smartvault-local-consumer"
os.environ["SESSION_COOKIE_SECURE"] = "false"

from backend.server import app
from backend.lib.pg import db
from backend.lib.storage import storage


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_environment():
    """Initialize test database and storage before running test suite."""
    db.sqlite_db_path = os.path.abspath("./test_smartvault.db")
    db.is_postgres = False
    await db.init_schema()
    await db.seed_demo_user()
    yield
    # Cleanup test files
    if os.path.exists("./test_smartvault.db"):
        try:
            os.remove("./test_smartvault.db")
        except Exception:
            pass
    if os.path.exists("./test_storage"):
        try:
            import shutil
            shutil.rmtree("./test_storage", ignore_errors=True)
        except Exception:
            pass


@pytest_asyncio.fixture
async def client():
    """Async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient):
    """Authenticated async test client with demo user session cookie."""
    login_resp = await client.post(
        "/api/auth/login",
        json={"email": "user123@example.com", "password": "123"}
    )
    assert login_resp.status_code == 200
    yield client
