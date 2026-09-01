"""
SmartVault Internal & Telemetry Consumer Router
Exposes secure endpoints for external cybersecurity detection platforms to consume security telemetry.
Also provides integration status without exposing provider secrets.
"""

import os
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, status, Query
from ..models.smartvault import SecurityEventRecord, EmailStatusResponse
from ..lib.pg import db
from ..lib.email import email_service

router = APIRouter(prefix="/internal", tags=["Internal Telemetry"])

CONSUMER_KEY = os.getenv("EVENT_CONSUMER_KEY", "smartvault-local-consumer")


@router.get("/events", response_model=List[SecurityEventRecord])
async def get_security_events_stream(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    since: Optional[str] = None,
    event_type: Optional[str] = None,
    x_event_consumer_key: Optional[str] = Header(None, alias="X-Event-Consumer-Key")
):
    """
    Exposes raw structured security telemetry for external cybersecurity platform ingestion/replay.
    Requires X-Event-Consumer-Key header. Returns metadata only (no file content).
    """
    if not x_event_consumer_key or x_event_consumer_key != CONSUMER_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Event-Consumer-Key header"
        )

    query = "SELECT * FROM security_events"
    conditions = []
    params = []

    if since:
        conditions.append(f"timestamp >= ${len(params) + 1}")
        params.append(since)

    if event_type:
        conditions.append(f"event_type = ${len(params) + 1}")
        params.append(event_type)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += f" ORDER BY timestamp ASC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
    params.extend([limit, offset])

    records = await db.fetch_all(query, *params)
    results = []
    for r in records:
        meta = r.get("metadata", {})
        if isinstance(meta, str):
            import json
            try:
                meta = json.loads(meta)
            except Exception:
                meta = {}
        r["metadata"] = meta
        results.append(SecurityEventRecord.model_validate(r))
    return results


@router.get("/integrations/email-status", response_model=EmailStatusResponse)
async def get_email_integration_status():
    """Returns email provider integration status safely without exposing secrets."""
    status_info = email_service.get_status()
    return EmailStatusResponse(**status_info)
