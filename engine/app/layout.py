"""Turn raw reader boxes into numbered lines.

OCR (and PDF text extraction) returns fragments, not lines: "SUBTOTAL 15%" and
"100.00" on the same visual row usually arrive as two boxes, and a phrase can be
split in several. We:
  1. group boxes into visual rows (vertical-centre overlap),
  2. inside a row, merge boxes separated by a small gap into one segment,
  3. keep segments separated by a big gap (table columns, side-by-side blocks)
     as distinct lines, but tag them with the same `row` so the extractor can
     look at the neighbour ("label | value" layouts).
"""
from __future__ import annotations

from statistics import median

from .models import Box, Line, PageInfo

# Boxes whose vertical centres differ by less than this fraction of the box
# height are on the same row.
ROW_TOLERANCE = 0.55
# Horizontal gap (in units of text height) under which two boxes in the same
# row are part of the same phrase.
MERGE_GAP = 1.2


def _abs(b: Box, page: PageInfo) -> tuple[float, float, float, float]:
    x0, y0, x1, y1 = b.bbox
    return x0 * page.width, y0 * page.height, x1 * page.width, y1 * page.height


def build_lines(boxes: list[Box], pages: list[PageInfo]) -> list[Line]:
    lines: list[Line] = []
    row_index = 0
    for page_no, page in enumerate(pages):
        page_boxes = [b for b in boxes if b.page == page_no and b.text.strip()]
        if not page_boxes:
            continue
        absb = [(b, _abs(b, page)) for b in page_boxes]
        absb.sort(key=lambda t: ((t[1][1] + t[1][3]) / 2, t[1][0]))

        rows: list[list[tuple[Box, tuple]]] = []
        for item in absb:
            _, (x0, y0, x1, y1) = item
            yc, h = (y0 + y1) / 2, max(y1 - y0, 1e-6)
            placed = False
            # Only the last few rows can match since we go top-down.
            for row in reversed(rows[-3:]):
                ryc = median((r[1][1] + r[1][3]) / 2 for r in row)
                rh = median(r[1][3] - r[1][1] for r in row)
                if abs(yc - ryc) < ROW_TOLERANCE * min(h, rh):
                    row.append(item)
                    placed = True
                    break
            if not placed:
                rows.append([item])

        rows.sort(key=lambda r: min(i[1][1] for i in r))
        for row in rows:
            row.sort(key=lambda i: i[1][0])
            segments: list[list[tuple[Box, tuple]]] = [[row[0]]]
            for item in row[1:]:
                prev = segments[-1][-1]
                gap = item[1][0] - prev[1][2]
                h = max(item[1][3] - item[1][1], prev[1][3] - prev[1][1])
                if gap < MERGE_GAP * h:
                    segments[-1].append(item)
                else:
                    segments.append([item])
            for seg in segments:
                text = " ".join(b.text.strip() for b, _ in seg)
                x0 = min(b.bbox[0] for b, _ in seg)
                y0 = min(b.bbox[1] for b, _ in seg)
                x1 = max(b.bbox[2] for b, _ in seg)
                y1 = max(b.bbox[3] for b, _ in seg)
                conf = min(b.confidence for b, _ in seg)
                lines.append(Line(
                    id=f"L{len(lines) + 1}",
                    text=text,
                    bbox=(round(x0, 4), round(y0, 4), round(x1, 4), round(y1, 4)),
                    page=page_no,
                    row=row_index,
                    confidence=round(conf, 3),
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
