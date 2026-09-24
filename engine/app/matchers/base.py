from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from ..forms import FieldDef
from ..models import Line

NONE = "NONE"


@dataclass
class Match:
    line_id: str | None          # None = the matcher answered NONE
    probability: float           # probability of the chosen option


class Matcher(Protocol):
    name: str

    def match(self, state: str, lines: list[Line], fields: list[FieldDef]) -> dict[str, Match]:
        """One decision per field: which line holds it (or NONE)."""
        ...
