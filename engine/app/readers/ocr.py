"""OCR for photos and scanned PDFs (both engines Apache 2.0).

Two engines, picked with `OCR_ENGINE`:
  rapid   (default) RapidOCR: PaddleOCR models on ONNX Runtime. ~10x faster than
          Paddle on CPU (1-3 s per invoice on an M3), no 1 GB paddlepaddle install.
  paddle  PaddleOCR 3.x. Adds document-orientation correction (sideways photos),
          but slow on CPU.

Models are heavy to load, so `get_ocr()` builds one once per process. The FastAPI
app calls `warmup()` at startup; the CLI pays the cost on the first file.

Paddle model names can be overridden via env vars without touching code.
"""
from __future__ import annotations

import os
import threading

import numpy as np
from PIL import Image

from ..models import Box, PageInfo

_ocr = None
_lock = threading.Lock()


def _engine() -> str:
    return os.getenv("OCR_ENGINE", "rapid")


def get_ocr():
    global _ocr
    if _ocr is None:
        with _lock:
            if _ocr is None:
                _ocr = _build_rapid() if _engine() == "rapid" else _build_paddle()
    return _ocr


def _build_rapid():
    from rapidocr import RapidOCR  # keep lazy

    return RapidOCR()


def _build_paddle():
    from paddleocr import PaddleOCR  # heavy import, keep lazy

    kwargs = dict(
        lang=os.getenv("OCR_LANG", "es"),
        # Photos come rotated / upside down.
        use_doc_orientation_classify=True,
        use_textline_orientation=True,
        # Unwarping is slow and rarely needed for invoices.
        use_doc_unwarping=os.getenv("OCR_UNWARP", "0") == "1",
    )
    det = os.getenv("OCR_DET_MODEL", "PP-OCRv5_mobile_det")
    if det:
        kwargs["text_detection_model_name"] = det
    # For "es" Paddle defaults to PP-OCRv6_medium_rec; the latin mobile model is lighter.
    rec = os.getenv("OCR_REC_MODEL", "latin_PP-OCRv5_mobile_rec")
    if rec:
        kwargs["text_recognition_model_name"] = rec
    return PaddleOCR(**kwargs)


def warmup() -> None:
    blank = np.full((64, 256, 3), 255, dtype=np.uint8)
    if _engine() == "rapid":
        get_ocr()(blank)
    else:
        get_ocr().predict(blank)


def ocr_image(img: Image.Image, page_no: int) -> tuple[list[Box], PageInfo, Image.Image]:
    """Returns boxes (relative bbox), page size and the image the coordinates
    refer to (with Paddle it may be rotated by the orientation classifier)."""
    img = img.convert("RGB")
    if _engine() == "rapid":
        result = get_ocr()(img)
        ref_img = img
        items = zip(result.txts or (), result.scores or (), result.boxes if result.boxes is not None else ())
    else:
        arr = np.array(img)[:, :, ::-1]  # RGB -> BGR for Paddle
        result = get_ocr().predict(arr)[0]
        ref = arr
        pre = result.get("doc_preprocessor_res") if hasattr(result, "get") else None
        if pre is not None and pre.get("output_img") is not None:
            ref = pre["output_img"]
        ref_img = Image.fromarray(ref[:, :, ::-1])
        items = zip(result["rec_texts"], result["rec_scores"], result["rec_polys"])

    w, h = ref_img.size
    boxes: list[Box] = []
    for text, score, poly in items:
        if not text.strip():
            continue
        xs = [float(p[0]) for p in poly]
        ys = [float(p[1]) for p in poly]
        boxes.append(Box(
            text=text,
            bbox=(max(min(xs) / w, 0), max(min(ys) / h, 0), min(max(xs) / w, 1), min(max(ys) / h, 1)),
            page=page_no,
            confidence=float(score),
            poly=tuple((float(p[0]) / w, float(p[1]) / h) for p in poly),
        ))
    return boxes, PageInfo(width=w, height=h), ref_img
