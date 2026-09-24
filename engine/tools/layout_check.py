"""Measure row grouping (app/layout.py) without calling the matcher.

    python tools/layout_check.py                        # current layout only
    python tools/layout_check.py --baseline old.py      # compare with another layout.py
    python tools/layout_check.py --diff                 # also print changed lines

For every image in samples/ (and subfolders) it OCRs the original plus rotated
copies (±3°, ±6°) and reports, per layout version:

  pairs      label/value checks from samples/pairs.json that hold (same row,
             or NOT in the same line), summed over all rotations
  invariant  how much the grouping of each rotated copy matches the original
             (Jaccard of the row texts; OCR noise keeps it below 1.0)

OCR output is cached in samples/.cache/ so re-runs only redo the grouping.
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import importlib.util
import json
import pickle
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.readers.detect import read_document  # noqa: E402

SAMPLES = ROOT / "samples"
CACHE = SAMPLES / ".cache"
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
ANGLES = (0, -6, -3, 3, 6)


def load_layout(path: Path | None):
    if path is None:
        import app.layout as mod
        return mod
    # Load it as if it lived in app/ so its relative imports resolve.
    spec = importlib.util.spec_from_file_location("app._layout_baseline", path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


def ocr_cached(path: Path, angle: int):
    key = hashlib.sha1(path.read_bytes()).hexdigest()[:12]
    cached = CACHE / f"{path.stem}.{key}.{angle}.pkl"
    if cached.exists():
        return pickle.loads(cached.read_bytes())
    img = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    if angle:
        img = img.rotate(angle, expand=True, fillcolor=(255, 255, 255), resample=Image.BICUBIC)
    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    doc = read_document(buf.getvalue())
    CACHE.mkdir(exist_ok=True)
    cached.write_bytes(pickle.dumps(doc))
    return doc


def rows_of(layout, doc) -> list[list[str]]:
    lines = layout.build_lines(doc.boxes, doc.pages)
    rows: dict[int, list[str]] = {}
    for ln in lines:
        rows.setdefault(ln.row, []).append(ln.text)
    return list(rows.values())


def norm(t: str) -> str:
    return re.sub(r"\s+", " ", t.lower()).strip()


def check_pairs(rows: list[list[str]], spec: dict) -> tuple[int, int, list[str]]:
    ok, total, failed = 0, 0, []
    for label, value in spec.get("same_row", []):
        total += 1
        hit = any(
            any(re.search(label, s, re.I) for s in row) and any(re.search(value, s, re.I) for s in row)
            for row in rows
        )
        ok += hit
        if not hit:
            failed.append(f"same_row {label!r} {value!r}")
    for a, b in spec.get("not_same_line", []):
        total += 1
        hit = not any(re.search(a, s, re.I) and re.search(b, s, re.I) for row in rows for s in row)
        ok += hit
        if not hit:
            failed.append(f"not_same_line {a!r} {b!r}")
    return ok, total, failed


def jaccard(a: list[list[str]], b: list[list[str]]) -> float:
    sa = {" | ".join(norm(s) for s in r) for r in a}
    sb = {" | ".join(norm(s) for s in r) for r in b}
    return len(sa & sb) / max(len(sa | sb), 1)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", type=Path, help="another layout.py to compare against")
    ap.add_argument("--diff", action="store_true", help="print changed lines at 0° (needs --baseline)")
    ap.add_argument("--only", help="substring filter on file names")
    ap.add_argument("-v", "--verbose", action="store_true", help="list failing pair checks")
    args = ap.parse_args()

    pairs = json.loads((SAMPLES / "pairs.json").read_text()) if (SAMPLES / "pairs.json").exists() else {}
    versions = {"current": load_layout(None)}
    if args.baseline:
        versions = {"baseline": load_layout(args.baseline), **versions}

    files = sorted(p for p in SAMPLES.rglob("*") if p.suffix.lower() in IMAGE_EXT and ".cache" not in p.parts)
    if args.only:
        files = [f for f in files if args.only in f.name]

    totals = {v: [0, 0, 0.0] for v in versions}  # pairs ok, pairs total, invariance sum
    print(f"{'file':28}" + "".join(f"{v:>26}" for v in versions))
    for f in files:
        docs = {a: ocr_cached(f, a) for a in ANGLES}
        cells = []
        for v, layout in versions.items():
            rows = {a: rows_of(layout, d) for a, d in docs.items()}
            ok = tot = 0
            fails: list[str] = []
            for a in ANGLES:
                o, t, fl = check_pairs(rows[a], pairs.get(f.name, {}))
                ok, tot = ok + o, tot + t
                fails += [f"{a:+d}° {x}" for x in fl]
            inv = sum(jaccard(rows[0], rows[a]) for a in ANGLES if a) / (len(ANGLES) - 1)
            totals[v][0] += ok
            totals[v][1] += tot
            totals[v][2] += inv
            cells.append(f"pairs {ok:>3}/{tot:<3} inv {inv:.2f}")
            if fails and v == "current":
                cells[-1] += "*"
                if args.verbose:
                    print("\n".join(f"      {x}" for x in fails))
        print(f"{f.name[:28]:28}" + "".join(f"{c:>26}" for c in cells))

        if args.diff and args.baseline:
            old = [" | ".join(r) for r in rows_of(versions["baseline"], docs[0])]
            new = [" | ".join(r) for r in rows_of(versions["current"], docs[0])]
            for d in difflib.unified_diff(old, new, lineterm="", n=0):
                if not d.startswith(("---", "+++", "@@")):
                    print("    " + d)

    print("-" * (28 + 26 * len(versions)))
    print(f"{'TOTAL':28}" + "".join(
        f"{'pairs %d/%d inv %.2f' % (t[0], t[1], t[2] / max(len(files), 1)):>26}" for t in totals.values()
    ))
    print("(* = some pair checks fail on the current layout; run with --only <file> -v for details)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
