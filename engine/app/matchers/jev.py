"""Jev (TypeSafe AI "System One") via OpenRouter.

!! REQUEST FORMAT NOT YET VERIFIED !!
The dev container that wrote this could not reach openrouter.ai or
docs.typesafe.ai. What is known from public sources: Jev takes a `state`
(text) plus a map of named, typed questions, answers them all in one parallel
call, and returns a probability per answer. How OpenRouter carries those
questions is an assumption here. `build_payload` and `parse_response` are the
only two places to adjust once verified.
"""
from __future__ import annotations

import os

import httpx

from ..forms import FieldDef
from ..models import Line
from .base import NONE, Match

OPENROUTER_URL = os.getenv("OPENROUTER_URL", "https://openrouter.ai/api/v1/chat/completions")
TIMEOUT_S = float(os.getenv("JEV_TIMEOUT_S", "20"))


class JevError(RuntimeError):
    pass


def build_payload(model: str, state: str, lines: list[Line], fields: list[FieldDef]) -> dict:
    options = [ln.id for ln in lines] + [NONE]
    questions = {
        f.key: {
            "type": "choice",
            "question": f.question + " Responde con el ID de la línea, o NONE si no aparece.",
            "options": options,
        }
        for f in fields
    }
    return {"model": model, "state": state, "questions": questions}


def parse_response(body: dict, fields: list[FieldDef]) -> dict[str, Match]:
    """Accepts `{"answers": {key: {"value": "L12", "probability": 0.97}}}`
    (and a couple of plausible variants) until the real shape is confirmed."""
    answers = body.get("answers") or body.get("results") or body
    out: dict[str, Match] = {}
    for f in fields:
        a = answers.get(f.key)
        if a is None:
            raise JevError(f"Respuesta de Jev sin el campo {f.key}: {str(body)[:300]}")
        value = a.get("value") or a.get("answer") or a.get("choice")
        prob = a.get("probability") or a.get("confidence")
        if prob is None and isinstance(a.get("probabilities"), dict):
            prob = a["probabilities"].get(value)
        out[f.key] = Match(None if value in (None, NONE) else str(value), float(prob or 0.0))
    return out


class JevMatcher:
    name = "jev"

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY") or os.getenv("JEV_API_KEY")
        if not self.api_key:
            raise JevError("Falta OPENROUTER_API_KEY")
        self.model = model or os.getenv("JEV_MODEL", "typesafe/jev-1.13")
        self.client = httpx.Client(timeout=TIMEOUT_S)

    def match(self, state: str, lines: list[Line], fields: list[FieldDef]) -> dict[str, Match]:
        payload = build_payload(self.model, state, lines, fields)
        r = self.client.post(
            OPENROUTER_URL,
            json=payload,
            headers={"Authorization": f"Bearer {self.api_key}", "X-Title": "jev-forms demo"},
        )
        if r.status_code >= 400:
            raise JevError(f"Jev/OpenRouter {r.status_code}: {r.text[:500]}")
        result = parse_response(r.json(), fields)
        valid = {ln.id for ln in lines}
        for key, m in result.items():
            if m.line_id is not None and m.line_id not in valid:
                raise JevError(f"Jev devolvió una línea inexistente para {key}: {m.line_id}")
        return result
