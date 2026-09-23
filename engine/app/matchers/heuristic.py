"""Offline keyword baseline. Not the product: it exists so the pipeline runs
without an API key, and to have something to compare Jev against in the
Phase 0 report. Its "probabilities" are score ratios, NOT calibrated."""
from __future__ import annotations

import re
import unicodedata

from ..extract import extract_near
from ..forms import FieldDef
from ..models import Line
from .base import Match

# Words that mean the line is about the buyer or another concept.
_NEGATIVE = {
    "ruc": ["cliente", "comprador", "adquiriente", "identificacion", "c.i"],
    "text": ["cliente", "comprador", "adquiriente", "comercial", "nombres y apellidos"],
    "date": ["autorizacion", "vence", "vencimiento"],
}


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s)


class HeuristicMatcher:
    name = "heuristic"

    def match(self, state: str, lines: list[Line], fields: list[FieldDef]) -> dict[str, Match]:
        return {f.key: self._match_one(f, lines) for f in fields}

    def _match_one(self, f: FieldDef, lines: list[Line]) -> Match:
        scores: list[tuple[float, Line]] = []
        hints = [_norm(h) for h in f.hints]
        for pos, ln in enumerate(lines):
            text = _norm(ln.text)
            score = 0.0
            for i, h in enumerate(hints):
                if re.search(rf"(?<![a-z]){re.escape(h)}(?![a-z])", text):
                    # Earlier hints are more specific; shorter lines = closer to a label.
                    score = max(score, (len(hints) - i) * 2 + len(h) / max(len(text), 1))
            if score == 0:
                continue
            neg = _NEGATIVE.get(f.type, [])
            if any(n in text for n in neg):
                continue
            if extract_near(f.type, ln, lines)[0] is None:
                score -= 4
            score -= pos * 0.001  # tie-break: earlier lines first (issuer is on top)
            scores.append((score, ln))

        if f.type == "text" and not any(s > 0 for s, _ in scores):
            # Issuer name is typically the first mostly-letters line on page 1.
            for ln in lines[:8]:
                if ln.page == 0 and sum(c.isalpha() for c in ln.text) > 6 and not re.search(r"\d{5}", ln.text):
                    return Match(ln.id, 0.5)

        scores = [s for s in scores if s[0] > 0]
        if not scores:
            return Match(None, 0.6)
        scores.sort(key=lambda t: -t[0])
        best = scores[0][0]
        second = scores[1][0] if len(scores) > 1 else 0.0
        prob = round(min(0.95, 0.5 + 0.5 * (best - second) / best), 3)
        return Match(scores[0][1].id, prob)
