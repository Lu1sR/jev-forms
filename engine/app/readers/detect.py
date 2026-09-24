"""Entry point for reading any uploaded file into a `Document`."""
from __future__ import annotations

import io

import pymupdf
from PIL import Image, ImageOps

from ..models import Document
from . import pdf_text

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:  # HEIC just won't be supported
    pass

# Long side for OCR input. Bigger = slower; invoices read fine around here.
OCR_MAX_SIDE = 2000
SCAN_DPI = 200
PREVIEW_MAX_SIDE = 1400


class UnsupportedFile(ValueError):
    pass


def _fit(img: Image.Image, max_side: int) -> Image.Image:
    scale = max_side / max(img.size)
    if scale < 1:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    return img


def _jpeg(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    _fit(img.convert("RGB"), PREVIEW_MAX_SIDE).save(buf, "JPEG", quality=80)
    return buf.getvalue()


def read_document(data: bytes) -> Document:
    if data[:5] == b"%PDF-":
        return _read_pdf(data)
    return _read_image(data)


def _read_pdf(data: bytes) -> Document:
    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception as e:  # noqa: BLE001
        raise UnsupportedFile("PDF inválido o dañado") from e

    if pdf_text.has_text_layer(doc):
        boxes, pages = pdf_text.extract_boxes(doc)
        previews = [_page_preview(p) for p in doc]
        return Document(type="pdf_text", pages=pages, boxes=boxes, previews=previews)

    from . import ocr

    boxes, pages, previews = [], [], []
    for page_no, page in enumerate(doc):
        pix = page.get_pixmap(dpi=SCAN_DPI)
        img = _fit(Image.frombytes("RGB", (pix.width, pix.height), pix.samples), OCR_MAX_SIDE)
        b, info, ref = ocr.ocr_image(img, page_no)
        boxes += b
        pages.append(info)
        previews.append(_jpeg(ref))
    return Document(type="pdf_scanned", pages=pages, boxes=boxes, previews=previews)


def _page_preview(page: pymupdf.Page) -> bytes:
    zoom = PREVIEW_MAX_SIDE / max(page.rect.width, page.rect.height)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
    return _jpeg(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))


def _read_image(data: bytes) -> Document:
    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)  # phone photos carry rotation in EXIF
    except Exception as e:  # noqa: BLE001
        raise UnsupportedFile("Formato no soportado: sube un PDF, JPG, PNG o HEIC") from e

    from . import ocr

    img = _fit(img.convert("RGB"), OCR_MAX_SIDE)
    boxes, info, ref = ocr.ocr_image(img, 0)
    return Document(type="image", pages=[info], boxes=boxes, previews=[_jpeg(ref)])
