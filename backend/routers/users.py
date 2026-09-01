"""
SmartVault Users and Profile Management Router
Handles profile viewing, updates, and password changes.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, status, Depends
from ..models.smartvault import UserPublic, UpdateProfileRequest, ChangePasswordRequest
from ..lib.auth import hash_password, verify_password
from ..lib.pg import db
from ..lib.events import record_event
from .auth import get_current_user_and_session

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserPublic)
async def get_my_profile(
    request: Request,
    auth_data=Depends(get_current_user_and_session)
):
    """Retrieve currently authenticated user profile."""
    current_user, session_id, _ = auth_data

    await record_event(
        event_type="PROFILE_VIEWED",
        action="VIEW",
        status="SUCCESS",
        user_id=current_user.id,
        session_id=session_id,
        request=request,
        resource_type="USER",
        resource_id=current_user.id
    )
    return current_user


@router.put("/me", response_model=UserPublic)
async def update_my_profile(
    req: UpdateProfileRequest,
    request: Request,
    auth_data=Depends(get_current_user_and_session)
):
    """Update display name and/or email address."""
    current_user, session_id, _ = auth_data
    now = datetime.now(timezone.utc)
    changes = {}

    display_name = current_user.display_name
    email = current_user.email

    if req.display_name and req.display_name != current_user.display_name:
        display_name = req.display_name.strip()
        changes["display_name"] = True

    if req.email and req.email.lower() != current_user.email.lower():
        new_email = req.email.strip().lower()
        # Check uniqueness
        existing = await db.fetch_one("SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2", new_email, current_user.id)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use by another account.")
        email = new_email
        changes["email"] = True

    if changes:
        await db.execute(
            "UPDATE users SET display_name = $1, email = $2, updated_at = $3 WHERE id = $4",
            display_name, email, now, current_user.id
        )
        await record_event(
            event_type="PROFILE_UPDATED",
            action="UPDATE",
            status="SUCCESS",
            user_id=current_user.id,
            session_id=session_id,
            request=request,
            resource_type="USER",
            resource_id=current_user.id,
            metadata={"updated_fields": list(changes.keys())}
        )

    return UserPublic(
        id=current_user.id,
        username=current_user.username,
        email=email,
        display_name=display_name,
        created_at=current_user.created_at
    )


@router.post("/me/password")
async def change_password(
    req: ChangePasswordRequest,
    request: Request,
    auth_data=Depends(get_current_user_and_session)
):
    """Change current user's password securely."""
    current_user, session_id, _ = auth_data
    now = datetime.now(timezone.utc)

    user_record = await db.fetch_one("SELECT password_hash FROM users WHERE id = $1", current_user.id)
    if not user_record or not verify_password(req.current_password, user_record["password_hash"]):
        await record_event(
            event_type="PASSWORD_CHANGE",
            action="UPDATE",
            status="FAILURE",
            user_id=current_user.id,
            session_id=session_id,
            request=request,
            resource_type="USER",
            resource_id=current_user.id,
            metadata={"reason": "Incorrect current password"}
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password does not match.")

    new_hash = hash_password(req.new_password)
    await db.execute(
        "UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3",
        new_hash, now, current_user.id
    )

    await record_event(
        event_type="PASSWORD_CHANGE",
        action="UPDATE",
        status="SUCCESS",
        user_id=current_user.id,
        session_id=session_id,
        request=request,
        resource_type="USER",
        resource_id=current_user.id
    )

    return {"message": "Password changed successfully."}
