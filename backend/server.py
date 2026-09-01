"""
SmartVault Server Entrypoint
FastAPI application with unified /api routing, lifespan management,
CORS security, error sanitization, and background telemetry streaming.
"""

import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI, APIRouter, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from .lib.pg import db
from .lib.events import event_publisher, record_event
from .routers.auth import router as auth_router
from .routers.users import router as users_router
from .routers.files import router as files_router
from .routers.dashboard import router as dashboard_router
from .routers.activity import router as activity_router
from .routers.internal import router as internal_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("smartvault.server")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for database and stream connections."""
    logger.info("Initializing SmartVault backend services...")
    await db.connect()
    await event_publisher.connect()
    yield
    logger.info("Shutting down SmartVault backend services...")
    await event_publisher.disconnect()
    await db.disconnect()


app = FastAPI(
    title="SmartVault API",
    description="Private Personal Data Storage & Management Application — Target BEA Architecture",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors cleanly with JSON serializable structures."""
    cleaned_errors = []
    for err in exc.errors():
        cleaned_errors.append({
            "loc": list(err.get("loc", [])),
            "msg": str(err.get("msg", "Validation error")),
            "type": str(err.get("type", "value_error"))
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Invalid request payload or parameters", "errors": cleaned_errors}
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all error handler preventing stack trace leaks."""
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    # Record error telemetry
    try:
        await record_event(
            event_type="ERROR_EVENT",
            action="API_REQUEST",
            status="ERROR",
            request=request,
            resource_type="SYSTEM",
            resource_id=request.url.path,
            metadata={"error_type": type(exc).__name__}
        )
    except Exception:
        pass

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal error occurred. Please try again later."}
    )


# Root health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "SmartVault",
        "privacy": "verified",
        "database": "connected" if db.is_postgres or os.path.exists(db.sqlite_db_path) else "initializing"
    }


# Shared API Router with /api prefix
api_router = APIRouter(prefix="/api")

# Register sub-routers onto api_router
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(files_router)
api_router.include_router(dashboard_router)
api_router.include_router(activity_router)
api_router.include_router(internal_router)

# Mount api_router onto main FastAPI app
app.include_router(api_router)
