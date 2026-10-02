from __future__ import annotations

import logging
import os

from .base import Match, Matcher, NONE

log = logging.getLogger("uvicorn.error")


class FallbackMatcher:
    """Runs the primary matcher; if it fails (Jev down, bad key, unexpected
    response shape), logs why and answers with the offline heuristic instead,
    so an upload still comes back with a form to review instead of an error."""

    def __init__(self, primary: Matcher, fallback: Matcher):
        self.primary, self.fallback = primary, fallback
        self.name = primary.name

    def match(self, state, lines, fields) -> dict[str, Match]:
        from .jev import JevError
        try:
            return self.primary.match(state, lines, fields)
        # Not only JevError: timeouts and network errors come from httpx.
        except Exception as e:  # noqa: BLE001
            log.error("Matcher %s falló, usando %s: %s", self.primary.name, self.fallback.name, e,
                      exc_info=not isinstance(e, JevError))
            self.name = f"{self.fallback.name} (respaldo)"
            return self.fallback.match(state, lines, fields)


def get_matcher(name: str | None = None) -> Matcher:
    name = name or os.getenv("MATCHER", "jev")
    if name == "heuristic":
        from .heuristic import HeuristicMatcher
        return HeuristicMatcher()
    if name == "jev":
        from .heuristic import HeuristicMatcher
        from .jev import JevError, JevMatcher
        try:
            jev = JevMatcher()
        except JevError as e:
            if os.getenv("MATCHER_FALLBACK", "1") != "1":
                raise
            log.error("Jev no disponible, usando heuristic: %s", e)
            return HeuristicMatcher()
        if os.getenv("MATCHER_FALLBACK", "1") != "1":
            return jev
        return FallbackMatcher(jev, HeuristicMatcher())
    raise ValueError(f"MATCHER desconocido: {name}")


__all__ = ["FallbackMatcher", "Match", "Matcher", "NONE", "get_matcher"]
