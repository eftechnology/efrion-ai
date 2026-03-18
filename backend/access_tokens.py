"""
Access token CRUD backed by PostgreSQL.
All public functions are async. Key names use camelCase to match the
rest of the codebase (TypeScript convention).
"""

import datetime
import secrets
import time
from typing import Optional

import database


def _hex(n: int = 16) -> str:
    return secrets.token_hex(n)


def _to_dict(row) -> dict:
    """Convert an asyncpg Record to the camelCase dict shape used by api.py."""
    if row is None:
        return None

    def iso(v):
        if isinstance(v, datetime.datetime):
            if v.tzinfo is None:
                v = v.replace(tzinfo=datetime.timezone.utc)
            return v.isoformat()
        return v

    return {
        "id":          row["id"],
        "name":        row["name"],
        "email":       row["email"],
        "company":     row["company"],
        "role":        row["role"],
        "erpSystem":   row["erp_system"],
        "message":     row["message"],
        "submittedAt": iso(row["submitted_at"]),
        "status":      row["status"],
        "accessToken": row["access_token"],
        "expiresAt":   iso(row["expires_at"]) if row["expires_at"] else None,
    }


async def create_pending(
    *,
    name: str,
    email: str,
    company: str,
    role: str,
    erp_system: str,
    message: str,
    submitted_at: str,
) -> dict:
    id_ = f"req_{int(time.time() * 1000)}_{_hex(4)}"
    submitted = datetime.datetime.fromisoformat(submitted_at)

    async with database.pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO access_requests
                (id, name, email, company, role, erp_system, message, submitted_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *
            """,
            id_, name, email.lower().strip(),
            company, role, erp_system, message, submitted,
        )
    return _to_dict(row)


async def approve(id_: str, ttl_hours: int) -> Optional[dict]:
    access_token = _hex(16)  # 32-char hex, 128-bit entropy
    expires_at = datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(
        hours=ttl_hours
    )

    async with database.pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE access_requests
               SET status       = 'active',
                   access_token = $1,
                   expires_at   = $2
             WHERE id = $3
               AND status = 'pending'
            RETURNING *
            """,
            access_token, expires_at, id_,
        )
    return _to_dict(row) if row else None


async def find_active(email: str, code: str) -> Optional[dict]:
    now = datetime.datetime.now(tz=datetime.timezone.utc)

    async with database.pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT * FROM access_requests
             WHERE email        = $1
               AND access_token = $2
               AND status       = 'active'
               AND expires_at   > $3
            LIMIT 1
            """,
            email.lower().strip(), code, now,
        )
    return _to_dict(row) if row else None


async def find_by_id(id_: str) -> Optional[dict]:
    async with database.pool().acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM access_requests WHERE id = $1", id_
        )
    return _to_dict(row) if row else None
