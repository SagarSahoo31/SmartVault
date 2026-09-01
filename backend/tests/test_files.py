"""
Tests for SmartVault File Management and Privacy/Ownership Enforcement
"""

from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from backend.lib.pg import db
from backend.lib.storage import storage


@pytest.mark.asyncio
async def test_file_upload_list_download_delete_lifecycle(auth_client: AsyncClient):
    """Test full file management lifecycle: upload, listing, metadata, download, and deletion."""
    test_content = b"Confidential personal medical and financial notes."
    filename = "demo-note.txt"

    # 1. Upload
    files = {"file": (filename, test_content, "text/plain")}
    upload_resp = await auth_client.post("/api/files", files=files)
    assert upload_resp.status_code == 201
    file_data = upload_resp.json()
    file_id = file_data["id"]
    assert file_data["original_filename"] == filename
    assert file_data["mime_type"] == "text/plain"
    assert file_data["file_size"] == len(test_content)

    # 2. List
    list_resp = await auth_client.get("/api/files")
    assert list_resp.status_code == 200
    file_list = list_resp.json()
    assert any(f["id"] == file_id for f in file_list)

    # 3. View Metadata
    meta_resp = await auth_client.get(f"/api/files/{file_id}")
    assert meta_resp.status_code == 200
    assert meta_resp.json()["id"] == file_id

    # 4. Download
    down_resp = await auth_client.get(f"/api/files/{file_id}/download")
    assert down_resp.status_code == 200
    assert down_resp.content == test_content

    # 5. Delete
    del_resp = await auth_client.delete(f"/api/files/{file_id}")
    assert del_resp.status_code == 200

    # 6. Verify Deletion
    list_after = await auth_client.get("/api/files")
    assert not any(f["id"] == file_id for f in list_after.json())


@pytest.mark.asyncio
async def test_upload_supported_media_formats(auth_client: AsyncClient):
    """Verify all supported safe formats: PDF, PNG, JPG, MP3, MP4."""
    formats = [
        ("report.pdf", b"%PDF-1.4 mock pdf content", "application/pdf"),
        ("photo.jpg", b"\xFF\xD8\xFF mock jpeg content", "image/jpeg"),
        ("image.png", b"\x89PNG\r\n\x1a\n mock png content", "image/png"),
        ("audio.mp3", b"ID3 mock mp3 audio content", "audio/mpeg"),
        ("video.mp4", b"\x00\x00\x00\x18ftypmp42 mock mp4 video", "video/mp4"),
    ]

    for fname, content, mime in formats:
        files = {"file": (fname, content, mime)}
        resp = await auth_client.post("/api/files", files=files)
        assert resp.status_code == 201, f"Failed for {fname}: {resp.text}"
        data = resp.json()
        assert data["original_filename"] == fname
        # Clean up
        await auth_client.delete(f"/api/files/{data['id']}")


@pytest.mark.asyncio
async def test_empty_file_upload_rejected(auth_client: AsyncClient):
    """Verify empty (0-byte) files are rejected."""
    files = {"file": ("empty.txt", b"", "text/plain")}
    resp = await auth_client.post("/api/files", files=files)
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invalid_file_extension_rejected(auth_client: AsyncClient):
    """Verify unsafe executable files are rejected."""
    files = {"file": ("malicious.exe", b"binary content", "application/octet-stream")}
    resp = await auth_client.post("/api/files", files=files)
    assert resp.status_code == 400
    assert "Unsupported file type" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_foreign_user_file_access_ownership_enforcement(auth_client: AsyncClient):
    """
    Verify attempt to access another user's file is rejected with safe 404
    without leaking existence or content.
    """
    # 1. Create a foreign file owned by another user
    foreign_file_id = "f_foreign_victim_001"
    now = datetime.now(timezone.utc)
    stored_name = await storage.save_file(foreign_file_id, ".txt", b"Top secret victim confidential document")
    await db.execute(
        """
        INSERT INTO files (id, owner_id, original_filename, stored_filename, mime_type, file_size, storage_reference, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """,
        foreign_file_id,
        "foreign-user-999",
        "victim-secret.txt",
        stored_name,
        "text/plain",
        42,
        f"local://{stored_name}",
        now,
        now
    )

    # 2. View metadata attempt by demo-user -> 404
    meta_resp = await auth_client.get(f"/api/files/{foreign_file_id}")
    assert meta_resp.status_code == 404

    # 3. Download attempt by demo-user -> 404
    down_resp = await auth_client.get(f"/api/files/{foreign_file_id}/download")
    assert down_resp.status_code == 404

    # 4. Delete attempt by demo-user -> 404
    del_resp = await auth_client.delete(f"/api/files/{foreign_file_id}")
    assert del_resp.status_code == 404

    # Clean up foreign test file
    storage.delete_file(stored_name)
    await db.execute("DELETE FROM files WHERE id = $1", foreign_file_id)
