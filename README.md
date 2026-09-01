# SmartVault — Private Personal Data Storage & Asset Protection

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-09090b.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-09090b.svg?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-09090b.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-09090b.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Storage](https://img.shields.io/badge/Storage_Limit-1_GB-09090b.svg)](https://smartvault.app)

SmartVault is a zero-knowledge private digital vault web application where authenticated users securely store, inspect, download, and manage confidential personal files and digital assets with an allocated **1 GB storage limit** and a luxury monochrome interface.

---

## 🌐 Quick Access & Local URLs

When running locally, access the various interfaces and endpoints below:

| Resource / Interface | Local Address | Purpose |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173/](http://localhost:5173/) | Interactive user vault interface |
| **Interactive API Documentation** | [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs) | FastAPI Swagger UI / OpenAPI explorer |
| **Alternative API Reference** | [http://127.0.0.1:8000/api/redoc](http://127.0.0.1:8000/api/redoc) | ReDoc API specification |
| **Backend Health Check** | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) | API and database health status |
| **Custom 404 Recovery Interface** | [http://localhost:5173/404](http://localhost:5173/404) | Cryptographic error recovery screen |
| **AI Crawler / LLM Specification** | [http://localhost:5173/llms.txt](http://localhost:5173/llms.txt) | LLMs.txt architecture and API contract |
| **XML Sitemap** | [http://localhost:5173/sitemap.xml](http://localhost:5173/sitemap.xml) | Search engine indexing schema |
| **Crawler Policy** | [http://localhost:5173/robots.txt](http://localhost:5173/robots.txt) | Robot crawler directives |

---

## 🔒 Core Privacy & Security Principles

1. **User Data Belongs Exclusively to the User**: All uploaded documents and media files are strictly isolated.
2. **Zero Plaintext Credentials**: Passwords are encrypted using standard `bcrypt` (12 rounds) with constant-time verification.
3. **High-Entropy Cryptographic Sessions**: 256-bit CSPRNG session tokens hashed with SHA-256 for secure database verification.
4. **Path Traversal & MIME Protection**: File uploads undergo strict sanitization, extension validation, and MIME-type integrity checks.
5. **Zero-Knowledge Operational Auditing**: Audit logs and event streams record high-level security metadata (timestamps, actions, MIME types, file sizes) with zero exposure of confidential file contents or user secrets.

---

## 🏗️ System Architecture

```
                                 SMARTVAULT
                          (Zero-Knowledge Platform)

                            React + TypeScript UI
                       (Classy Monochrome B&W Aesthetic)
                                     │
                             /api REST Requests
                                     │
                            FastAPI Backend
                                     │
             ┌───────────────────────┼───────────────────────┐
             ▼                       ▼                       ▼
       Auth Service             File Service            Audit Service
    (Bcrypt, Sessions)     (1 GB Max, Validation)     (Activity Logger)
             │                       │                       │
             ▼                       ▼                       ▼
    Session Storage        Encrypted Local / S3        Audit Trail Log
   (Postgres / SQLite)           Disk Storage        (Postgres / SQLite / Redis)
```

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
# Create and activate Python virtual environment
python -m venv .venv
.venv\Scripts\activate   # On Windows
# source .venv/bin/activate # On Linux/macOS

# Install dependencies
pip install -r backend/requirements.txt

# Start backend server (defaults to port 8000 with automatic SQLite fallback)
python -m uvicorn backend.server:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server (port 5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Demo Credentials

For testing and demonstration, use the pre-configured credentials:

| Role | Email Identifier | Password | Allocation |
| :--- | :--- | :--- | :--- |
| **Demo User** | `user123@example.com` | `123` | **1 GB** |

---

## 📁 Supported File Formats

SmartVault supports secure storage for common personal document and asset formats up to **1 GB**:
- **Documents**: `.pdf`, `.txt`
- **Images**: `.jpg`, `.jpeg`, `.png`
- **Audio**: `.mp3`
- **Video**: `.mp4`

---

## 🧪 Testing & Build Verification

### Backend Automated Test Suite
```bash
.venv\Scripts\pytest backend/tests -v
```

### Frontend Typechecking & Production Build
```bash
cd frontend
npm run build
```

---

## 📑 Detailed Description

**SmartVault** is a privacy-first personal cloud storage and vault application engineered to deliver uncompromising data confidentiality alongside a luxury, high-contrast monochrome user experience. 

Built with **FastAPI**, **React 18**, **TypeScript**, and **TailwindCSS**, SmartVault provides end-to-end management of personal assets up to **1 GB per account**. The application features an immutable security audit trail, live storage allocation tracking, dynamic SEO with canonical URL handling, custom 404 error recovery, and automated code-split JavaScript bundles with production source map protection.
