from datetime import date

from app.extract import parse_date, parse_invoice_number, parse_money, parse_ruc, ruc_check_digit_ok
from app.layout import build_lines, render_state
from app.matchers.heuristic import HeuristicMatcher
from app.models import Box, PageInfo
from app.pipeline import process
from app.validate import find_clave, parse_clave

from .fixtures import company_ruc, make_clave, make_ride


def fields(out):
    return {f["key"]: f for f in out["fields"]}


# ---------------------------------------------------------------- parsers ---

def test_money_formats():
    assert parse_money("VALOR TOTAL 1.234,56")[0] == "1234.56"
    assert parse_money("VALOR TOTAL $ 1,234.56")[0] == "1234.56"
    assert parse_money("IVA 15% 15.00")[0] == "15.00"
    assert parse_money("TOTAL 115")[0] == "115.00"
    assert parse_money("SUBTOTAL SIN IMPUESTOS")[0] is None


def test_dates():
    assert parse_date("Fecha Emisión: 15/03/2025")[0] == "2025-03-15"
    assert parse_date("2025-03-15")[0] == "2025-03-15"
    assert parse_date("15 de marzo de 2025")[0] == "2025-03-15"
    assert parse_date("FECHA: 1/O3/2025")[0] == "2025-03-01"  # OCR O -> 0
    assert parse_date("31/12/2099", today=date(2025, 1, 1))[1] == ["Fecha en el futuro"]


def test_invoice_number():
    assert parse_invoice_number("No. 001-002-000004567")[0] == "001-002-000004567"
    value, notes = parse_invoice_number("FACTURA 001 - 001 - 123")
    assert value == "001-001-000000123" and notes


def test_ruc():
    ruc = company_ruc("099123457")
    assert ruc_check_digit_ok(ruc)
    assert parse_ruc(f"R.U.C.: {ruc}") == (ruc, [])
    assert parse_ruc("RUC: 0991234")[0] is None


def test_clave_acceso():
    ruc = company_ruc("099123457")
    c = make_clave("15032025", ruc, "001", "002", "000004567")
    parsed = parse_clave(c)
    assert parsed.check_ok and parsed.ruc == ruc
    assert parsed.fecha == "2025-03-15" and parsed.numero_factura == "001-002-000004567"
    assert not parse_clave(c[:-1] + str((int(c[-1]) + 1) % 10)).check_ok


# ----------------------------------------------------------------- layout ---

def test_row_grouping_keeps_columns_apart():
    page = PageInfo(width=1000, height=1000)
    boxes = [
        Box("SUBTOTAL", (0.60, 0.50, 0.68, 0.51), 0),
        Box("SIN IMPUESTOS", (0.685, 0.50, 0.78, 0.51), 0),   # small gap -> same phrase
        Box("100.00", (0.90, 0.501, 0.95, 0.511), 0),          # big gap -> own column
        Box("VALOR TOTAL", (0.60, 0.53, 0.70, 0.54), 0),
    ]
    lines = build_lines(boxes, [page])
    assert [l.text for l in lines] == ["SUBTOTAL SIN IMPUESTOS", "100.00", "VALOR TOTAL"]
    assert lines[0].row == lines[1].row != lines[2].row
    assert "[L1] SUBTOTAL SIN IMPUESTOS    [L2] 100.00" in render_state(lines)


def _tilted(text, x0, y0, x1, y1, deg, page):
    """OCR-style box: the upright rectangle rotated `deg` around the page centre."""
    import math
    a = math.radians(deg)
    cx, cy = page.width / 2, page.height / 2
    pts = []
    for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1)):
        X, Y = x * page.width - cx, y * page.height - cy
        pts.append(((cx + X * math.cos(a) - Y * math.sin(a)) / page.width,
                    (cy + X * math.sin(a) + Y * math.cos(a)) / page.height))
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return Box(text, (min(xs), min(ys), max(xs), max(ys)), 0, poly=tuple(pts))


