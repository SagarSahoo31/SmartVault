# SmartVault End-to-End Demonstration Guide

This guide details the step-by-step procedure to demonstrate and verify the complete **SmartVault** application and its security telemetry generation.

---

## Prerequisites & Setup

### Option 1: Docker Compose (All Services)
```bash
# From the repository root:
docker compose up -d --build
```
- Frontend UI: `http://localhost:5173`
- Backend API & OpenAPI Docs: `http://localhost:8000/api/docs`
- PostgreSQL: `localhost:5432`
- Redis Streams: `localhost:6379`

### Option 2: Local Development Setup
```bash
# 1. Start Backend
.venv\Scripts\uvicorn backend.server:app --reload --port 8000

# 2. Start Frontend (in a separate terminal)
cd frontend
npm run dev
```

---

## 20-Step Verification & Demonstration Script

### Step 1: Open Login Gateway
- Navigate to `http://localhost:5173/login`.
- Verify the dark-themed UI, zero-knowledge privacy branding, and login card.

### Step 2: Test Invalid Password Rejection
- Enter `user123@example.com` and password `wrongpassword`.
- Click **Unlock Vault**.
- Verify Sonner toast error: `The username or password was not accepted.`
- Verify no account enumeration occurs (generic error message).

### Step 3: Login with Demo User
- Enter Email: `user123@example.com`
- Enter Password: `123`
- Click **Unlock Vault**.
- Verify session is created and the browser redirects to `/dashboard`.

### Step 4: Verify Dashboard Overview
- Confirm welcome banner displays: `Welcome back, Demo User`.
- Verify initial file count, storage meter (out of 25 MB allocation), and Zero-Knowledge status indicator.

### Step 5: Navigate to "My Files"
- Click **My Files** in the sidebar navigation.
- Verify supported format badges (`.jpg`, `.png`, `.pdf`, `.txt`, `.mp3`, `.mp4`).

### Step 6: Upload a Test Document
- Click **Upload File** and select `demo-note.txt` (or any safe text/image file).
- Verify toast notification confirms secure storage.
- Verify file appears immediately in the table with MIME type, size, and added timestamp.

### Step 7: Inspect Asset Metadata
- Click the **Eye** icon next to the uploaded file.
- Verify the metadata inspector drawer slides open displaying:
  - Original Filename
  - Unique File Identifier (`f_...`)
  - Storage Reference Handle
  - MIME type and Payload size
  - Zero-Knowledge Privacy Boundary confirmation

### Step 8: Download File
- Click **Download File** in the inspector drawer (or download icon in table).
- Verify browser downloads the file with the exact original filename and content intact.

### Step 9: Delete File
- Click the **Trash** icon for the file.
- Verify toast confirms deletion and file is removed from the inventory table.

### Step 10: Verify Chronological Audit Trail
- Click **Activity** in the sidebar navigation.
- Verify the chronological audit log displays:
  - `Signed into SmartVault` (`LOGIN_SUCCESS`)
  - `Uploaded a confidential file` (`FILE_UPLOADED`)
  - `Viewed file metadata` (`FILE_VIEWED`)
  - `Downloaded a private file` (`FILE_DOWNLOADED`)
  - `Deleted a private file` (`FILE_DELETED`)

### Step 11: Navigate to Profile & Credentials
- Click **Profile** in the sidebar navigation.
- Inspect the Identity Profile and Password Security panels.

### Step 12: Update Profile Information
- Change Display Name to `Demo User (Secure)`.
- Click **Save Profile**.
- Verify toast confirms update and header/sidebar displays updated name.

### Step 13: Verify Password Update
- Enter Current Password `123`, New Password `123`, Confirm Password `123`.
- Click **Update Password** and confirm success toast.

### Step 14: Inspect Resend Email Integration Status
- View the service integration card on the Profile page.
- Verify provider is listed as `resend` with sender `onboarding@resend.dev` and no API keys leaked.

### Step 15: Verify External Telemetry Ingestion (Consumer API)
- Open a terminal or API client and query the internal telemetry endpoint:
  ```bash
  curl -H "X-Event-Consumer-Key: smartvault-local-consumer" http://localhost:8000/api/internal/events
  ```
- Verify a full array of structured JSON security events is returned.
- Confirm every event includes `event_id`, `event_type`, `timestamp`, `user_id`, `session_id`, `source_ip`, `user_agent`, `action`, `status`, and `metadata`.

### Step 16: Verify Consumer Key Authentication
- Attempt the same request without the key or with an invalid key:
  ```bash
  curl http://localhost:8000/api/internal/events
  ```
- Verify server returns `401 Unauthorized`.

### Step 17: Verify Privacy Boundary on Emitted Telemetry
- Inspect the metadata objects in the returned telemetry.
- Verify **no** passwords, session tokens, or raw file binary contents appear anywhere in the events.

### Step 18: Sign Out of Vault
- Click the **Sign Out** icon in the sidebar.
- Verify session is revoked and browser redirects to `/login`.

### Step 19: Test Protected Route Guard
- Attempt to navigate directly to `http://localhost:5173/dashboard` or `http://localhost:5173/files`.
- Verify ProtectedLayout immediately redirects back to `/login`.

### Step 20: Run Automated Pytest Suite
- Run the full test suite to ensure 100% test pass rate:
  ```bash
  .venv\Scripts\pytest backend/tests -v
  ```
- Verify 15/15 tests pass.
