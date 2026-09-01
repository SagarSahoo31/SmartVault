"""
SmartVault Authentication & Session Router
Handles login, logout, session verification, account lockout, and authentication security telemetry.
"""

import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from fastapi import APIRouter, Request, Response, HTTPException, status, Depends
from ..models.smartvault import LoginRequest, LoginResponse, SessionResponse, UserPublic
from ..lib.auth import verify_password, generate_session_token, hash_token
from ..lib.pg import db
from ..lib.events import record_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "smartvault_session")
COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
SESSION_HOURS = int(os.getenv("SESSION_EXPIRE_HOURS", "24"))
MAX_FAILED_LOGINS = int(os.getenv("MAX_FAILED_LOGINS", "5"))
LOCKOUT_MINUTES = int(os.getenv("LOCKOUT_MINUTES", "15"))


async def get_current_user_and_session(request: Request) -> Tuple[UserPublic, str, str]:
    """
    Dependency to retrieve currently authenticated user, session ID, and raw token hash.
    Raises 401 if unauthenticated or session expired/revoked.
    """
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        # Generate unauthorized access attempt telemetry
        await record_event(
            event_type="UNAUTHORIZED_ACCESS_ATTEMPT",
            action="ACCESS",
            status="DENIED",
            request=request,
            resource_type="API",
            resource_id=request.url.path,
            metadata={"reason": "Missing session cookie"}
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    t_hash = hash_token(token)
    now = datetime.now(timezone.utc)

    session_record = await db.fetch_one(
        """
        SELECT s.id, s.user_id, s.expires_at, s.revoked_at,
               u.id as u_id, u.username, u.email, u.display_name, u.created_at as u_created_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = $1
        """,
        t_hash
    )

    if not session_record:
        await record_event(
            event_type="UNAUTHORIZED_ACCESS_ATTEMPT",
            action="ACCESS",
            status="DENIED",
            request=request,
            resource_type="SESSION",
            metadata={"reason": "Invalid session token hash"}
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    # Check revocation
    if session_record.get("revoked_at"):
        await record_event(
            event_type="UNAUTHORIZED_ACCESS_ATTEMPT",
            action="ACCESS",
            status="DENIED",
            user_id=session_record["user_id"],
            session_id=session_record["id"],
            request=request,
            resource_type="SESSION",
            metadata={"reason": "Session has been revoked"}
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked")

    # Check expiration
    expires_at = session_record["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now:
        await record_event(
            event_type="SESSION_EXPIRED",
            action="ACCESS",
            status="DENIED",
            user_id=session_record["user_id"],
            session_id=session_record["id"],
            request=request,
            resource_type="SESSION",
            metadata={"reason": "Session expired"}
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    # Update last seen timestamp
    await db.execute("UPDATE sessions SET last_seen_at = $1 WHERE id = $2", now, session_record["id"])

    user = UserPublic(
        id=session_record["u_id"],
        username=session_record["username"],
        email=session_record["email"],
        display_name=session_record["display_name"],
        created_at=session_record["u_created_at"]
    )
    return user, session_record["id"], t_hash


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, request: Request, response: Response):
    """
    Authenticate user using email (primary) or username (compatibility),
    enforcing lockout rules, setting secure httpOnly session cookie, and emitting telemetry.
    """
    now = datetime.now(timezone.utc)
    identifier = req.email.lower() if req.email else req.username.strip()

    # Lookup user
    user_record = await db.fetch_one(
        "SELECT * FROM users WHERE LOWER(email) = $1 OR username = $2",
        identifier, identifier
    )

    if not user_record:
        await record_event(
            event_type="LOGIN_FAILURE",
            action="LOGIN",
            status="FAILURE",
            request=request,
            resource_type="AUTH",
            metadata={"identifier_type": "email" if req.email else "username"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The username or password was not accepted."
        )

    user_id = user_record["id"]

    # Check account lockout
    locked_until = user_record.get("locked_until")
    if locked_until:
        if isinstance(locked_until, str):
            locked_until = datetime.fromisoformat(locked_until)
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)

        if locked_until > now:
            await record_event(
                event_type="LOGIN_FAILURE",
                action="LOGIN",
                status="FAILURE",
                user_id=user_id,
                request=request,
                resource_type="AUTH",
                metadata={"reason": "Account temporarily locked"}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account temporarily locked due to repeated failed attempts. Please try again later."
            )

    # Verify password
    if not verify_password(req.password, user_record["password_hash"]):
        new_fail_count = user_record["failed_login_count"] + 1
        new_lockout = None

        if new_fail_count >= MAX_FAILED_LOGINS:
            new_lockout = now + timedelta(minutes=LOCKOUT_MINUTES)
            await db.execute(
                "UPDATE users SET failed_login_count = $1, locked_until = $2, updated_at = $3 WHERE id = $4",
                new_fail_count, new_lockout, now, user_id
            )
            await record_event(
                event_type="ACCOUNT_LOCKED",
                action="LOCKOUT",
                status="SUCCESS",
                user_id=user_id,
                request=request,
                resource_type="USER",
                resource_id=user_id,
                metadata={"failed_attempts": new_fail_count, "lockout_minutes": LOCKOUT_MINUTES}
            )
        else:
            await db.execute(
                "UPDATE users SET failed_login_count = $1, updated_at = $2 WHERE id = $3",
                new_fail_count, now, user_id
            )

        await record_event(
            event_type="LOGIN_FAILURE",
            action="LOGIN",
            status="FAILURE",
            user_id=user_id,
            request=request,
            resource_type="AUTH",
            metadata={"failed_attempts": new_fail_count}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The username or password was not accepted."
        )

    # Password verified: reset failure count
    await db.execute(
        "UPDATE users SET failed_login_count = 0, locked_until = NULL, updated_at = $1 WHERE id = $2",
        now, user_id
    )

    # Create new session
    session_id = f"sess_{uuid.uuid4().hex}"
    raw_token = generate_session_token()
    token_hash_val = hash_token(raw_token)
    expires_at = now + timedelta(hours=SESSION_HOURS)

    # Determine IP and UA
    client_ip = request.headers.get("x-forwarded-for")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    elif request.client:
        client_ip = request.client.host
    else:
        client_ip = "127.0.0.1"

    user_agent = request.headers.get("user-agent", "unknown")

    await db.execute(
        """
        INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at, source_ip, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """,
        session_id, user_id, token_hash_val, now, expires_at, now, client_ip, user_agent
    )

    # Set httpOnly session cookie
    response.set_cookie(
        key=COOKIE_NAME,
        value=raw_token,
        expires=int(SESSION_HOURS * 3600),
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/"
    )

    # Security telemetry
    await record_event(
        event_type="LOGIN_SUCCESS",
        action="LOGIN",
        status="SUCCESS",
        user_id=user_id,
        session_id=session_id,
        request=request,
        resource_type="AUTH",
        metadata={"identifier_type": "email" if req.email else "username"}
    )
    await record_event(
        event_type="SESSION_CREATED",
        action="CREATE",
        status="SUCCESS",
        user_id=user_id,
        session_id=session_id,
        request=request,
        resource_type="SESSION",
        resource_id=session_id
    )

    user_obj = UserPublic(
        id=user_record["id"],
        username=user_record["username"],
        email=user_record["email"],
        display_name=user_record["display_name"],
        created_at=user_record["created_at"]
    )

    return LoginResponse(
        user=user_obj,
        session_expires_at=expires_at
    )


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Revoke active session and delete session cookie."""
    token = request.cookies.get(COOKIE_NAME)
    now = datetime.now(timezone.utc)

    if token:
        t_hash = hash_token(token)
        session_record = await db.fetch_one("SELECT id, user_id FROM sessions WHERE token_hash = $1", t_hash)
        if session_record:
            await db.execute("UPDATE sessions SET revoked_at = $1 WHERE id = $2", now, session_record["id"])
            await record_event(
                event_type="LOGOUT",
                action="LOGOUT",
                status="SUCCESS",
                user_id=session_record["user_id"],
                session_id=session_record["id"],
                request=request,
                resource_type="AUTH"
            )
            await record_event(
                event_type="SESSION_TERMINATED",
                action="TERMINATE",
                status="SUCCESS",
                user_id=session_record["user_id"],
                session_id=session_record["id"],
                request=request,
                resource_type="SESSION",
                resource_id=session_record["id"]
            )

    response.delete_cookie(key=COOKIE_NAME, path="/", samesite="lax", httponly=True)
    return {"message": "Logged out successfully"}


@router.get("/session", response_model=SessionResponse)
async def check_session(request: Request):
    """Inspect active session status."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return SessionResponse(authenticated=False)

    t_hash = hash_token(token)
    now = datetime.now(timezone.utc)

    session_record = await db.fetch_one(
        """
        SELECT s.id, s.user_id, s.expires_at, s.revoked_at,
               u.id as u_id, u.username, u.email, u.display_name, u.created_at as u_created_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = $1
        """,
        t_hash
    )

    if not session_record or session_record.get("revoked_at"):
        return SessionResponse(authenticated=False)

    expires_at = session_record["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now:
        return SessionResponse(authenticated=False)

    user = UserPublic(
        id=session_record["u_id"],
        username=session_record["username"],
        email=session_record["email"],
        display_name=session_record["display_name"],
        created_at=session_record["u_created_at"]
    )
    return SessionResponse(
        authenticated=True,
        user=user,
        session_expires_at=expires_at
    )
