"""
SmartVault Storage Abstraction Layer
Handles local filesystem storage with path traversal protection, extension & MIME validation,
and file size limits. Modular design swappable to S3/MinIO in production.
"""

import os
import re
import logging
from typing import Tuple

logger = logging.getLogger("smartvault.storage")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".txt", ".mp3", ".mp4"}
ALLOWED_MIME_TYPES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "text/plain": [".txt"],
    "audio/mpeg": [".mp3"],
    "audio/mp3": [".mp3"],
    "video/mp4": [".mp4"],
    "application/octet-stream": [".jpg", ".jpeg", ".png", ".pdf", ".txt", ".mp3", ".mp4"]
}
MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024  # 1 GB


class StorageService:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        configured_dir = os.getenv("STORAGE_DIR", "../storage")
        if os.path.isabs(configured_dir):
            self.storage_dir = os.path.realpath(configured_dir)
        else:
            self.storage_dir = os.path.realpath(os.path.join(base_dir, configured_dir))

        os.makedirs(self.storage_dir, exist_ok=True)
        logger.info(f"Storage directory initialized at: {self.storage_dir}")

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent directory traversal or malformed names."""
        clean = os.path.basename(filename).strip()
        clean = re.sub(r'[\\/*?:"<>|]', "", clean)
        return clean or "unnamed_file"

    def validate_file_specs(self, filename: str, mime_type: str, size: int) -> Tuple[bool, str, str]:
        """Validate file size, extension, and MIME type."""
        if size <= 0:
            return False, "File is empty.", ""
        if size > MAX_FILE_SIZE:
            return False, f"File size ({size} bytes) exceeds maximum limit of 1 GB.", ""

        clean_name = self.sanitize_filename(filename)
        _, ext = os.path.splitext(clean_name)
        ext = ext.lower()

        if ext not in ALLOWED_EXTENSIONS:
            return False, f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}", ""

        # Normalize mime type check
        mime = mime_type.lower().split(";")[0].strip()
        if mime in ALLOWED_MIME_TYPES:
            if ext not in ALLOWED_MIME_TYPES[mime] and mime != "application/octet-stream":
                return False, f"MIME type '{mime}' does not match file extension '{ext}'.", ""

        return True, "", ext

    def get_secure_path(self, stored_filename: str) -> str:
        """Resolve path and verify it stays within the storage directory."""
        target_path = os.path.realpath(os.path.join(self.storage_dir, stored_filename))
        common = os.path.commonpath([self.storage_dir, target_path])
        if common != self.storage_dir:
            raise ValueError("Path traversal attempt detected.")
        return target_path

    async def save_file(self, file_id: str, ext: str, content: bytes) -> str:
        """Save file bytes to disk under secure UUID name."""
        stored_filename = f"{file_id}{ext}"
        file_path = self.get_secure_path(stored_filename)
        with open(file_path, "wb") as f:
            f.write(content)
        return stored_filename

    def get_file_path(self, stored_filename: str) -> str:
        """Retrieve local absolute path of a stored file."""
        return self.get_secure_path(stored_filename)

    def file_exists(self, stored_filename: str) -> bool:
        """Check if stored file exists."""
        try:
            path = self.get_secure_path(stored_filename)
            return os.path.exists(path) and os.path.isfile(path)
        except Exception:
            return False

    def delete_file(self, stored_filename: str) -> bool:
        """Delete file from disk."""
        try:
            path = self.get_secure_path(stored_filename)
            if os.path.exists(path):
                os.remove(path)
                return True
        except Exception as e:
            logger.error(f"Error deleting file {stored_filename}: {e}")
        return False


# Global storage service singleton
storage = StorageService()
