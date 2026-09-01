# SmartVault: Private Personal Data Storage & Management Application

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-Streams_7-DC382D.svg?logo=redis&logoColor=white)](https://redis.io)

SmartVault is a private digital vault web application where authenticated users can securely store, manage, view, download, and delete confidential personal documents and media files.

SmartVault serves as the primary **protected target application** for a larger BEA cybersecurity architecture. It is engineered from the ground up to generate rich, structured, privacy-preserving security telemetry for external detection platforms without hosting detection or threat simulation logic internally.

---

## 🔒 The Core Privacy Principle: *User Data is Private*

In SmartVault:
1. **Confidential files belong solely to the user.**
2. External security analysts, administrators, and automated detection platforms **never** have access to file contents or user secrets.
3. SmartVault emits **security event metadata** (actor identifiers, action types, timestamps, MIME types, byte sizes), but **zero confidential data**.

---

## 🏗️ System Architecture

```
                                SMARTVAULT
                         (Enterprise Open Source Stack)

                           React / TypeScript UI
                                    │
                            /api REST Requests
                                    │
                           FastAPI Application
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
      Auth Service             File Service           Event Service
   (Bcrypt, Sessions)      (Validation, Storage)    (Telemetry Producer)
            │                       │                       │
            ▼                       ▼                       ▼
    PostgreSQL Sessions    Local Disk / Object     PostgreSQL Event Store
            │                    Storage                    │
            │                       │                       ▼
            │                       │             Redis Streams Publisher
            │                       │            (smartvault:security_events)
            │                       │                       │
            └───────────────────────┴───────────────────────┼─────────────┐
                                                            ▼             ▼
                                                CYBERSECURITY DETECTION PLATFORM
                                                    (Rules, ML, Incidents)
```

---

## 🚀 Quickstart

### Option A: Docker Compose (Full Stack)

Ensure Docker is running, then execute:

```bash
docker compose up -d --build
```

- **Frontend Application**: `http://localhost:5173`
- **FastAPI OpenAPI Documentation**: `http://localhost:8000/api/docs`
- **Health Check**: `http://localhost:8000/health`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

### Option B: Local Standalone Execution

#### 1. Backend Setup
```bash
# Create and activate Python virtual environment
python -m venv .venv
.venv\Scripts\activate   # On Windows
# source .venv/bin/activate # On Linux/macOS

# Install dependencies
pip install -r backend/requirements.txt

# Start backend server (starts with SQLite fallback if Postgres is offline)
uvicorn backend.server:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🔑 Demo Credentials

| Role | Primary Email | Legacy Username | Password | User ID |
| :--- | :--- | :--- | :--- | :--- |
| **Demo User** | `user123@example.com` | `user123` | `123` | `demo-user-001` |

---

## 📡 Security Telemetry Contract

SmartVault streams events to Redis Streams (`smartvault:security_events`) and exposes a persistent replay API:

### Replay API
```http
GET /api/internal/events HTTP/1.1
Host: localhost:8000
X-Event-Consumer-Key: smartvault-local-consumer
```

### Canonical Event Schema
```json
{
  "event_id": "evt_48a1768c87de4d2b",
  "event_type": "FILE_DOWNLOADED",
  "timestamp": "2026-08-31T20:15:30.123456+00:00",
  "user_id": "demo-user-001",
  "session_id": "sess_f0a8d67e",
  "source_ip": "127.0.0.1",
  "user_agent": "Mozilla/5.0...",
  "device_information": "Mozilla/5.0...",
  "resource_type": "FILE",
  "resource_id": "f_98ac71",
  "action": "DOWNLOAD",
  "status": "SUCCESS",
  "metadata": {
    "file_type": "application/pdf",
    "file_size": 204800
  }
}
```

Detailed telemetry specifications can be found in [docs/EVENT_CONTRACT.md](docs/EVENT_CONTRACT.md).

---

## 🧪 Automated Testing

Run the full backend test suite:
```bash
.venv\Scripts\pytest backend/tests -v
```

Run frontend typechecking and build:
```bash
cd frontend
npm run build
```

---

## 📖 Demonstration Walkthrough

Refer to [docs/SMARTVAULT_DEMONSTRATION_GUIDE.md](docs/SMARTVAULT_DEMONSTRATION_GUIDE.md) for the complete 20-step demonstration procedure.
