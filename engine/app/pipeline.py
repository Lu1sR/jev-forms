"""read -> lines -> matcher -> extract/validate -> traffic light."""
from __future__ import annotations

import base64
import os
import time

from .extract import extract_near
from .forms import load_form
from .layout import build_lines, render_state
from .matchers import Matcher, get_matcher
from .models import FieldResult, Line
from .readers.detect import read_document
from .validate import check_totals, find_clave

GREEN_THRESHOLD = float(os.getenv("GREEN_THRESHOLD", "0.85"))

# Notes that inform but don't lower a field to yellow.
_SOFT_NOTES = (
    "Dígito verificador", "Secuencial completado", "Valor tomado de", "Coincide con",
    "Subtotal + IVA", "Confirmado por",  # "No cuadra: ..." stays hard
)

_CLAVE_FIELDS = {"ruc_emisor": "ruc", "numero_factura": "numero_factura", "fecha_emision": "fecha"}
_MONEY_KEYS = ("subtotal", "iva", "total")


def _ms(t: float) -> int:
    return round((time.perf_counter() - t) * 1000)


def _status(f: FieldResult, threshold: float) -> str:
    if f.value is None:
        return "empty" if f.raw_line_id is None else "yellow"
    hard = [n for n in f.validation_notes if not n.startswith(_SOFT_NOTES)]
    if hard or (f.probability or 0) < threshold:
        return "yellow"
    return "green"


def process(
    data: bytes,
    form_id: str = "sorteo",
    matcher: Matcher | None = None,
    threshold: float = GREEN_THRESHOLD,
    include_previews: bool = True,
) -> dict:
    form = load_form(form_id)
    matcher = matcher or get_matcher()
    t_all = time.perf_counter()

    t = time.perf_counter()
    doc = read_document(data)
    lines = build_lines(doc.boxes, doc.pages)
    read_ms = _ms(t)
    state = render_state(lines)

    t = time.perf_counter()
    matches = matcher.match(state, lines, list(form.fields)) if lines else {}
    match_ms = _ms(t)

    t = time.perf_counter()
    by_id: dict[str, Line] = {ln.id: ln for ln in lines}
    results: dict[str, FieldResult] = {}
    for fd in form.fields:
        m = matches.get(fd.key)
        fr = FieldResult(key=fd.key, label=fd.label, value=None, raw_line_id=None,
                         probability=round(m.probability, 3) if m else None)
        if m and m.line_id:
            fr.raw_line_id = m.line_id
            value, notes, src = extract_near(fd.type, by_id[m.line_id], lines)
            fr.value, fr.validation_notes = value, list(notes)
            fr.value_line_id = src.id if src else None
            if value is None:
                fr.validation_notes.append("La línea elegida no contiene un valor válido")
        results[fd.key] = fr

    # Access key: deterministic cross-check (and fallback) for RUC, number, date.
    clave = find_clave(lines)
    if clave and clave.check_ok and clave.tipo_comprobante == "01":
        for key, attr in _CLAVE_FIELDS.items():
            fr = results.get(key)
            if fr is None:
                continue
            expected = getattr(clave, attr)
            if fr.value is None:
                fr.value, fr.source = expected, "clave_acceso"
                fr.raw_line_id = fr.value_line_id = clave.line_id
                fr.validation_notes = ["Coincide con la clave de acceso (tomado de ella)"]
            elif fr.value == expected:
                fr.validation_notes.append("Coincide con la clave de acceso")
            else:
                fr.validation_notes.append(f"No coincide con la clave de acceso ({expected})")

    for fr in results.values():
        fr.status = _status(fr, threshold)
        # Confirmed by the access key → green even if the matcher was unsure.
        if fr.status == "yellow" and fr.value is not None and all(
            n.startswith(_SOFT_NOTES) for n in fr.validation_notes
        ) and any(n.startswith("Coincide con la clave") for n in fr.validation_notes):
            fr.status = "green"

    totals_ok, totals_note = check_totals(results)
    if totals_ok is False:
        for k in _MONEY_KEYS:
            results[k].status = "yellow"
            results[k].validation_notes.append(totals_note)
    elif totals_ok:
        results["total"].validation_notes.append(totals_note)
        # Three independently read numbers add up: strong evidence, same as the
        # access key for the other fields.
        for k in _MONEY_KEYS:
            fr = results[k]
            if fr.status == "yellow" and all(n.startswith(_SOFT_NOTES) for n in fr.validation_notes):
                fr.status = "green"
                fr.validation_notes.append("Confirmado por la suma de totales")
    validate_ms = _ms(t)

    visible = {f.key for f in form.visible}
    return {
        "form": {"id": form.id, "title": form.title},
        "document": {
            "type": doc.type,
            "pages": len(doc.pages),
            "dimensions": [{"width": p.width, "height": p.height} for p in doc.pages],
            "previews": [base64.b64encode(p).decode() for p in doc.previews] if include_previews else [],
        },
        "lines": [ln.to_dict() for ln in lines],
        "fields": [results[f.key].to_dict() for f in form.fields if f.key in visible],
        "checks": {
            "clave_acceso": None if not clave else {
                "value": clave.raw, "valid": clave.check_ok, "line_id": clave.line_id,
                "ambiente": "producción" if clave.ambiente == "2" else "pruebas",
            },
            "totals": {"ok": totals_ok, "note": totals_note},
            "hidden_fields": [results[f.key].to_dict() for f in form.fields if f.key not in visible],
        },
        "matcher": matcher.name,
        "timings": {"read_ms": read_ms, "match_ms": match_ms, "validate_ms": validate_ms,
                    "total_ms": _ms(t_all)},
    }
