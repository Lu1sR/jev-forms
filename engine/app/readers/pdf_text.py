"""Digital PDFs (SRI e-invoices): read the text layer with PyMuPDF, no OCR."""
from __future__ import annotations

import pymupdf

from ..models import Box, PageInfo

# Below this many non-space characters a page is treated as scanned.
MIN_TEXT_CHARS = 40


def has_text_layer(doc: pymupdf.Document) -> bool:
    return all(
        len("".join(page.get_text("text").split())) >= MIN_TEXT_CHARS
        for page in doc
    )


def extract_boxes(doc: pymupdf.Document) -> tuple[list[Box], list[PageInfo]]:
    boxes: list[Box] = []
    pages: list[PageInfo] = []
    for page_no, page in enumerate(doc):
        w, h = page.rect.width, page.rect.height
        pages.append(PageInfo(width=w, height=h))
        data = page.get_text("dict")
        for block in data["blocks"]:
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                text = "".join(span["text"] for span in line["spans"]).strip()
                if not text:
                    continue
                x0, y0, x1, y1 = line["bbox"]
                boxes.append(Box(
                    text=text,
                    bbox=(x0 / w, y0 / h, x1 / w, y1 / h),
                    page=page_no,
                    confidence=1.0,
                ))
    return boxes, pages