def test_tilted_photo_keeps_label_with_its_value():
    # Receipt photo tilted -6°: each value ends up level with the NEXT label down
    # unless the layout straightens the boxes first.
    page = PageInfo(width=1000, height=1400)
    rows = [("SubTotal Usd", "28,48"), ("Serv. 10%", "2,85"), ("IVA", "4,27"), ("TOTAL", "35,60")]
    boxes = []
    for i, (label, value) in enumerate(rows):
        y = 0.50 + i * 0.022
        boxes.append(_tilted(label, 0.20, y, 0.40, y + 0.015, -6, page))
        boxes.append(_tilted(value, 0.62, y, 0.70, y + 0.015, -6, page))
    boxes.append(_tilted("Gracias por preferirnos oneCODE", 0.20, 0.70, 0.70, 0.715, -6, page))
    lines = build_lines(boxes, [page])
    by_row = {}
    for ln in lines:
        by_row.setdefault(ln.row, []).append(ln.text)
    assert [r for r in by_row.values() if len(r) == 2] == [list(r) for r in rows]


def test_stacked_lines_never_share_a_row():
    # Name and address one under the other, slightly overlapping vertically, next to
    # a tall right-hand block: they used to be glued into one line.
    page = PageInfo(width=1000, height=1000)
    boxes = [
        Box("COMPAÑIA ECUATORIANA DEL TE CA CETCA", (0.173, 0.189, 0.406, 0.211), 0),
        Box("Dir Matriz: JOAQUINA GALARZA E1-52", (0.173, 0.206, 0.408, 0.228), 0),
        Box("FECHA Y HORA DE AUTORIZACION", (0.50, 0.195, 0.80, 0.215), 0),
    ]
    texts = [l.text for l in build_lines(boxes, [page])]
    assert "COMPAÑIA ECUATORIANA DEL TE CA CETCA" in texts
    assert "Dir Matriz: JOAQUINA GALARZA E1-52" in texts


def test_upright_pdf_boxes_unchanged_by_deskew():
    from app.layout import page_tilt
    page = PageInfo(width=1000, height=1000)
    boxes = [Box("SUBTOTAL", (0.1, 0.5, 0.3, 0.51), 0), Box("100.00", (0.8, 0.5, 0.9, 0.51), 0)]
    assert page_tilt(boxes, page) == 0.0


# --------------------------------------------------------------- pipeline ---

def test_digital_pdf_all_green_without_ocr():
    out = process(make_ride(), matcher=HeuristicMatcher(), include_previews=False)
    assert out["document"]["type"] == "pdf_text"
    f = fields(out)
    assert f["ruc_emisor"]["value"] == company_ruc("099123457")
    assert f["numero_factura"]["value"] == "001-002-000004567"
    assert f["fecha_emision"]["value"] == "2025-03-15"
    assert f["subtotal"]["value"] == "100.00"
    assert f["iva"]["value"] == "15.00"
    assert f["total"]["value"] == "115.00"
    assert f["razon_social"]["value"] == "COMERCIAL ANDINA S.A."
    assert out["checks"]["clave_acceso"]["valid"]
    assert out["checks"]["totals"]["ok"] is True
    for key in ("ruc_emisor", "numero_factura", "fecha_emision"):
        assert f[key]["status"] == "green", f[key]


def test_totals_mismatch_turns_money_yellow():
    out = process(make_ride(total="120.00"), matcher=HeuristicMatcher(), include_previews=False)
    f = fields(out)
    assert out["checks"]["totals"]["ok"] is False
    assert {f[k]["status"] for k in ("subtotal", "iva", "total")} == {"yellow"}


def test_restaurant_service_charge_still_adds_up():
    out = process(make_ride(servicio="10.00", total="125.00"), matcher=HeuristicMatcher(), include_previews=False)
    assert out["checks"]["totals"]["ok"] is True


def test_clave_fills_missing_fields():
    class NoneMatcher:
        name = "none"

        def match(self, state, lines, fields):
            from app.matchers.base import Match
            return {f.key: Match(None, 0.9) for f in fields}

    f = fields(process(make_ride(), matcher=NoneMatcher(), include_previews=False))
    assert f["numero_factura"]["value"] == "001-002-000004567"
    assert f["numero_factura"]["source"] == "clave_acceso"
    assert f["numero_factura"]["status"] == "green"
    assert f["subtotal"]["status"] == "empty"


def test_find_clave_split_across_lines():
    from app.models import Line
    c = make_clave("15032025", company_ruc("099123457"), "001", "001", "000000001")
    lines = [Line("L1", c[:25], (0, 0, 1, 0.1), 0, 0), Line("L2", c[25:], (0, 0.1, 1, 0.2), 0, 1)]
    assert find_clave(lines).raw == c


def test_totals_match_confirms_money_fields():
    f = fields(process(make_ride(), matcher=HeuristicMatcher(), include_previews=False))
    assert {f[k]["status"] for k in ("subtotal", "iva", "total")} == {"green"}
