"""
SmartVault Pydantic v2 Models & DTOs
Defines strict validation schemas matching the TypeScript interfaces.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import re
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: str
    display_name: str
    created_at: datetime


class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            if v and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
                raise ValueError("Invalid email format")
        return v

    @field_validator("username")
    @classmethod
    def validate_username_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
        return v

    @model_validator(mode="after")
    def check_identifier(self) -> "LoginRequest":
        if not self.email and not self.username:
            raise ValueError("Either email or username must be provided")
        return self


class LoginResponse(BaseModel):
    user: UserPublic
    session_expires_at: datetime


class SessionResponse(BaseModel):
    authenticated: bool
    user: Optional[UserPublic] = None
    session_expires_at: Optional[datetime] = None


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
                raise ValueError("Invalid email format")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=3, max_length=128)


class FileMetadataResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    original_filename: str
    stored_filename: str
    mime_type: str
    file_size: int
    storage_reference: str
    created_at: datetime
    updated_at: datetime


class RecentActivityItem(BaseModel):
    id: int
    event_type: str
    action: str
    description: str
    timestamp: datetime
    status: str


class DashboardResponse(BaseModel):
    user: UserPublic
    file_count: int
    storage_used: int
    recent_files: List[FileMetadataResponse] = []
    recent_activity: List[RecentActivityItem] = []


class SecurityEventSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: str
    event_type: str
    timestamp: datetime
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None
    device_information: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    action: str
    status: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SecurityEventRecord(SecurityEventSchema):
    id: int
    created_at: datetime


class EmailStatusResponse(BaseModel):
    provider: str = "resend"
    configured: bool
    sender: str
