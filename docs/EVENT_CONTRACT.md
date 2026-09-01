# SmartVault Security Telemetry Contract
**Integration Interface for External Cybersecurity Detection & Incident Management Platform**

Version: `1.0.0`  
Protocol: `REST / Redis Streams`  
Telemetry Classification: `Defensive Security Telemetry (Privacy-Preserving / Metadata Only)`

---

## 1. Overview & Architectural Role

SmartVault is the **target application** in the BEA cybersecurity ecosystem. It does **not** evaluate risk scores, classify anomalies, generate incidents, or trigger containment. Instead, it emits structured, high-fidelity security events reflecting every security-relevant action occurring across authentication, session management, file operations, profile modifications, authorization boundaries, and system errors.

The future **Cybersecurity Detection Platform** subscribes to this telemetry to identify threat patterns (such as brute force attacks, credential stuffing, account takeover, data exfiltration, and privilege violations).

```
                      SMARTVAULT APPLICATION
               (User Actions & Protected Operations)
                               │
                Structured Telemetry Generation
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    Persistent Event Store           Redis Streams Publisher
  (PostgreSQL `security_events`)    (`smartvault:security_events`)
               │                               │
               ▼                               ▼
     Replay & Batch Sync API         Live Real-Time Stream
  `GET /api/internal/events`          (XREAD / XREADGROUP)
               │                               │
               └───────────────┬───────────────┘
                               ▼
            CYBERSECURITY DETECTION PLATFORM
      (Rule Matching, ML Detection, Incident Engine)
```

---

## 2. Strict Privacy Boundary Specification

To enforce strict user privacy ("User Data is Private"), SmartVault telemetry adheres to the following privacy invariants:

### Emitted Telemetry (Safe)
- Actor identifiers: `user_id`, `session_id`, `source_ip`, `user_agent`, `device_information`
- Action identifiers: `event_id`, `event_type`, `action`, `status`, `resource_type`, `resource_id`
- File metadata: `mime_type`, `file_size` (in bytes), `extension`
- Timestamps: ISO 8601 UTC timestamps

### Prohibited Telemetry (Zero-Knowledge Invariant)
The telemetry system **NEVER** extracts, logs, or streams:
- Actual file contents (binary blobs, plain text documents, media streams)
- Plaintext passwords or bcrypt password hashes
- Raw session tokens or SHA-256 token hashes
- Resend email API keys or provider credentials
- Sensitive personal notes or message bodies

---

## 3. Canonical Event Schema

Every event emitted by SmartVault conforms to the canonical JSON schema:

```json
{
  "event_id": "evt_9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d",
  "event_type": "FILE_DOWNLOADED",
  "timestamp": "2026-08-31T20:00:00.000000+00:00",
  "user_id": "demo-user-001",
  "session_id": "sess_4f8c9b2a1e",
  "source_ip": "192.168.1.50",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "device_information": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "resource_type": "FILE",
  "resource_id": "f_1a2b3c4d5e",
  "action": "DOWNLOAD",
  "status": "SUCCESS",
  "metadata": {
    "file_type": "application/pdf",
    "file_size": 204800,
    "extension": ".pdf"
  }
}
```

### Field Definitions

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `event_id` | String (UUID) | **Yes** | Unique identifier for deduplication |
| `event_type` | String (Enum) | **Yes** | Standardized event categorization |
| `timestamp` | String (ISO 8601 UTC) | **Yes** | Exact time of event generation |
| `user_id` | String or `null` | Optional | Authenticated user ID (null for unauth attempts) |
| `session_id` | String or `null` | Optional | Active session identifier |
| `source_ip` | String | **Yes** | Originating client IP address (from X-Forwarded-For or socket) |
| `user_agent` | String | **Yes** | Client browser user agent string |
| `device_information` | String | **Yes** | Client platform details |
| `resource_type` | String (Enum) | Optional | `FILE`, `USER`, `SESSION`, `AUTH`, `SYSTEM` |
| `resource_id` | String or `null` | Optional | ID of the target resource (e.g., file UUID) |
| `action` | String | **Yes** | Operation performed (`LOGIN`, `UPLOAD`, `DOWNLOAD`, etc.) |
| `status` | String (Enum) | **Yes** | `SUCCESS`, `FAILURE`, `DENIED`, `ERROR` |
| `metadata` | Object (JSON) | **Yes** | Key-value dictionary of non-confidential operational metadata |

