from app.matchers import FallbackMatcher, get_matcher
from app.matchers.base import Match
from app.matchers.jev import JevError


class _Broken:
    name = "jev"

    def match(self, state, lines, fields):
        raise JevError("Jev/OpenRouter 404: not found")


class _Fixed:
    name = "heuristic"

    def match(self, state, lines, fields):
        return {"total": Match("L1", 0.7)}


def test_falls_back_when_primary_fails():
    m = FallbackMatcher(_Broken(), _Fixed())
    assert m.match("", [], []) == {"total": Match("L1", 0.7)}
    assert m.name == "heuristic (respaldo)"


def test_jev_without_key_uses_heuristic(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("JEV_API_KEY", raising=False)
    assert get_matcher("jev").name == "heuristic"
