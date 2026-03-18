"""
PostgreSQL connection pool and schema initialisation.
Call `await database.init()` once at application startup.
"""

import os
from typing import Optional

import asyncpg

_pool: Optional[asyncpg.Pool] = None


async def init() -> None:
    global _pool
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    _pool = await asyncpg.create_pool(dsn=dsn, min_size=2, max_size=10)
    await _migrate()


def pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialised. Call database.init() first.")
    return _pool


async def _migrate() -> None:
    async with _pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS access_requests (
                id             TEXT        PRIMARY KEY,
                name           TEXT        NOT NULL,
                email          TEXT        NOT NULL,
                company        TEXT        NOT NULL DEFAULT '',
                role           TEXT        NOT NULL DEFAULT '',
                erp_system     TEXT        NOT NULL DEFAULT '',
                message        TEXT        NOT NULL DEFAULT '',
                submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                status         TEXT        NOT NULL DEFAULT 'pending',
                access_token   TEXT        NOT NULL DEFAULT '',
                expires_at     TIMESTAMPTZ
            );
        """)
        # Index for fast email + token lookups on login
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_access_requests_email
                ON access_requests (email);
        """)
