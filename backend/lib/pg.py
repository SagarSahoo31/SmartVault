"""
SmartVault Database Layer
Supports PostgreSQL via asyncpg with seamless SQLite (aiosqlite) fallback for standalone testing.
Handles schema initialization, indexes, connection management, and demo user seeding.
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import asyncpg
import aiosqlite
from .auth import hash_password

logger = logging.getLogger("smartvault.db")

class Database:
    def __init__(self):
        self.is_postgres = False
        self.pg_pool: Optional[asyncpg.Pool] = None
        self.sqlite_db_path: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "smartvault.db"))
        self.database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/smartvault")

    async def connect(self):
        """Connect to database, trying PostgreSQL first, falling back to SQLite if unreachable."""
        if self.database_url and self.database_url.startswith("postgresql"):
            try:
                self.pg_pool = await asyncpg.create_pool(
                    self.database_url,
                    min_size=2,
                    max_size=10,
                    command_timeout=15
                )
                self.is_postgres = True
                logger.info("Connected to PostgreSQL database.")
            except Exception as e:
                logger.warning(f"Could not connect to PostgreSQL ({e}). Falling back to local SQLite engine: {self.sqlite_db_path}")
                self.is_postgres = False
        else:
            self.is_postgres = False

        await self.init_schema()
        await self.seed_demo_user()

    async def disconnect(self):
        """Close database connection pool."""
        if self.is_postgres and self.pg_pool:
            await self.pg_pool.close()
            logger.info("Closed PostgreSQL connection pool.")

    async def init_schema(self):
        """Initialize tables and indexes idempotently."""
        if self.is_postgres and self.pg_pool:
            schema_sql_path = os.path.join(os.path.dirname(__file__), "..", "schema.sql")
            if os.path.exists(schema_sql_path):
                with open(schema_sql_path, "r", encoding="utf-8") as f:
                    ddl = f.read()
                async with self.pg_pool.acquire() as conn:
                    await conn.execute(ddl)
                logger.info("PostgreSQL schema and indexes initialized.")
        else:
            # SQLite fallback schema
            async with aiosqlite.connect(self.sqlite_db_path) as db:
                await db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    display_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    failed_login_count INTEGER NOT NULL DEFAULT 0,
                    locked_until TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """)
                await db.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token_hash TEXT UNIQUE NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL,
                    source_ip TEXT NULL,
                    user_agent TEXT NULL,
                    revoked_at TEXT NULL
                );
                """)
                await db.execute("""
                CREATE TABLE IF NOT EXISTS files (
                    id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    original_filename TEXT NOT NULL,
                    stored_filename TEXT NOT NULL,
                    mime_type TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    storage_reference TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """)
                await db.execute("""
                CREATE TABLE IF NOT EXISTS security_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id TEXT UNIQUE NOT NULL,
                    event_type TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    user_id TEXT NULL,
                    session_id TEXT NULL,
                    source_ip TEXT NULL,
                    user_agent TEXT NULL,
                    device_information TEXT NULL,
                    resource_type TEXT NULL,
                    resource_id TEXT NULL,
                    action TEXT NOT NULL,
                    status TEXT NOT NULL,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL
                );
                """)
                # Indexes
                await db.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_files_owner_id ON files(owner_id);")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_security_events_session_id ON security_events(session_id);")
                await db.execute("CREATE INDEX IF NOT EXISTS idx_security_events_source_ip ON security_events(source_ip);")
                await db.commit()
                logger.info("SQLite schema and indexes initialized.")

    async def seed_demo_user(self):
        """Idempotently seed demo user: user123 / user123@example.com / 123"""
        user = await self.fetch_one("SELECT id FROM users WHERE email = $1 OR username = $2", "user123@example.com", "user123")
        if not user:
            now = datetime.now(timezone.utc)
            pwd_hash = hash_password("123")
            await self.execute(
                """
                INSERT INTO users (id, username, email, display_name, password_hash, failed_login_count, locked_until, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                "demo-user-001",
                "user123",
                "user123@example.com",
                "Demo User",
                pwd_hash,
                0,
                None,
                now,
                now
            )
            logger.info("Seeded demo user: user123@example.com (id: demo-user-001)")

    def _convert_params_sqlite(self, query: str, args: tuple) -> (str, tuple):
        """Convert PostgreSQL $1, $2 query syntax to SQLite ? syntax and format datetime/json."""
        import re
        converted_query = re.sub(r'\$(\d+)', '?', query)
        processed_args = []
        for a in args:
            if isinstance(a, datetime):
                processed_args.append(a.isoformat())
            elif isinstance(a, (dict, list)):
                processed_args.append(json.dumps(a))
            else:
                processed_args.append(a)
        return converted_query, tuple(processed_args)

    async def fetch_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """Fetch a single record as a dictionary."""
        if self.is_postgres and self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                record = await conn.fetchrow(query, *args)
                if record:
                    res = dict(record)
                    if "metadata" in res and isinstance(res["metadata"], str):
                        try:
                            res["metadata"] = json.loads(res["metadata"])
                        except Exception:
                            pass
                    return res
                return None
        else:
            async with aiosqlite.connect(self.sqlite_db_path) as db:
                db.row_factory = aiosqlite.Row
                c_query, c_args = self._convert_params_sqlite(query, args)
                async with db.execute(c_query, c_args) as cursor:
                    row = await cursor.fetchone()
                    if row:
                        res = dict(row)
                        self._normalize_sqlite_types(res)
                        return res
                    return None

    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        """Fetch multiple records as a list of dictionaries."""
        if self.is_postgres and self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                records = await conn.fetch(query, *args)
                result = []
                for r in records:
                    res = dict(r)
                    if "metadata" in res and isinstance(res["metadata"], str):
                        try:
                            res["metadata"] = json.loads(res["metadata"])
                        except Exception:
                            pass
                    result.append(res)
                return result
        else:
            async with aiosqlite.connect(self.sqlite_db_path) as db:
                db.row_factory = aiosqlite.Row
                c_query, c_args = self._convert_params_sqlite(query, args)
                async with db.execute(c_query, c_args) as cursor:
                    rows = await cursor.fetchall()
                    result = []
                    for row in rows:
                        res = dict(row)
                        self._normalize_sqlite_types(res)
                        result.append(res)
                    return result

    async def execute(self, query: str, *args) -> None:
        """Execute an INSERT/UPDATE/DELETE query without returning results."""
        if self.is_postgres and self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                await conn.execute(query, *args)
        else:
            async with aiosqlite.connect(self.sqlite_db_path) as db:
                c_query, c_args = self._convert_params_sqlite(query, args)
                await db.execute(c_query, c_args)
                await db.commit()

    def _normalize_sqlite_types(self, record: Dict[str, Any]):
        """Convert ISO date strings to datetime objects and JSON strings to dicts for SQLite results."""
        for k, v in record.items():
            if isinstance(v, str):
                if k in ("created_at", "updated_at", "timestamp", "expires_at", "last_seen_at", "locked_until", "revoked_at") and v:
                    try:
                        record[k] = datetime.fromisoformat(v)
                    except Exception:
                        pass
                elif k == "metadata":
                    try:
                        record[k] = json.loads(v)
                    except Exception:
                        record[k] = {}

# Global database singleton
db = Database()
