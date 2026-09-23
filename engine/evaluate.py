"""Phase 0 report: per-field accuracy and timings over the sample invoices.

Put invoices in samples/ and the correct values in samples/expected.json:

    {
      "factura1.pdf": {"ruc_emisor": "0990000000001", "numero_factura": "001-001-000000123",
                        "fecha_emision": "2025-03-15", "subtotal": "100.00", "iva": "15.00",
                        "total": "115.00", "razon_social": "EMPRESA S.A."},
      ...
    }

    python evaluate.py                     # uses MATCHER env (default jev)
    python evaluate.py --matcher heuristic
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

from app.matchers import get_matcher
from app.pipeline import process

SAMPLES = Path(__file__).parent / "samples"


def _norm(v: str | None) -> str:
    if v is None:
        return ""
    v = unicodedata.normalize("NFKD", v).encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z0-9.\-]", "", v)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--matcher", choices=["jev", "heuristic"], default=None)
    ap.add_argument("--samples", type=Path, default=SAMPLES)
    args = ap.parse_args()

    expected = json.loads((args.samples / "expected.json").read_text(encoding="utf-8"))
    matcher = get_matcher(args.matcher)

    per_field = defaultdict(lambda: {"ok": 0, "n": 0, "green_wrong": 0})
    rows = []
    for name, truth in expected.items():
        out = process((args.samples / name).read_bytes(), matcher=matcher, include_previews=False)
        fields = {f["key"]: f for f in out["fields"]}
        marks = []
        for key, want in truth.items():
            got = fields.get(key, {})
            ok = _norm(got.get("value")) == _norm(want)
            s = per_field[key]
            s["n"] += 1
            s["ok"] += ok
            # The dangerous case: wrong value shown as green.
            s["green_wrong"] += (not ok) and got.get("status") == "green"
            icon = {"green": "🟢", "yellow": "🟡"}.get(got.get("status"), "⚪")
            marks.append(f"{icon}{'✓' if ok else '✗'} {key}={got.get('value')!r}" + ("" if ok else f" (esperado {want!r})"))
        t = out["timings"]
        rows.append((name, out["document"]["type"], t, marks))

    for name, dtype, t, marks in rows:
        print(f"\n## {name}  [{dtype}]  lectura {t['read_ms']} ms · matcher {t['match_ms']} ms · total {t['total_ms']} ms")
        for m in marks:
            print("   ", m)

    print(f"\n## Precisión por campo (matcher: {matcher.name})")
    total_ok = total_n = 0
    for key, s in per_field.items():
        total_ok += s["ok"]
        total_n += s["n"]
        warn = f"  ⚠ {s['green_wrong']} en verde pero incorrectos" if s["green_wrong"] else ""
        print(f"  {key:16s} {s['ok']}/{s['n']}  ({100 * s['ok'] / s['n']:.0f}%){warn}")
    print(f"  {'TOTAL':16s} {total_ok}/{total_n}  ({100 * total_ok / max(total_n, 1):.0f}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
