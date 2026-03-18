"""
HMAC-SHA256 session token signing — compatible with website/lib/session.ts.

Token format:  base64url(JSON(payload)) + "." + base64url(HMAC-SHA256(secret, data))
"""

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional


def _secret() -> bytes:
    return os.environ.get(
        "SESSION_SECRET", "dev-secret-change-in-production"
    ).encode("utf-8")


def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _from_b64u(s: str) -> bytes:
    pad = "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def sign_session(token_id: str, expires_at_ms: int) -> str:
    """Produce a signed session token string."""
    payload = json.dumps(
        {"tokenId": token_id, "expiresAt": expires_at_ms},
        separators=(",", ":"),
    )
    data = _b64u(payload.encode("utf-8"))
    sig = hmac.new(_secret(), data.encode("utf-8"), hashlib.sha256).digest()
    return f"{data}.{_b64u(sig)}"


def verify_session(token: str) -> Optional[dict]:
    """Verify a signed session token and return its payload, or None if invalid."""
    dot = token.rfind(".")
    if dot == -1:
        return None
    data, sig_part = token[:dot], token[dot + 1:]
    try:
        expected_sig = _b64u(
            hmac.new(_secret(), data.encode("utf-8"), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(expected_sig, sig_part):
            return None
        payload = json.loads(_from_b64u(data).decode("utf-8"))
        if payload.get("expiresAt", 0) < int(time.time() * 1000):
            return None
        return payload
    except Exception:
        return None
