"""
Vercel Serverless Entry Point for SmartVault Backend.
Wraps the FastAPI ASGI app with Mangum for AWS Lambda / Vercel serverless compatibility.
"""

from backend.server import app  # noqa: F401 — re-exported for Vercel

# Vercel's Python runtime looks for a variable named `app` in api/index.py
# The FastAPI app object IS the ASGI app — no extra wrapping needed.
__all__ = ["app"]
