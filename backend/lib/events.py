"""
SmartVault Security Telemetry & Event Publishing System
Generates structured, privacy-safe security events, persists them to PostgreSQL,
and streams them to Redis Streams for consumption by the cybersecurity detection platform.
"""

import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import Request
import redis.asyncio as aioredis
from .pg import db

logger = logging.getLogger("smartvault.events")

# Privacy filter: blacklist of keys that MUST NOT appear in telemetry
FORBIDDEN_METADATA_KEYS = {
    "password", "password_hash", "token", "token_hash", "session_token",
    "secret", "api_key", "file_content", "contents", "data", "file_data",
    "raw_bytes", "resend_api_key", "authorization", "cookie"
}


def sanitize_metadata(metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Sanitize metadata to guarantee privacy boundaries. No file contents or secrets."""
    if not metadata:
        return {}
    clean = {}
    for k, v in metadata.items():
        k_lower = k.lower()
        if any(bad in k_lower for bad in FORBIDDEN_METADATA_KEYS):
            continue
        if isinstance(v, (bytes, bytearray)):
            continue
        if isinstance(v, dict):
            clean[k] = sanitize_metadata(v)
        else:
            clean[k] = v
    return clean


class EventPublisher:
    """Abstract/Isolated Redis Streams Event Publisher."""

    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.stream_name = os.getenv("REDIS_STREAM_NAME", "smartvault:security_events")
        self.redis_client: Optional[aioredis.Redis] = None
        self.is_connected = False

    async def connect(self):
        try:
            self.redis_client = aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=3.0,
                socket_connect_timeout=3.0
            )
            await self.redis_client.ping()
            self.is_connected = True
            logger.info(f"Connected to Redis Streams for telemetry: {self.stream_name}")
        except Exception as e:
            self.is_connected = False
            logger.warning(f"Redis Streams unavailable ({e}). Telemetry will persist to database only.")

    async def disconnect(self):
        if self.redis_client:
            try:
                await self.redis_client.aclose()
            except Exception:
                pass
            logger.info("Closed Redis connection.")

    async def publish(self, event_data: Dict[str, Any]) -> bool:
        """Publish event payload to Redis Streams."""
        if not self.is_connected or not self.redis_client:
            return False

        try:
            payload = json.dumps(event_data, default=str)
            await self.redis_client.xadd(
                self.stream_name,
                {
                    "event_id": event_data.get("event_id", ""),
                    "event_type": event_data.get("event_type", ""),
                    "timestamp": str(event_data.get("timestamp", "")),
                    "payload": payload
                }
            )
            return True
        except Exception as e:
            logger.warning(f"Failed to publish event {event_data.get('event_id')} to Redis Streams: {e}")
            self.is_connected = False
            return False


# Global publisher instance
event_publisher = EventPublisher()


async def record_event(
    event_type: str,
    action: str,
    status: str = "SUCCESS",
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
    source_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    device_information: Optional[str] = None
) -> Dict[str, Any]:
    """
    Construct, persist, and publish a canonical SmartVault security event.
    Guarantees privacy-safe metadata extraction.
    """
    now = datetime.now(timezone.utc)
    event_id = f"evt_{uuid.uuid4().hex}"

    # Extract client metadata from FastAPI request if provided
    if request is not None:
        if not source_ip:
            # Check forwarded header first
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                source_ip = forwarded.split(",")[0].strip()
            elif request.client:
                source_ip = request.client.host
            else:
                source_ip = "127.0.0.1"

        if not user_agent:
            user_agent = request.headers.get("user-agent", "unknown")

        if not device_information:
            device_information = user_agent

    clean_metadata = sanitize_metadata(metadata)

    event_payload = {
        "event_id": event_id,
        "event_type": event_type,
        "timestamp": now.isoformat(),
        "user_id": user_id,
        "session_id": session_id,
        "source_ip": source_ip or "127.0.0.1",
        "user_agent": user_agent or "unknown",
        "device_information": device_information or user_agent or "unknown",
        "resource_type": resource_type,
        "resource_id": resource_id,
        "action": action,
        "status": status,
        "metadata": clean_metadata
    }

    # 1. Persist to PostgreSQL / Database
    try:
        await db.execute(
            """
            INSERT INTO security_events (
                event_id, event_type, timestamp, user_id, session_id,
                source_ip, user_agent, device_information, resource_type,
                resource_id, action, status, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            """,
            event_id,
            event_type,
            now,
            user_id,
            session_id,
            source_ip or "127.0.0.1",
            user_agent or "unknown",
            device_information or user_agent or "unknown",
            resource_type,
            resource_id,
            action,
            status,
            clean_metadata,
            now
        )
    except Exception as e:
        logger.error(f"Failed to persist security event {event_id}: {e}")

    # 2. Publish to Redis Streams (non-blocking)
    try:
        await event_publisher.publish(event_payload)
    except Exception as e:
        logger.warning(f"Error publishing event {event_id} to Redis: {e}")

    return event_payload
