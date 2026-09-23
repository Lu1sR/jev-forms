"""Rule-based value extraction and validation (no AI here).

Each parser takes a line of text and returns (normalized value | None, notes).
`extract_near` also tries neighbouring segments, because the matcher may pick
the label ("SUBTOTAL SIN IMPUESTOS") while the number sits in the next column.
"""
from __future__ import annotations

import re
from datetime import date

from .models import Line

# ---------------------------------------------------------------- helpers ---

# Frequent OCR confusions inside numbers.
_DIGIT_FIX = str.maketrans({"O": "0", "o": "0", "D": "0", "l": "1", "I": "1", "|": "1", "S": "5", "B": "8"})


def _fix_digits(token: str) -> str:
    """Fix OCR letter/digit confusions only in tokens that are mostly digits."""
    digits = sum(c.isdigit() for c in token)
    if digits >= max(3, len(token) * 0.6):
        return token.translate(_DIGIT_FIX)
    return token


def _fix_numeric_tokens(text: str) -> str:
    return re.sub(r"[0-9OoDlI|SB.,\-/]{4,}", lambda m: _fix_digits(m.group()), text)


# -------------------------------------------------------------------- RUC ---

def ruc_check_digit_ok(ruc: str) -> bool | None:
    """True/False for the SRI check digit, None if the scheme is unknown.

    Some recent RUCs no longer satisfy the classic algorithm, so a failure is
    only reported as a note, never as a hard error.
    """
    d = [int(c) for c in ruc]
    third = d[2]
    if third < 6:  # natural person: modulo 10 over the cédula
        coefs = [2, 1, 2, 1, 2, 1, 2, 1, 2]
        s = sum((x * c - 9) if x * c > 9 else x * c for x, c in zip(d[:9], coefs))
        return (10 - s % 10) % 10 == d[9]
    if third == 6:  # public entity: modulo 11, check digit in position 9
        coefs = [3, 2, 7, 6, 5, 4, 3, 2]
        r = 11 - sum(x * c for x, c in zip(d[:8], coefs)) % 11
        return (0 if r == 11 else r) == d[8]
    if third == 9:  # private company: modulo 11, check digit in position 10
        coefs = [4, 3, 2, 7, 6, 5, 4, 3, 2]
        r = 11 - sum(x * c for x, c in zip(d[:9], coefs)) % 11
        return (0 if r == 11 else r) == d[9]
    return None


def parse_ruc(text: str) -> tuple[str | None, list[str]]:
    text = _fix_numeric_tokens(text)
    for m in re.finditer(r"(?<![\d])(\d[\d .-]{11,20}\d)(?![\d])", text):
        digits = re.sub(r"\D", "", m.group(1))
        if len(digits) == 13:
            return digits, _ruc_notes(digits)
    m = re.search(r"(?<!\d)\d{10,14}(?!\d)", text)
    if m:
        return m.group(), [f"RUC con {len(m.group())} dígitos (se esperan 13)"]
    return None, []


def _ruc_notes(ruc: str) -> list[str]:
    notes = []
    province = int(ruc[:2])
    if not (1 <= province <= 24 or province == 30):
        notes.append("Código de provincia inválido")
    if ruc_check_digit_ok(ruc) is False:
        notes.append("Dígito verificador no cuadra (puede ser un RUC nuevo)")
    return notes


# --------------------------------------------------------- invoice number ---

def parse_invoice_number(text: str) -> tuple[str | None, list[str]]:
    text = _fix_numeric_tokens(text)
    m = re.search(r"(?<!\d)(\d{3})\s*[-–—.]\s*(\d{3})\s*[-–—.]\s*(\d{1,9})(?!\d)", text)
    if not m:
        return None, []
    estab, pto, seq = m.groups()
    notes = []
    if len(seq) < 9:
        notes.append("Secuencial completado con ceros")
    return f"{estab}-{pto}-{seq.zfill(9)}", notes


# ------------------------------------------------------------------- date ---

_MONTHS = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7,
    "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8,
    "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dic": 12,
}


def _mk_date(y: int, m: int, d: int) -> date | None:
    if y < 100:
        y += 2000
    try:
        return date(y, m, d)
    except ValueError:
        return None


