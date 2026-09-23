"""OCR for photos and scanned PDFs, via PaddleOCR 3.x (Apache 2.0).

The model is heavy to load, so `get_ocr()` builds it once per process. The FastAPI
app calls `warmup()` at startup; the CLI pays the cost on the first file.

Model names can be overridden via env vars so we can swap mobile/server models
without touching code.
"""
from __future__ import annotations

import os
import threading

import numpy as np
from PIL import Image

from ..models import Box, PageInfo

_ocr = None
_lock = threading.Lock()


def get_ocr():
    global _ocr
    if _ocr is None:
        with _lock:
            if _ocr is None:
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
                rec = os.getenv("OCR_REC_MODEL")
                if rec:
                    kwargs["text_recognition_model_name"] = rec
                _ocr = PaddleOCR(**kwargs)
    return _ocr


def warmup() -> None:
    get_ocr().predict(np.full((64, 256, 3), 255, dtype=np.uint8))


def ocr_image(img: Image.Image, page_no: int) -> tuple[list[Box], PageInfo, Image.Image]:
    """Returns boxes (relative bbox), page size and the image the coordinates
    refer to (it may be rotated by the orientation classifier)."""
    arr = np.array(img.convert("RGB"))[:, :, ::-1]  # RGB -> BGR for Paddle
    result = get_ocr().predict(arr)[0]

    ref = arr
    pre = result.get("doc_preprocessor_res") if hasattr(result, "get") else None
    if pre is not None and pre.get("output_img") is not None:
        ref = pre["output_img"]
    h, w = ref.shape[:2]
    ref_img = Image.fromarray(ref[:, :, ::-1])

    boxes: list[Box] = []
    for text, score, poly in zip(result["rec_texts"], result["rec_scores"], result["rec_polys"]):
        if not text.strip():
            continue
        xs = [float(p[0]) for p in poly]
        ys = [float(p[1]) for p in poly]
        boxes.append(Box(
            text=text,
            bbox=(max(min(xs) / w, 0), max(min(ys) / h, 0), min(max(xs) / w, 1), min(max(ys) / h, 1)),
            page=page_no,
            confidence=float(score),
        ))
    return boxes, PageInfo(width=w, height=h), ref_img
