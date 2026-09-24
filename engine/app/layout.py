"""Turn raw reader boxes into numbered lines.

OCR (and PDF text extraction) returns fragments, not lines: "SUBTOTAL 15%" and
"100.00" on the same visual row usually arrive as two boxes, and a phrase can be
split in several. We:
  0. straighten: phone photos are tilted a few degrees, which puts the value at
     the right end of a row higher or lower than its label. We measure the
     median text angle from the OCR quadrilaterals and rotate every box into
     an upright frame before grouping (PDF text has no angle: nothing changes),
  1. group boxes into visual rows: a box joins the row whose nearest box (in x)
     has a close vertical centre, and never a row where a box already occupies
     the same horizontal span (that one is the line above/below, not a neighbour),
  2. inside a row, merge boxes separated by a small gap into one segment,
  3. keep segments separated by a big gap (table columns, side-by-side blocks)
     as distinct lines, but tag them with the same `row` so the extractor can
     look at the neighbour ("label | value" layouts).
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from statistics import median

from .models import Box, Line, PageInfo

# Boxes whose vertical centres differ by less than this fraction of the text
# height are on the same row.
ROW_TOLERANCE = 0.55
# Horizontal gap (in units of text height) under which two boxes in the same
# row are part of the same phrase.
MERGE_GAP = 1.2
# Two boxes overlapping horizontally by more than this fraction of the narrower
# one are stacked (different lines), never neighbours on the same row.
STACK_OVERLAP = 0.5
# Tilt below this is noise; above the max it is not a tilt we can trust.
MIN_TILT_DEG = 0.5
MAX_TILT_DEG = 20.0


@dataclass
class _Item:
    box: Box
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def yc(self) -> float:
        return (self.y0 + self.y1) / 2

    @property
    def xc(self) -> float:
        return (self.x0 + self.x1) / 2

    @property
    def h(self) -> float:
        return max(self.y1 - self.y0, 1e-6)


def _corners(b: Box, page: PageInfo) -> list[tuple[float, float]]:
    if b.poly:
        return [(x * page.width, y * page.height) for x, y in b.poly]
    x0, y0, x1, y1 = b.bbox
    return [(x0 * page.width, y0 * page.height), (x1 * page.width, y0 * page.height),
            (x1 * page.width, y1 * page.height), (x0 * page.width, y1 * page.height)]


def page_tilt(boxes: list[Box], page: PageInfo) -> float:
    """Median angle (radians) of the top edge of wide text boxes; 0 if unknown."""
    angles = []
    for b in boxes:
        if not b.poly or len(b.poly) != 4:
            continue
        (ax, ay), (bx, by), _, (dx, dy) = _corners(b, page)
        width = math.hypot(bx - ax, by - ay)
        height = math.hypot(dx - ax, dy - ay)
        if width > 3 * height:  # short boxes give noisy angles
            angles.append(math.atan2(by - ay, bx - ax))
    if len(angles) < 3:
        return 0.0
    a = median(angles)
    return a if MIN_TILT_DEG <= abs(math.degrees(a)) <= MAX_TILT_DEG else 0.0


def _upright(boxes: list[Box], page: PageInfo, tilt: float) -> list[_Item]:
    cx, cy = page.width / 2, page.height / 2
    cos, sin = math.cos(-tilt), math.sin(-tilt)
    items = []
    for b in boxes:
        pts = [(cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos)
               for x, y in _corners(b, page)]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        items.append(_Item(b, min(xs), min(ys), max(xs), max(ys)))
    return items


def _stacked(a: _Item, b: _Item) -> bool:
    overlap = min(a.x1, b.x1) - max(a.x0, b.x0)
    return overlap > STACK_OVERLAP * min(a.x1 - a.x0, b.x1 - b.x0)


def _group_rows(items: list[_Item]) -> list[list[_Item]]:
    items = sorted(items, key=lambda i: (i.yc, i.x0))
    rows: list[list[_Item]] = []
    for it in items:
        best, best_dy = None, None
        # Only recent rows can match since we go top-down.
        for row in rows[-5:]:
            if any(_stacked(it, r) for r in row):
                continue
            near = min(row, key=lambda r: abs(r.xc - it.xc))
            dy = abs(it.yc - near.yc)
            if dy < ROW_TOLERANCE * min(it.h, near.h) and (best_dy is None or dy < best_dy):
                best, best_dy = row, dy
        if best is None:
            rows.append([it])
        else:
            best.append(it)
    rows.sort(key=lambda r: min(i.y0 for i in r))
    return rows


def build_lines(boxes: list[Box], pages: list[PageInfo]) -> list[Line]:
    lines: list[Line] = []
    row_index = 0
    for page_no, page in enumerate(pages):
        page_boxes = [b for b in boxes if b.page == page_no and b.text.strip()]
        if not page_boxes:
            continue
        items = _upright(page_boxes, page, page_tilt(page_boxes, page))

        for row in _group_rows(items):
            row.sort(key=lambda i: i.x0)
            segments: list[list[_Item]] = [[row[0]]]
            for it in row[1:]:
                prev = segments[-1][-1]
                if it.x0 - prev.x1 < MERGE_GAP * max(it.h, prev.h):
                    segments[-1].append(it)
                else:
                    segments.append([it])
            for seg in segments:
                bs = [i.box for i in seg]
                lines.append(Line(
                    id=f"L{len(lines) + 1}",
                    text=" ".join(b.text.strip() for b in bs),
                    bbox=(round(min(b.bbox[0] for b in bs), 4), round(min(b.bbox[1] for b in bs), 4),
                          round(max(b.bbox[2] for b in bs), 4), round(max(b.bbox[3] for b in bs), 4)),
                    page=page_no,
                    row=row_index,
                    confidence=round(min(b.confidence for b in bs), 3),
                ))
            row_index += 1
    return lines


def render_state(lines: list[Line]) -> str:
    """Text given to the matcher: one visual row per text line, each segment
    prefixed with its id, so the model sees both the id and the layout."""
    out: list[str] = []
    current_row = None
    current_page = None
    for ln in lines:
        if ln.page != current_page:
            if current_page is not None:
                out.append("")
            out.append(f"--- página {ln.page + 1} ---")
            current_page = ln.page
        if ln.row != current_row:
            out.append(f"[{ln.id}] {ln.text}")
            current_row = ln.row
        else:
            out[-1] += f"    [{ln.id}] {ln.text}"
    return "\n".join(out)
