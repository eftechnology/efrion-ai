"""
Access token CRUD — stores pending/active/expired tokens in data/access-tokens.json.
Key names match the TypeScript AccessToken interface for file compatibility.
"""

import json
import os
import pathlib
import secrets
import time
from typing import Optional

_DATA_FILE = pathlib.Path("data/access-tokens.json")


def _read() -> list[dict]:
    if not _DATA_FILE.exists():
        return []
    try:
        return json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _write(tokens: list[dict]) -> None:
    _DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    _DATA_FILE.write_text(
        json.dumps(tokens, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def _hex(n: int = 16) -> str:
    return secrets.token_hex(n)


def create_pending(
    *,
    name: str,
    email: str,
    company: str,
    role: str,
    erp_system: str,
    message: str,
    submitted_at: str,
) -> dict:
    tokens = _read()
    entry = {
        "id": f"req_{int(time.time() * 1000)}_{_hex(4)}",
        "name": name,
        "email": email.lower().strip(),
        "company": company,
        "role": role,
        "erpSystem": erp_system,
        "message": message,
        "submittedAt": submitted_at,
        "status": "pending",
        "accessToken": "",
        "expiresAt": None,
    }
    tokens.append(entry)
    _write(tokens)
    return entry


def approve(id_: str, ttl_hours: int) -> Optional[dict]:
    tokens = _read()
    idx = next((i for i, t in enumerate(tokens) if t["id"] == id_), None)
    if idx is None:
        return None
    access_token = _hex(16)  # 32-char hex, 128-bit entropy
    expires_ms = int(time.time() * 1000) + ttl_hours * 3_600_000
    import datetime
    expires_at = datetime.datetime.fromtimestamp(
        expires_ms / 1000, tz=datetime.timezone.utc
    ).isoformat()
    tokens[idx] = {
        **tokens[idx],
        "status": "active",
        "accessToken": access_token,
        "expiresAt": expires_at,
    }
    _write(tokens)
    return tokens[idx]


def find_active(email: str, code: str) -> Optional[dict]:
    import datetime
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    for t in _read():
        if (
            t["email"] == email.lower().strip()
            and t["accessToken"] == code
            and t["status"] == "active"
            and t.get("expiresAt")
            and datetime.datetime.fromisoformat(t["expiresAt"]) > now
        ):
            return t
    return None


def find_by_id(id_: str) -> Optional[dict]:
    return next((t for t in _read() if t["id"] == id_), None)