def parse_date(text: str, today: date | None = None) -> tuple[str | None, list[str]]:
    today = today or date.today()
    text = _fix_numeric_tokens(text)
    found: date | None = None

    m = re.search(r"(?<!\d)(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)", text)
    if m:
        found = _mk_date(int(m[1]), int(m[2]), int(m[3]))
    if not found:
        # Ecuador uses dd/mm/yyyy.
        m = re.search(r"(?<!\d)(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4}|\d{2})(?!\d)", text)
        if m:
            found = _mk_date(int(m[3]), int(m[2]), int(m[1]))
    if not found:
        m = re.search(r"(\d{1,2})\s*(?:de\s+)?([a-záéíóú]{3,10})\.?\s*(?:de\s+|del\s+)?(\d{4})", text, re.I)
        if m and m[2].lower() in _MONTHS:
            found = _mk_date(int(m[3]), _MONTHS[m[2].lower()], int(m[1]))
    if not found:
        return None, []

    notes = []
    if found > today:
        notes.append("Fecha en el futuro")
    elif found.year < 2000:
        notes.append("Fecha muy antigua")
    return found.isoformat(), notes


# ------------------------------------------------------------------ money ---

_AMOUNT = re.compile(r"(?<![\d])-?\$?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?(?![\d])|(?<![\d])\d+(?:[.,]\d{1,2})?(?![\d])")


def to_number(token: str) -> float | None:
    t = re.sub(r"[^\d.,-]", "", token)
    if not re.search(r"\d", t):
        return None
    last_sep = max(t.rfind("."), t.rfind(","))
    if last_sep >= 0 and len(t) - last_sep - 1 in (1, 2):
        int_part, dec = t[:last_sep], t[last_sep + 1:]
    else:  # no decimals: separators are thousands
        int_part, dec = t, ""
    int_part = re.sub(r"[.,]", "", int_part)
    try:
        return float(f"{int_part or 0}.{dec or 0}")
    except ValueError:
        return None


def parse_money(text: str) -> tuple[str | None, list[str]]:
    text = _fix_numeric_tokens(text)
    # Drop percentages ("IVA 15%") so they aren't read as amounts.
    text = re.sub(r"\d{1,2}(?:[.,]\d+)?\s*%", " ", text)
    amounts = [m.group() for m in _AMOUNT.finditer(text)]
    # Values are right-aligned on invoices: take the last number on the line.
    for tok in reversed(amounts):
        n = to_number(tok)
        if n is not None:
            return f"{n:.2f}", []
    return None, []


# ------------------------------------------------------------------- text ---

_LABEL_PREFIX = re.compile(
    r"^\s*(raz[oó]n\s+social(\s*/\s*nombres?\s+y\s+apellidos)?|nombre\s+comercial|emisor|"
    r"contribuyente|nombres?)\s*[:.\-]?\s*",
    re.I,
)


def parse_text(text: str) -> tuple[str | None, list[str]]:
    value = _LABEL_PREFIX.sub("", text).strip(" :-")
    return (value or None), []


PARSERS = {
    "ruc": parse_ruc,
    "invoice_number": parse_invoice_number,
    "date": parse_date,
    "money": parse_money,
    "text": parse_text,
}


def _is_label_only(ftype: str, text: str) -> bool:
    """A text line that is just a label ("Razón Social:") with nothing after it."""
    return ftype == "text" and parse_text(text)[0] is None


def extract_near(ftype: str, line: Line, lines: list[Line]) -> tuple[str | None, list[str], Line | None]:
    """Parse the chosen line; if it has no value, look at the segments to its
    right on the same row, then the line just below (label-above-value)."""
    parser = PARSERS[ftype]
    same_row = sorted((l for l in lines if l.row == line.row and l.page == line.page), key=lambda l: l.bbox[0])
    right = [l for l in same_row if l.bbox[0] > line.bbox[0]]
    below = [
        l for l in lines
        if l.row == line.row + 1 and l.page == line.page
        and l.bbox[0] < line.bbox[2] and l.bbox[2] > line.bbox[0]
    ]
    for cand in [line, *right, *below]:
        if _is_label_only(ftype, cand.text):
            continue
        value, notes = parser(cand.text)
        if value is not None:
            if cand is not line:
                notes = [*notes, f"Valor tomado de la línea vecina {cand.id}"]
            return value, notes, cand
    return None, [], None