---

## 4. Supported Event Types

### Authentication Events
- `LOGIN_SUCCESS`: Authenticated successfully with valid credentials.
- `LOGIN_FAILURE`: Invalid password or unknown account attempt.
- `LOGOUT`: Explicit user sign-out and cookie invalidation.
- `PASSWORD_CHANGE`: Password updated via profile management.
- `ACCOUNT_LOCKED`: Account locked after 5 consecutive failed login attempts.

### Session Events
- `SESSION_CREATED`: New 24-hour opaque session token issued.
- `SESSION_TERMINATED`: Session revoked upon logout or administrative action.
- `SESSION_EXPIRED`: Expired session presented by client.

### File Events
- `FILE_UPLOADED`: New file validated and stored in vault (`metadata.file_size`, `metadata.file_type`).
- `FILE_VIEWED`: File metadata inspected by authorized user.
- `FILE_DOWNLOADED`: File byte stream downloaded by authorized user.
- `FILE_DELETED`: File permanently removed from vault.

### Profile & Account Events
- `PROFILE_VIEWED`: Profile configuration page visited.
- `PROFILE_UPDATED`: Display name or email updated (`metadata.updated_fields`).

### Authorization Events
- `UNAUTHORIZED_ACCESS_ATTEMPT`: Unauthenticated request against protected endpoint.
- `FORBIDDEN_FILE_ACCESS`: Attempted access to another user's file or unauthorized resource.

### System Events
- `API_REQUEST`: Operational endpoint execution.
- `ERROR_EVENT`: Storage, network, validation, or internal exception.

---

## 5. Event Delivery Protocols

### A. Live Streaming via Redis Streams
- **Stream Name**: `smartvault:security_events`
- **Delivery**: Asynchronous `XADD` execution from SmartVault backend.
- **Consumer Group Consumption**:
  ```bash
  # Example Redis command to read new events
  XREADGROUP GROUP detection_group consumer_1 BLOCK 2000 STREAMS smartvault:security_events >
  ```

### B. Persistent Event Replay API
- **Endpoint**: `GET /api/internal/events`
- **Authentication**: Requires header `X-Event-Consumer-Key`
- **Query Parameters**:
  - `limit`: Integer (default 100, max 1000)
  - `offset`: Integer (default 0)
  - `since`: ISO timestamp (e.g. `2026-08-31T00:00:00Z`)
  - `event_type`: Filter by type (e.g. `LOGIN_FAILURE`)

**Example Consumer Request**:
```http
GET /api/internal/events?limit=50&event_type=LOGIN_FAILURE HTTP/1.1
Host: localhost:8000
X-Event-Consumer-Key: smartvault-local-consumer
Accept: application/json
```

---

## 6. Threat Scenario Mapping for Future Detection Platform

| Threat Scenario | SmartVault Generated Telemetry | Detection Platform Correlation Logic |
| :--- | :--- | :--- |
| **Brute Force** | Rapid sequence of `LOGIN_FAILURE` events with same `source_ip` or `user_id`. | Frequency threshold: >5 failed attempts in 60s window. |
| **Account Takeover** | `LOGIN_SUCCESS` with novel `source_ip` or `user_agent` followed by immediate `PASSWORD_CHANGE`. | Anomaly detection on actor fingerprint + rapid credential rotation. |
| **Data Exfiltration** | Spike in `FILE_DOWNLOADED` events in a short time window. | High volume / byte count anomaly relative to user historical baseline. |
| **IDOR / Unauthorized Access** | `FORBIDDEN_FILE_ACCESS` or `UNAUTHORIZED_ACCESS_ATTEMPT` events. | Rule matching on repeated 404/403 attempts against sequential IDs. |
