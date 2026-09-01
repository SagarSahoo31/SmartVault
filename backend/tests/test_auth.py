"""
Tests for SmartVault Authentication, Lockout, and Session Management
"""

import pytest
from httpx import AsyncClient
from backend.lib.pg import db


@pytest.mark.asyncio
async def test_login_success_with_email(client: AsyncClient):
    """Verify login with email succeeds and sets session cookie."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": "user123@example.com", "password": "123"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["email"] == "user123@example.com"
    assert data["user"]["username"] == "user123"
    assert "smartvault_session" in resp.cookies


@pytest.mark.asyncio
async def test_login_success_with_username_compatibility(client: AsyncClient):
    """Verify legacy username compatibility login."""
    resp = await client.post(
        "/api/auth/login",
        json={"username": "user123", "password": "123"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["username"] == "user123"
    assert data["user"]["email"] == "user123@example.com"


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    """Verify wrong password fails with generic 401."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": "user123@example.com", "password": "wrongpassword"}
    )
    assert resp.status_code == 401
    assert "The username or password was not accepted." in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_unknown_user_returns_generic_401(client: AsyncClient):
    """Verify non-existent email returns identical generic 401 (preventing user enumeration)."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": "nonexistent@example.com", "password": "123"}
    )
    assert resp.status_code == 401
    assert "The username or password was not accepted." in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_malformed_email(client: AsyncClient):
    """Verify malformed email returns 422."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": "not-an-email", "password": "123"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_account_lockout_after_five_failed_attempts(client: AsyncClient):
    """Verify account lockout triggers after 5 consecutive failed logins."""
    # Reset fail count first
    await db.execute("UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE email = $1", "user123@example.com")

    # 4 failed attempts
    for _ in range(4):
        resp = await client.post(
            "/api/auth/login",
            json={"email": "user123@example.com", "password": "wrongpassword"}
        )
        assert resp.status_code == 401

    # 5th failed attempt triggers lockout
    resp5 = await client.post(
        "/api/auth/login",
        json={"email": "user123@example.com", "password": "wrongpassword"}
    )
    assert resp5.status_code == 401

    # 6th attempt is rejected due to active lockout
    resp6 = await client.post(
        "/api/auth/login",
        json={"email": "user123@example.com", "password": "123"}
    )
    assert resp6.status_code == 401
    assert "temporarily locked" in resp6.json()["detail"].lower()

    # Reset lockout for subsequent test isolation
    await db.execute("UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE email = $1", "user123@example.com")


@pytest.mark.asyncio
async def test_session_check_and_logout(client: AsyncClient):
    """Verify session checking, logout, and post-logout unauthorized state."""
    # Login
    login_resp = await client.post(
        "/api/auth/login",
        json={"email": "user123@example.com", "password": "123"}
    )
    assert login_resp.status_code == 200

    # Check active session
    session_resp = await client.get("/api/auth/session")
    assert session_resp.status_code == 200
    assert session_resp.json()["authenticated"] is True
    assert session_resp.json()["user"]["email"] == "user123@example.com"

    # Logout
    logout_resp = await client.post("/api/auth/logout")
    assert logout_resp.status_code == 200

    # Check session after logout
    session_resp_after = await client.get("/api/auth/session")
    assert session_resp_after.status_code == 200
    assert session_resp_after.json()["authenticated"] is False


@pytest.mark.asyncio
async def test_protected_route_rejects_unauthenticated(client: AsyncClient):
    """Verify protected endpoints return 401 when unauthenticated."""
    client.cookies.clear()
    resp = await client.get("/api/files")
    assert resp.status_code == 401
