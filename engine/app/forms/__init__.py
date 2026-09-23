"""Form definitions: which fields to fill and how to ask the matcher for each one.

A form comes either from a preset YAML file in this folder (`load_form("sorteo")`)
or from the API caller as JSON (`form_from_dict({...})`); both go through the same
validation. Field shape:

    key       stable id, [a-z0-9_] (CSV column, API)
    label     what the user sees
    type      ruc | invoice_number | date | money | text  (picks the extractor)
    question  what we ask the matcher: which line holds this value
              (optional: the role's default question, else one built from the label)
    role      optional meaning used by the deterministic cross-checks, see
              ROLE_DEFAULTS. Defaults to the key when the key is a role name. A
              field with a role can omit type/label/question/hints.
    hints     keywords for the offline heuristic matcher (and nothing else)
    hidden    true = not returned in `fields`, only used for cross-checks
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml

from ..extract import PARSERS

FORMS_DIR = Path(__file__).parent
DEFAULT_FORM = "sorteo"

# Roles the pipeline knows how to cross-check:
#   ruc_emisor, numero_factura, fecha_emision  -> SRI access key (clave de acceso)
#   subtotal, iva, total (+ descuento, servicio, ice) -> subtotal + IVA (+ otros) = total
# A field with a role but no question/hints/label gets these defaults, so API
# callers only need {"key": ..., "role": ...}.
ROLE_DEFAULTS: dict[str, dict] = {
    "ruc_emisor": dict(
        type="ruc", label="RUC del emisor", hints=["ruc", "r.u.c"],
        question="¿Qué línea contiene el RUC del EMISOR del documento (el negocio que vende), "
                 "no el RUC o cédula del comprador/cliente?"),
    "numero_factura": dict(
        type="invoice_number", label="Número de factura", hints=["factura", "no.", "nro", "número"],
        question="¿Qué línea contiene el número de la factura (formato 001-001-000000123)? "
                 "Una precuenta o pre-factura no tiene número de factura."),
    "fecha_emision": dict(
        type="date", label="Fecha de emisión", hints=["fecha emisión", "fecha de emisión", "fecha"],
        question="¿Qué línea contiene la fecha de emisión del documento (no la fecha de autorización)?"),
    "subtotal": dict(
        type="money", label="Subtotal", hints=["subtotal sin impuestos", "subtotal"],
        question="¿Qué línea contiene el SUBTOTAL SIN IMPUESTOS (la base antes del IVA)? Si el "
                 "documento solo muestra subtotales por tarifa de IVA (15%, 5%, 0%), elige el que "
                 "no es cero."),
    "iva": dict(
        type="money", label="IVA", hints=["iva 15%", "iva 12%", "iva"],
        question="¿Qué línea contiene el valor del IVA cobrado?"),
    "total": dict(
        type="money", label="Total", hints=["valor total", "total a pagar", "total"],
        question="¿Qué línea contiene el VALOR TOTAL a pagar del documento?"),
    "descuento": dict(
        type="money", label="Descuento", hints=["total descuento", "descuento", "dcto"],
        question="¿Qué línea contiene el total de descuento del documento?"),
    "servicio": dict(
        type="money", label="Servicio / propina", hints=["propina", "servicio 10%", "servicio", "serv."],
        question="¿Qué línea contiene el valor de servicio o propina (por ejemplo 10% servicio)?"),
    "ice": dict(
        type="money", label="ICE", hints=["ice"],
        question="¿Qué línea contiene el valor del ICE?"),
}
ROLES = {role: d["type"] for role, d in ROLE_DEFAULTS.items()}
# Other amounts that can sit between subtotal + IVA and the total. When a form asks
# for subtotal, iva and total, these are added as hidden fields if missing, so the
# sum check works on restaurant bills even if the caller didn't think of them.
_TOTALS_CORE = {"subtotal", "iva", "total"}
_TOTALS_EXTRA = ("descuento", "servicio", "ice")
MAX_FIELDS = 40
_KEY_RE = re.compile(r"^[a-z][a-z0-9_]{0,49}$")


class FormError(ValueError):
    pass


@dataclass(frozen=True)
class FieldDef:
    key: str
    label: str
    type: str
    question: str
    hints: tuple[str, ...] = ()
    hidden: bool = False
    role: str | None = None


@dataclass(frozen=True)
class FormDef:
    id: str
    title: str
    fields: tuple[FieldDef, ...] = field(default_factory=tuple)

    @property
    def visible(self) -> list[FieldDef]:
        return [f for f in self.fields if not f.hidden]

    def by_role(self, role: str) -> FieldDef | None:
        return next((f for f in self.fields if f.role == role), None)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "fields": [
                {"key": f.key, "label": f.label, "type": f.type, "question": f.question,
                 "role": f.role, "hidden": f.hidden, "hints": list(f.hints)}
                for f in self.fields
            ],
        }


def _field(raw: dict, i: int) -> FieldDef:
    if not isinstance(raw, dict):
        raise FormError(f"fields[{i}] debe ser un objeto")
    key = str(raw.get("key", "")).strip()
    if not _KEY_RE.match(key):
        raise FormError(f"fields[{i}].key inválido: {key!r} (usa minúsculas, números y _)")
    role = raw.get("role", key if key in ROLES else None)
    if role is not None and role not in ROLES:
        raise FormError(f"{key}: role {role!r} no soportado ({', '.join(ROLES)})")
    defaults = ROLE_DEFAULTS.get(role, {})
    label = str(raw.get("label") or defaults.get("label") or key).strip()
    ftype = str(raw.get("type") or defaults.get("type") or "text").strip()
    if ftype not in PARSERS:
        raise FormError(f"{key}: type {ftype!r} no soportado ({', '.join(PARSERS)})")
    if role is not None and ROLES[role] != ftype:
        raise FormError(f"{key}: role {role} requiere type {ROLES[role]}")
    question = str(raw.get("question") or "").strip() or defaults.get("question") or (
        f"¿Qué línea contiene el valor de «{label}»?"
    )
    hints = raw.get("hints") or defaults.get("hints") or ()
    if not isinstance(hints, (list, tuple)):
        raise FormError(f"{key}: hints debe ser una lista")
    return FieldDef(
        key=key, label=label, type=ftype, question=question,
        hints=tuple(str(h) for h in hints), hidden=bool(raw.get("hidden", False)), role=role,
    )


def _totals_helpers(fields: tuple[FieldDef, ...]) -> tuple[FieldDef, ...]:
    roles = {f.role for f in fields}
    if not _TOTALS_CORE <= roles:
        return ()
    keys = {f.key for f in fields}
    helpers = []
    for role in _TOTALS_EXTRA:
        key = f"aux_{role}"
        if role in roles or key in keys:
            continue
        d = ROLE_DEFAULTS[role]
        helpers.append(FieldDef(key=key, label=d["label"], type=d["type"], question=d["question"],
                                hints=tuple(d["hints"]), hidden=True, role=role))
    return tuple(helpers)


def form_from_dict(raw: dict, default_id: str = "custom") -> FormDef:
    if not isinstance(raw, dict):
        raise FormError("El formulario debe ser un objeto JSON")
    fields_raw = raw.get("fields")
    if not isinstance(fields_raw, list) or not fields_raw:
        raise FormError("El formulario necesita una lista 'fields' con al menos un campo")
    if len(fields_raw) > MAX_FIELDS:
        raise FormError(f"Máximo {MAX_FIELDS} campos por formulario")
    fields = tuple(_field(f, i) for i, f in enumerate(fields_raw))
    keys = [f.key for f in fields]
    if len(set(keys)) != len(keys):
        raise FormError("Hay campos con la misma key")
    roles = [f.role for f in fields if f.role]
    if len(set(roles)) != len(roles):
        raise FormError("Hay dos campos con el mismo role")
    return FormDef(
        id=str(raw.get("id") or default_id),
        title=str(raw.get("title") or "Formulario"),
        fields=fields + _totals_helpers(fields),
    )


@lru_cache
def load_form(form_id: str = DEFAULT_FORM) -> FormDef:
    path = FORMS_DIR / f"{form_id}.yaml"
    if not path.is_file() or path.parent != FORMS_DIR:
        raise KeyError(f"Formulario desconocido: {form_id}")
    return form_from_dict(yaml.safe_load(path.read_text(encoding="utf-8")), default_id=form_id)


def list_forms() -> list[FormDef]:
    return [load_form(p.stem) for p in sorted(FORMS_DIR.glob("*.yaml"))]
