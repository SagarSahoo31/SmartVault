"""
SmartVault Dashboard Router
Provides user statistics, storage metrics, recent files, and recent user activity.
"""

from typing import List
from fastapi import APIRouter, Request, Depends
from ..models.smartvault import DashboardResponse, FileMetadataResponse, RecentActivityItem
from ..lib.pg import db
from .auth import get_current_user_and_session

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def format_activity_description(event_type: str, action: str, metadata: dict) -> str:
    """Format human-readable user activity text."""
    desc_map = {
        "LOGIN_SUCCESS": "Signed into SmartVault",
        "LOGOUT": "Signed out of SmartVault",
        "FILE_UPLOADED": "Uploaded a confidential file",
        "FILE_VIEWED": "Viewed file metadata",
        "FILE_DOWNLOADED": "Downloaded a private file",
        "FILE_DELETED": "Deleted a private file",
        "PROFILE_VIEWED": "Accessed profile settings",
        "PROFILE_UPDATED": "Updated account profile",
        "PASSWORD_CHANGE": "Changed account password",
        "SESSION_CREATED": "Started a new secure session"
    }
    return desc_map.get(event_type, f"Performed {action.lower()} action")


@router.get("", response_model=DashboardResponse)
async def get_dashboard_data(
    request: Request,
    auth_data=Depends(get_current_user_and_session)
):
    """Retrieve vault dashboard metrics, storage status, and recent activity."""
    current_user, session_id, _ = auth_data

    # File counts and storage used
    files = await db.fetch_all(
        "SELECT * FROM files WHERE owner_id = $1 ORDER BY created_at DESC",
        current_user.id
    )

    file_count = len(files)
    storage_used = sum(f["file_size"] for f in files)
    recent_files = [FileMetadataResponse.model_validate(f) for f in files[:5]]

    # Recent activity for current user only
    events = await db.fetch_all(
        """
        SELECT id, event_type, action, status, timestamp, metadata
        FROM security_events
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT 6
        """,
        current_user.id
    )

    recent_activity: List[RecentActivityItem] = []
    for ev in events:
        meta = ev.get("metadata", {})
        if isinstance(meta, str):
            import json
            try:
                meta = json.loads(meta)
            except Exception:
                meta = {}

        desc = format_activity_description(ev["event_type"], ev["action"], meta)
        recent_activity.append(
            RecentActivityItem(
                id=ev["id"],
                event_type=ev["event_type"],
                action=ev["action"],
                description=desc,
                timestamp=ev["timestamp"],
                status=ev["status"]
            )
        )

    return DashboardResponse(
        user=current_user,
        file_count=file_count,
        storage_used=storage_used,
        recent_files=recent_files,
        recent_activity=recent_activity
    )
