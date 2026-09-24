"""Synthetic invoices that mimic an SRI RIDE layout (two top blocks side by side,
buyer block, items, totals table as label | value columns, access key).
Only for tests; real samples go in samples/."""
from __future__ import annotations

import pymupdf

from app.validate import clave_check_digit


def company_ruc(base9: str) -> str:
    coefs = [4, 3, 2, 7, 6, 5, 4, 3, 2]
    r = 11 - sum(int(x) * c for x, c in zip(base9, coefs)) % 11
    assert r != 10, "no valid check digit for this base"
    return f"{base9}{0 if r == 11 else r}001"


def make_clave(fecha_ddmmyyyy: str, ruc: str, estab: str, pto: str, seq: str) -> str:
    first48 = f"{fecha_ddmmyyyy}01{ruc}2{estab}{pto}{seq}12345678" + "1"
    return first48 + str(clave_check_digit(first48))


def make_ride(
    *,
    razon="COMERCIAL ANDINA S.A.",
    ruc=None,
    numero=("001", "002", "000004567"),
    fecha="15/03/2025",
    subtotal="100.00",
    iva="15.00",
    servicio=None,
    total="115.00",
    clave=True,
    item=("A001", "2", "Producto de ejemplo", "50.00"),
) -> bytes:
    ruc = ruc or company_ruc("099123457")
    d, m, y = fecha.split("/")
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    def t(x, y, s, size=9):
        page.insert_text((x, y), s, fontsize=size, fontname="helv")

    # Left block: issuer
    t(40, 60, razon, 12)
    t(40, 80, "Dirección Matriz: Av. 9 de Octubre 100 y Malecón, Guayaquil")
    t(40, 95, "Obligado a llevar contabilidad: SI")
    # Right block: fiscal data
    t(320, 60, f"R.U.C.: {ruc}", 10)
    t(320, 78, "FACTURA", 12)
    t(320, 95, f"No. {'-'.join(numero)}")
    t(320, 110, "NÚMERO DE AUTORIZACIÓN")
    if clave:
        c = make_clave(f"{d}{m}{y}", ruc, *numero)
        t(320, 122, c, 7)
    t(320, 137, f"FECHA Y HORA DE AUTORIZACIÓN: {fecha} 10:22:01")
    # Buyer
    t(40, 180, "Razón Social / Nombres y Apellidos: JUAN PÉREZ")
    t(360, 180, "Identificación: 0912345678")
    t(40, 195, f"Fecha Emisión: {fecha}")
    # Items
    for x, h in ((40, "Cod."), (75, "Cant."), (110, "Descripción"), (330, "P.Unit"), (380, "Total")):
        t(x, 240, h)
    code, qty, desc, unit = item
    t(40, 255, code)
    t(75, 255, qty)
    t(110, 255, desc)
    t(330, 255, unit)
    t(380, 255, subtotal)
    # Totals table
    rows = [
        ("SUBTOTAL 15%", subtotal),
        ("SUBTOTAL 0%", "0.00"),
        ("SUBTOTAL SIN IMPUESTOS", subtotal),
        ("TOTAL DESCUENTO", "0.00"),
        ("IVA 15%", iva),
    ]
    if servicio:
        rows.append(("SERVICIO 10%", servicio))
    rows.append(("VALOR TOTAL", total))
    y0 = 300
    for i, (label, value) in enumerate(rows):
        t(360, y0 + i * 15, label)
        t(520, y0 + i * 15, value)
    return doc.tobytes()
