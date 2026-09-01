"""
Tests for SmartVault Security Telemetry, Privacy Boundary, and Consumer API
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_security_telemetry_generation_and_consumer_endpoint(client: AsyncClient):
    """Test that events are generated, stored, and accessible via the internal consumer API."""
    # Trigger authentication failure event
    await client.post(
        "/api/auth/login",
        json={"email": "user123@example.com", "password": "wrongpassword"}
    )

    # 1. Unauthenticated consumer request -> 401
    unauth_resp = await client.get("/api/internal/events")
    assert unauth_resp.status_code == 401

    # 2. Invalid consumer key -> 401
    invalid_resp = await client.get(
        "/api/internal/events",
        headers={"X-Event-Consumer-Key": "wrong-key"}
    )
    assert invalid_resp.status_code == 401

    # 3. Valid consumer key -> 200 with telemetry records
    valid_resp = await client.get(
        "/api/internal/events",
        headers={"X-Event-Consumer-Key": "smartvault-local-consumer"}
    )
    assert valid_resp.status_code == 200
    events = valid_resp.json()
    assert len(events) > 0

    # Verify schema of emitted event
    evt = events[-1]
    assert "event_id" in evt
    assert "event_type" in evt
    assert "timestamp" in evt
    assert "action" in evt
    assert "status" in evt
    assert "metadata" in evt


@pytest.mark.asyncio
async def test_telemetry_filtering_and_pagination(client: AsyncClient):
    """Test filtering by event_type and pagination limits."""
    # Trigger distinct events
    await client.post(
        "/api/auth/login",
        json={"email": "user123@example.com", "password": "wrongpassword"}
    )

    resp = await client.get(
        "/api/internal/events?event_type=LOGIN_FAILURE&limit=5",
        headers={"X-Event-Consumer-Key": "smartvault-local-consumer"}
    )
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) <= 5
    for e in events:
        assert e["event_type"] == "LOGIN_FAILURE"


@pytest.mark.asyncio
async def test_telemetry_privacy_boundary(client: AsyncClient):
    """Verify that telemetry events never contain passwords, tokens, or file contents."""
    resp = await client.get(
        "/api/internal/events",
        headers={"X-Event-Consumer-Key": "smartvault-local-consumer"}
    )
    assert resp.status_code == 200
    events = resp.json()

    forbidden_substrings = ["password", "token_hash", "file_content", "raw_bytes"]
    for evt in events:
        meta_keys = [k.lower() for k in evt.get("metadata", {}).keys()]
        for f in forbidden_substrings:
            assert f not in meta_keys
