"""API keys for the engine, one per client, so usage can be metered and revoked.

    ENGINE_API_KEYS="gestor-familia:3f9c...,web-demo:a81b..."

The key travels in the `X-API-Key` header (or `Authorization: Bearer <key>`). With
the variable unset the API stays open, which is what local development expects; the
startup log says so loudly so it is never deployed that way by accident.
"""
from __future__ import annotations

import logging
import os
import secrets

from fastapi import Header, HTTPException

log = logging.getLogger("jev.auth")

ENV_VAR = "ENGINE_API_KEYS"
OPEN_CLIENT = "anonymous"


def configured_keys(raw: str | None = None) -> dict[str, str]:
    """Parse `name:key,name:key` into {key: name}. Blank entries are ignored."""
    raw = os.getenv(ENV_VAR, "") if raw is None else raw
    keys: dict[str, str] = {}
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        name, sep, key = entry.partition(":")
        name, key = name.strip(), key.strip()
        if not sep or not name or not key:
            raise ValueError(f"{ENV_VAR}: each entry must be name:key, got {entry!r}")
        if len(key) < 16:
            raise ValueError(f"{ENV_VAR}: key for {name!r} is too short (min 16 chars)")
        keys[key] = name
    return keys


def client_for(presented: str | None, keys: dict[str, str]) -> str | None:
    """Name of the client owning `presented`, comparing in constant time."""
    if not presented:
        return None
    found = None
    for key, name in keys.items():  # check every key so timing does not leak which matched
        if secrets.compare_digest(key.encode(), presented.encode()):
            found = name
    return found


def require_api_key(
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    authorization: str | None = Header(None),
) -> str:
    """FastAPI dependency: returns the client name, or raises 401."""
    keys = configured_keys()
    if not keys:
        return OPEN_CLIENT
    presented = x_api_key
    if not presented and authorization and authorization.lower().startswith("bearer "):
        presented = authorization[7:].strip()
    client = client_for(presented, keys)
    if client is None:
        raise HTTPException(401, "Clave de API inválida o ausente (cabecera X-API-Key)")
    return client


def log_startup_state() -> None:
    try:
        keys = configured_keys()
    except ValueError as e:
        log.error("%s", e)
        raise
    if keys:
        log.info("API keys configured for: %s", ", ".join(sorted(set(keys.values()))))
    else:
        log.warning("%s is empty: the API accepts requests without a key", ENV_VAR)
