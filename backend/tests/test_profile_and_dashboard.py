"""
Tests for SmartVault Dashboard, Profile, Password Changes, and Resend Status
"""

from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from backend.lib.pg import db


@pytest.mark.asyncio
async def test_health_check_endpoint(client: AsyncClient):
    """Test public health check endpoint."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SmartVault"


@pytest.mark.asyncio
async def test_dashboard_endpoint(auth_client: AsyncClient):
    """Test dashboard endpoint returns user metrics and storage info."""
    resp = await auth_client.get("/api/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert "user" in data
    assert "file_count" in data
    assert "storage_used" in data
    assert "recent_files" in data
    assert "recent_activity" in data
    # Ensure no ML scores or risk classifications are leaked to the user
    assert "ml_score" not in data
    assert "threat_level" not in data


@pytest.mark.asyncio
async def test_profile_update_and_password_change(auth_client: AsyncClient):
    """Test profile updates and password changes."""
    # 1. Update Profile Display Name
    update_resp = await auth_client.put(
        "/api/users/me",
        json={"display_name": "Updated Demo User"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["display_name"] == "Updated Demo User"

    # 2. Change Password with wrong current password -> 400
    bad_pwd_resp = await auth_client.post(
        "/api/users/me/password",
        json={"current_password": "wrong", "new_password": "new_secret_123"}
    )
    assert bad_pwd_resp.status_code == 400

    # 3. Change Password successfully
    good_pwd_resp = await auth_client.post(
        "/api/users/me/password",
        json={"current_password": "123", "new_password": "123"}
    )
    assert good_pwd_resp.status_code == 200


@pytest.mark.asyncio
async def test_profile_duplicate_email_conflict(auth_client: AsyncClient):
    """Verify duplicate email update returns 409 Conflict."""
    # Seed a secondary user
    now = datetime.now(timezone.utc)
    await db.execute(
        """
        INSERT INTO users (id, username, email, display_name, password_hash, failed_login_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """,
        "user-conflict-002", "alice", "alice@example.com", "Alice Smith", "hash", 0, now, now
    )

    # Attempt to change demo user email to alice@example.com
    conflict_resp = await auth_client.put(
        "/api/users/me",
        json={"email": "alice@example.com"}
    )
    assert conflict_resp.status_code == 409
    assert "already in use" in conflict_resp.json()["detail"].lower()

    # Clean up secondary user
    await db.execute("DELETE FROM users WHERE id = $1", "user-conflict-002")


@pytest.mark.asyncio
async def test_user_activity_timeline(auth_client: AsyncClient):
    """Test personal activity timeline endpoint."""
    resp = await auth_client.get("/api/activity")
    assert resp.status_code == 200
    activities = resp.json()
    assert isinstance(activities, list)
    if activities:
        act = activities[0]
        assert "description" in act
        assert "timestamp" in act


@pytest.mark.asyncio
async def test_email_integration_status_secret_isolation(client: AsyncClient):
    """Verify Resend status endpoint never returns API keys."""
    resp = await client.get("/api/internal/integrations/email-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["provider"] == "resend"
    assert "configured" in data
    assert "sender" in data
    assert "api_key" not in data
    assert "resend_api_key" not in data
