"""Checks that go beyond a single field: the SRI access key and the totals."""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

from .models import FieldResult, Line

# Tolerance for subtotal + IVA ≈ total (cents).
MONEY_TOLERANCE = 0.02


# ------------------------------------------------------- clave de acceso ---
# 49 digits printed on every SRI electronic invoice (RIDE):
#   ddmmaaaa | tipo(2) | RUC(13) | ambiente(1) | estab(3) ptoEmi(3) | secuencial(9)
#   | código numérico(8) | tipo emisión(1) | dígito verificador(1)

@dataclass
class ClaveAcceso:
    raw: str
    fecha: str               # YYYY-MM-DD
    tipo_comprobante: str    # "01" = factura
    ruc: str
    ambiente: str            # "1" pruebas, "2" producción
    numero_factura: str      # 001-001-000000123
    check_ok: bool
    line_id: str | None


def clave_check_digit(first48: str) -> int:
    weights = [2, 3, 4, 5, 6, 7]
    s = sum(int(c) * weights[i % 6] for i, c in enumerate(reversed(first48)))
    r = 11 - s % 11
    return {11: 0, 10: 1}.get(r, r)


def parse_clave(digits: str, line_id: str | None = None) -> ClaveAcceso | None:
    if len(digits) != 49 or not digits.isdigit():
        return None
    try:
        fecha = date(int(digits[4:8]), int(digits[2:4]), int(digits[0:2])).isoformat()
    except ValueError:
        return None
    return ClaveAcceso(
        raw=digits,
        fecha=fecha,
        tipo_comprobante=digits[8:10],
        ruc=digits[10:23],
        ambiente=digits[23],
        numero_factura=f"{digits[24:27]}-{digits[27:30]}-{digits[30:39]}",
        check_ok=clave_check_digit(digits[:48]) == int(digits[48]),
        line_id=line_id,
    )


def find_clave(lines: list[Line]) -> ClaveAcceso | None:
    """Look for 49 digits in one line, or split across consecutive lines
    (OCR and narrow PDF columns often break it)."""
    def digits_of(t: str) -> str:
        return re.sub(r"[\s.-]", "", t)

    candidates: list[tuple[str, str]] = []
    for i, ln in enumerate(lines):
        d = digits_of(ln.text)
        for m in re.finditer(r"\d{49,}", d):
            candidates.append((m.group()[:49], ln.id))
        # Joined with following all-digit lines.
        if re.fullmatch(r"\d{10,48}", d):
            joined = d
            for nxt in lines[i + 1:i + 4]:
                nd = digits_of(nxt.text)
                if not nd.isdigit():
                    break
                joined += nd
                if len(joined) >= 49:
                    candidates.append((joined[:49], ln.id))
                    break

    parsed = [c for c in (parse_clave(d, lid) for d, lid in candidates) if c]
    # Prefer one whose check digit is right.
    parsed.sort(key=lambda c: not c.check_ok)
    return parsed[0] if parsed else None


# ---------------------------------------------------------- cross checks ---

def _num(f: FieldResult | None) -> float | None:
    if f is None or f.value is None:
        return None
    try:
        return float(f.value)
    except ValueError:
        return None


def check_totals(fields: dict[str, FieldResult]) -> tuple[bool | None, str]:
    """subtotal (- descuento) + IVA (+ ICE) (+ servicio) ≈ total.

    SRI's "subtotal sin impuestos" is usually already net of discount, but not
    every invoice follows that, so we accept either reading.
    Returns (ok | None if not enough data, explanation).
    """
    sub, iva, total = _num(fields.get("subtotal")), _num(fields.get("iva")), _num(fields.get("total"))
    if sub is None or iva is None or total is None:
        return None, ""
    extra = sum(v for v in (_num(fields.get("servicio")), _num(fields.get("ice"))) if v)
    desc = _num(fields.get("descuento")) or 0.0

    candidates = [sub + iva + extra, sub - desc + iva + extra, sub + iva]
    for c in candidates:
        if abs(c - total) <= MONEY_TOLERANCE:
            return True, f"Subtotal + IVA{' + otros' if extra else ''} = total ({total:.2f})"
    return False, f"No cuadra: subtotal + IVA = {sub + iva + extra:.2f}, pero el total es {total:.2f}"
