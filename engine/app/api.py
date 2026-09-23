"""HTTP API: receives a document plus the form to fill, returns the filled form.

    uvicorn app.api:app --port 8000

POST /extract (multipart/form-data)
    file       PDF / JPG / PNG / WEBP / HEIC
    form       JSON with the fields to fill: {"title": ..., "fields": [{key, label, type,
               question?, role?, hidden?}, ...]}   (see app/forms/__init__.py)
    form_id    alternatively, a preset form from app/forms/*.yaml (default "sorteo")
    previews   "true" to include the page images (base64) for drawing boxes

GET /forms           preset forms (usable as a starting point for `form`)
GET /health
"""
from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .env import load_env
from .forms import FormError, form_from_dict, list_forms, load_form
from .matchers import get_matcher
from .matchers.jev import JevError
from .pipeline import process
from .readers.detect import UnsupportedFile

load_env()

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "15")) * 1024 * 1024


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Load the OCR model at startup so the first request is not slow.
    if os.getenv("OCR_WARMUP", "1") == "1":
        from .readers.ocr import warmup
        warmup()
    yield


app = FastAPI(title="jev-forms engine", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "matcher": os.getenv("MATCHER", "jev"), "ocr": os.getenv("OCR_ENGINE", "rapid")}


@app.get("/forms")
def forms() -> list[dict]:
    return [f.to_dict() for f in list_forms()]


@app.post("/extract")
def extract(
    file: UploadFile = File(...),
    form: str | None = Form(None),
    form_id: str | None = Form(None),
    previews: bool = Form(False),
) -> dict:
    # Plain `def`: FastAPI runs it in a thread pool, so OCR doesn't block the loop.
    if form:
        try:
            form_def = form_from_dict(json.loads(form))
        except json.JSONDecodeError as e:
            raise HTTPException(400, f"'form' no es JSON válido: {e}") from e
        except FormError as e:
            raise HTTPException(400, str(e)) from e
    else:
        try:
            form_def = load_form(form_id or "sorteo")
        except KeyError as e:
            raise HTTPException(404, str(e.args[0])) from e

    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"Archivo demasiado grande (máximo {MAX_UPLOAD_BYTES // 1024 // 1024} MB)")
    if not data:
        raise HTTPException(400, "Archivo vacío")

    try:
        out = process(data, form_def, get_matcher(), include_previews=previews)
    except UnsupportedFile as e:
        raise HTTPException(415, str(e)) from e
    except JevError as e:
        raise HTTPException(502, f"Error del matcher: {e}") from e
    if not previews:
        out["document"].pop("previews", None)
    return out
