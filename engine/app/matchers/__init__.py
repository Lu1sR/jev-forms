from __future__ import annotations

import os

from .base import Match, Matcher, NONE


def get_matcher(name: str | None = None) -> Matcher:
    name = name or os.getenv("MATCHER", "jev")
    if name == "heuristic":
        from .heuristic import HeuristicMatcher
        return HeuristicMatcher()
    if name == "jev":
        from .jev import JevMatcher
        return JevMatcher()
    raise ValueError(f"MATCHER desconocido: {name}")


__all__ = ["Match", "Matcher", "NONE", "get_matcher"]
