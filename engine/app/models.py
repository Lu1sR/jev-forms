"""Shared data shapes. Every reader (PyMuPDF, OCR) produces the same `Line` list."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Literal

DocType = Literal["pdf_text", "pdf_scanned", "image"]
Status = Literal["green", "yellow", "empty"]


@dataclass
class Box:
    """A raw text fragment as returned by a reader, before row grouping.

    bbox is (x0, y0, x1, y1) relative to the page (0-1).
    """
    text: str
    bbox: tuple[float, float, float, float]
    page: int
    confidence: float = 1.0


@dataclass
class Line:
    id: str                      # "L12"
    text: str
    bbox: tuple[float, float, float, float]
    page: int
    row: int                     # lines on the same visual row share this index
    confidence: float = 1.0

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class PageInfo:
    width: float
    height: float


@dataclass
class Document:
    type: DocType
    pages: list[PageInfo]
    boxes: list[Box]
    # Rendered page images (PNG bytes) so the UI can draw boxes over them
    # without re-rendering PDFs in the browser. Optional.
    previews: list[bytes] = field(default_factory=list)


@dataclass
class FieldResult:
    key: str
    label: str
    value: str | None
    raw_line_id: str | None      # line the matcher picked
    probability: float | None
    # Line the value was actually read from. Usually == raw_line_id, but in
    # "SUBTOTAL | 100.00" layouts the matcher may pick the label and the value
    # sits in the neighbouring segment. The UI highlights both.
    value_line_id: str | None = None
    status: Status = "empty"
    validation_notes: list[str] = field(default_factory=list)
    source: str = "matcher"      # "matcher" | "clave_acceso"

    def to_dict(self) -> dict:
        return asdict(self)
