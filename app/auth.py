"""API key authentication dependency."""
from __future__ import annotations

import hashlib
import hmac

from fastapi import HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader

from app.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(api_key: str | None = Security(api_key_header)) -> str:
    """Validate inbound API key from request headers."""
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Provide header: X-API-Key",
        )

    if not hmac.compare_digest(api_key, settings.agent_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    return api_key


def api_key_fingerprint(api_key: str) -> str:
    """
    Build a non-reversible, stable identifier for Redis keys/logging.
    """
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()[:24]
