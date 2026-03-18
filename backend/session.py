"""
JWT session tokens (HS256) — verified by website/lib/session.ts via jose.
"""

import os
from typing import Optional

import jwt


def _secret() -> str:
    return os.environ.get("SESSION_SECRET", "dev-secret-change-in-production")


def sign_session(token_id: str, expires_at_ms: int) -> str:
    """Return a signed HS256 JWT with sub=token_id and exp in seconds."""
    payload = {
        "sub": token_id,
        "exp": expires_at_ms // 1000,  # JWT exp is Unix seconds
    }
    return jwt.encode(payload, _secret(), algorithm="HS256")


def verify_session(token: str) -> Optional[dict]:
    """Verify a JWT and return {tokenId, expiresAt} or None."""
    try:
        payload = jwt.decode(token, _secret(), algorithms=["HS256"])
        return {
            "tokenId": payload["sub"],
            "expiresAt": payload["exp"] * 1000,
        }
    except Exception:
        return None
