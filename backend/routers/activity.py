"""
SmartVault User Activity Router
Provides the authenticated user's private chronological activity history.
"""

from typing import List
from fastapi import APIRouter, Request, Depends
from ..models.smartvault import RecentActivityItem
from ..lib.pg import db
from .auth import get_current_user_and_session
from .dashboard import format_activity_description

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("", response_model=List[RecentActivityItem])
async def get_my_activity(
    request: Request,
    limit: int = 50,
    auth_data=Depends(get_current_user_and_session)
):
    """Retrieve personal activity timeline for current user."""
    current_user, session_id, _ = auth_data

    events = await db.fetch_all(
        """
        SELECT id, event_type, action, status, timestamp, metadata
        FROM security_events
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
        """,
        current_user.id, limit
    )

    items: List[RecentActivityItem] = []
    for ev in events:
        meta = ev.get("metadata", {})
        if isinstance(meta, str):
            import json
            try:
                meta = json.loads(meta)
            except Exception:
                meta = {}

        desc = format_activity_description(ev["event_type"], ev["action"], meta)
        items.append(
            RecentActivityItem(
                id=ev["id"],
                event_type=ev["event_type"],
                action=ev["action"],
                description=desc,
                timestamp=ev["timestamp"],
                status=ev["status"]
            )
        )

    return items
