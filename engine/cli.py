"""Phase 0: run the full pipeline on one file and print the JSON.

    python cli.py samples/factura.pdf
    python cli.py samples/foto.jpg --matcher heuristic --state
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.layout import build_lines, render_state
from app.matchers import get_matcher
from app.pipeline import process
from app.readers.detect import read_document


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("file", type=Path)
    ap.add_argument("--form", default="sorteo")
    ap.add_argument("--matcher", choices=["jev", "heuristic"], default=None)
    ap.add_argument("--state", action="store_true", help="print only the numbered lines sent to the matcher")
    ap.add_argument("--full", action="store_true", help="include lines and previews in the output")
    args = ap.parse_args()

    data = args.file.read_bytes()
    if args.state:
        doc = read_document(data)
        print(f"# {doc.type}, {len(doc.pages)} página(s)")
        print(render_state(build_lines(doc.boxes, doc.pages)))
        return 0

    out = process(data, args.form, get_matcher(args.matcher), include_previews=args.full)
    if not args.full:
        out.pop("lines")
        out["document"].pop("previews")
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
