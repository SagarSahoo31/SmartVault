"""
SmartVault File Management Router
Handles upload, listing, metadata viewing, download, and deletion.
Enforces strict owner authorization and privacy-safe security telemetry.
"""

import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Request, UploadFile, File, HTTPException, status, Depends
from fastapi.responses import FileResponse
from ..models.smartvault import FileMetadataResponse
from ..lib.pg import db
from ..lib.storage import storage
from ..lib.events import record_event
from .auth import get_current_user_and_session

router = APIRouter(prefix="/files", tags=["Files"])


@router.get("", response_model=List[FileMetadataResponse])
async def list_files(
    request: Request,
    auth_data=Depends(get_current_user_and_session)
):
    """List all private files owned by the authenticated user."""
    current_user, session_id, _ = auth_data

    files = await db.fetch_all(
        "SELECT * FROM files WHERE owner_id = $1 ORDER BY created_at DESC",
        current_user.id
    )
    return [FileMetadataResponse.model_validate(f) for f in files]


@router.post("", response_model=FileMetadataResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    auth_data=Depends(get_current_user_and_session)
):
    """Upload a new confidential file with format and size verification."""
    current_user, session_id, _ = auth_data

    content = await file.read()
    file_size = len(content)

    valid, err_msg, ext = storage.validate_file_specs(file.filename or "", file.content_type or "", file_size)
    if not valid:
        await record_event(
            event_type="ERROR_EVENT",
            action="UPLOAD",
            status="FAILURE",
            user_id=current_user.id,
            session_id=session_id,
            request=request,
            resource_type="FILE",
            metadata={"reason": err_msg, "attempted_size": file_size}
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    file_id = f"f_{uuid.uuid4().hex}"
    stored_name = await storage.save_file(file_id, ext, content)
    now = datetime.now(timezone.utc)
    clean_original_name = storage.sanitize_filename(file.filename or "document")

    await db.execute(
        """
        INSERT INTO files (id, owner_id, original_filename, stored_filename, mime_type, file_size, storage_reference, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """,
        file_id,
        current_user.id,
        clean_original_name,
        stored_name,
        file.content_type or "application/octet-stream",
        file_size,
        f"local://{stored_name}",
        now,
        now
    )

    # Telemetry: Privacy-safe metadata only (no file content)
    await record_event(
        event_type="FILE_UPLOADED",
        action="UPLOAD",
        status="SUCCESS",
        user_id=current_user.id,
        session_id=session_id,
        request=request,
        resource_type="FILE",
        resource_id=file_id,
        metadata={
            "file_type": file.content_type,
            "file_size": file_size,
            "extension": ext
        }
    )

    return FileMetadataResponse(
        id=file_id,
        owner_id=current_user.id,
        original_filename=clean_original_name,
        stored_filename=stored_name,
        mime_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        storage_reference=f"local://{stored_name}",
        created_at=now,
        updated_at=now
    )


@router.get("/{file_id}", response_model=FileMetadataResponse)
async def get_file_metadata(
    file_id: str,
    request: Request,
    auth_data=Depends(get_current_user_and_session)
):
    """Retrieve metadata for a specific file owned by current user."""
    current_user, session_id, _ = auth_data

    file_record = await db.fetch_one("SELECT * FROM files WHERE id = $1", file_id)
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Strict authorization ownership check
    if file_record["owner_id"] != current_user.id:
        await record_event(
            event_type="FORBIDDEN_FILE_ACCESS",
            action="VIEW",
            status="DENIED",
            user_id=current_user.id,
            session_id=session_id,
            request=request,
            resource_type="FILE",
            resource_id=file_id,
            metadata={"reason": "Ownership mismatch"}
        )
        # Safe 404 response to avoid leaking file existence
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    await record_event(
        event_type="FILE_VIEWED",
        action="VIEW",
        status="SUCCESS",
        user_id=current_user.id,
        session_id=session_id,
        request=request,
        resource_type="FILE",
        resource_id=file_id,
        metadata={
            "file_type": file_record["mime_type"],
            "file_size": file_record["file_size"]
        }
    )

    return FileMetadataResponse.model_validate(file_record)


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    request: Request,
    auth_data=Depends(get_current_user_and_session)
):
    """Download private file bytes securely."""
    current_user, session_id, _ = auth_data

    file_record = await db.fetch_one("SELECT * FROM files WHERE id = $1", file_id)
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if file_record["owner_id"] != current_user.id:
        await record_event(
            event_type="FORBIDDEN_FILE_ACCESS",
            action="DOWNLOAD",
            status="DENIED",
            user_id=current_user.id,
            session_id=session_id,
            request=request,
            resource_type="FILE",
            resource_id=file_id,
            metadata={"reason": "Ownership mismatch on download"}
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    stored_filename = file_record["stored_filename"]
    if not storage.file_exists(stored_filename):
        await record_event(
            event_type="ERROR_EVENT",
            action="DOWNLOAD",
            status="ERROR",
            user_id=current_user.id,
            session_id=session_id,
            request=request,
            resource_type="FILE",
            resource_id=file_id,
            metadata={"reason": "Storage object missing on disk"}
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content unavailable")

    file_path = storage.get_file_path(stored_filename)

    await record_event(
        event_type="FILE_DOWNLOADED",
        action="DOWNLOAD",
        status="SUCCESS",
        user_id=current_user.id,
        session_id=session_id,
        request=request,
        resource_type="FILE",
        resource_id=file_id,
        metadata={
            "file_type": file_record["mime_type"],
            "file_size": file_record["file_size"]
        }
    )

    return FileResponse(
        path=file_path,
        media_type=file_record["mime_type"],
        filename=file_record["original_filename"]
    )


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    request: Request,
    auth_data=Depends(get_current_user_and_session)
):
    """Delete a confidential file permanently from vault."""
    current_user, session_id, _ = auth_data

    file_record = await db.fetch_one("SELECT * FROM files WHERE id = $1", file_id)
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if file_record["owner_id"] != current_user.id:
        await record_event(
            event_type="FORBIDDEN_FILE_ACCESS",
            action="DELETE",
            status="DENIED",
            user_id=current_user.id,
            session_id=session_id,
            request=request,
            resource_type="FILE",
            resource_id=file_id,
            metadata={"reason": "Ownership mismatch on delete"}
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    storage.delete_file(file_record["stored_filename"])
    await db.execute("DELETE FROM files WHERE id = $1", file_id)

    await record_event(
        event_type="FILE_DELETED",
        action="DELETE",
        status="SUCCESS",
        user_id=current_user.id,
        session_id=session_id,
        request=request,
        resource_type="FILE",
        resource_id=file_id,
        metadata={
            "file_type": file_record["mime_type"],
            "file_size": file_record["file_size"]
        }
    )

    return {"message": "File deleted successfully"}
