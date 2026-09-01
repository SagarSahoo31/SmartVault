# SmartVault Architecture & System Specification

## 1. System Mission & Scope
SmartVault is a standalone private digital vault application designed to provide authenticated users with confidential storage and management of personal digital assets. It functions as the protected **target system** within a three-tier BEA cybersecurity architecture:
1. **SmartVault (Target Application)**: Stores private user data, performs authentication, session management, file operations, and emits structured security telemetry.
2. **Cybersecurity Detection Platform (External Future System)**: Consumes telemetry, correlates patterns, executes ML anomaly detection, and manages security incidents.
3. **Threat Simulation Console (External Future System)**: Generates controlled test workloads against SmartVault.

## 2. Technical Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router v6, Lucide Icons, Sonner.
- **Backend**: Python 3.13, FastAPI (modular router architecture mounted on `/api`), Pydantic v2 schemas.
- **Data Persistence**: PostgreSQL 16 (relational tables: `users`, `sessions`, `files`, `security_events`) with SQLite `aiosqlite` fallback.
- **Password Security**: bcrypt with 12 salt rounds, constant-time verification.
- **Session Security**: 256-bit cryptographically secure opaque tokens, stored as SHA-256 hashes in database, delivered via `httpOnly`, `SameSite=Lax` cookies (`smartvault_session`).
- **File Storage**: Isolated filesystem storage abstraction under `storage/` directory with path traversal guards.
- **Telemetry Streaming**: Redis Streams publisher (`smartvault:security_events`) + internal replay REST API (`GET /api/internal/events`).
- **Email Adapter**: Resend server-side SDK adapter (`backend/lib/email.py`) with secret isolation.

## 3. Database Schema
- `users`: `id`, `username`, `email`, `display_name`, `password_hash`, `failed_login_count`, `locked_until`, `created_at`, `updated_at`.
- `sessions`: `id`, `user_id`, `token_hash`, `created_at`, `expires_at`, `last_seen_at`, `source_ip`, `user_agent`, `revoked_at`.
- `files`: `id`, `owner_id`, `original_filename`, `stored_filename`, `mime_type`, `file_size`, `storage_reference`, `created_at`, `updated_at`.
- `security_events`: `id`, `event_id`, `event_type`, `timestamp`, `user_id`, `session_id`, `source_ip`, `user_agent`, `device_information`, `resource_type`, `resource_id`, `action`, `status`, `metadata`, `created_at`.
