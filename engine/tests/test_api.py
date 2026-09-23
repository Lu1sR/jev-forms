import json

import pytest
from fastapi.testclient import TestClient

from app.forms import FormError, form_from_dict

from .fixtures import make_ride


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("MATCHER", "heuristic")
    monkeypatch.setenv("OCR_WARMUP", "0")
    from app.api import app
    with TestClient(app) as c:
        yield c


def post(client, form=None, form_id=None, data=None):
    body = {}
    if form is not None:
        body["form"] = form if isinstance(form, str) else json.dumps(form)
    if form_id:
        body["form_id"] = form_id
    return client.post("/extract", data=body,
                       files={"file": ("doc.pdf", data or make_ride(), "application/pdf")})


def test_custom_form_fields_come_from_the_request(client):
    # Keys the engine has never seen; roles keep the totals cross-check working.
    form = {
        "title": "Reembolso de gastos",
        "fields": [
            {"key": "proveedor_ruc", "label": "RUC proveedor", "type": "ruc", "role": "ruc_emisor",
             "hints": ["ruc"]},
            {"key": "monto_base", "label": "Base", "type": "money", "role": "subtotal",
             "hints": ["subtotal sin impuestos"]},
            {"key": "impuesto", "label": "IVA", "type": "money", "role": "iva", "hints": ["iva 15%"]},
            {"key": "monto", "label": "Monto a reembolsar", "type": "money", "role": "total",
             "hints": ["valor total"]},
        ],
    }
    r = post(client, form=form)
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["form"]["title"] == "Reembolso de gastos"
    got = {f["key"]: f for f in out["fields"]}
    assert list(got) == ["proveedor_ruc", "monto_base", "impuesto", "monto"]
    assert got["monto"]["value"] == "115.00"
    assert out["checks"]["totals"]["ok"] is True
    assert "previews" not in out["document"]


def test_field_without_role_is_filled_but_not_cross_checked(client):
    r = post(client, form={"fields": [{"key": "total_pagado", "label": "Total", "type": "money",
                                        "hints": ["valor total"]}]})
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["fields"][0]["value"] == "115.00"
    assert out["checks"]["totals"]["ok"] is None


def test_preset_form_still_works(client):
    r = post(client, form_id="sorteo")
    assert r.status_code == 200
    assert {f["key"] for f in r.json()["fields"]} >= {"ruc_emisor", "total"}
    assert client.get("/forms").json()[0]["id"] == "sorteo"


@pytest.mark.parametrize("form, msg", [
    ("{not json", "JSON"),
    ({"fields": []}, "al menos un campo"),
    ({"fields": [{"key": "Total!", "type": "money"}]}, "key inválido"),
    ({"fields": [{"key": "total", "type": "email"}]}, "no soportado"),
    ({"fields": [{"key": "a", "type": "text", "role": "total"}]}, "requiere type money"),
    ({"fields": [{"key": "a", "type": "money"}, {"key": "a", "type": "money"}]}, "misma key"),
])
def test_bad_forms_are_rejected_with_a_reason(client, form, msg):
    r = post(client, form=form)
    assert r.status_code == 400
    assert msg in r.json()["detail"]


def test_unknown_preset_and_bad_file(client):
    assert post(client, form_id="nope").status_code == 404
    assert post(client, form_id="sorteo", data=b"not a document").status_code == 415


def test_question_defaults_from_label():
    f = form_from_dict({"fields": [{"key": "mesa", "label": "Número de mesa"}]}).fields[0]
    assert f.type == "text" and "Número de mesa" in f.question and f.role is None
    with pytest.raises(FormError):
        form_from_dict({"fields": [{"key": "x", "type": "money", "role": "total"},
                                   {"key": "y", "type": "money", "role": "total"}]})


def test_role_only_fields_get_defaults_and_sum_helpers():
    form = form_from_dict({"fields": [{"key": "base", "role": "subtotal"},
                                      {"key": "imp", "role": "iva"},
                                      {"key": "pagar", "role": "total"}]})
    by_key = {f.key: f for f in form.fields}
    assert by_key["base"].type == "money" and "SUBTOTAL" in by_key["base"].question
    # Restaurant bills: servicio (and descuento, ICE) are asked for, hidden.
    assert {f.role for f in form.fields if f.hidden} == {"descuento", "servicio", "ice"}
    assert [f.key for f in form.visible] == ["base", "imp", "pagar"]


def test_restaurant_bill_adds_up_with_custom_form_that_forgot_servicio(client):
    r = post(client, data=make_ride(servicio="10.00", total="125.00"),
             form={"fields": [{"key": "base", "role": "subtotal"}, {"key": "imp", "role": "iva"},
                              {"key": "pagar", "role": "total"}]})
    assert r.status_code == 200, r.text
    assert r.json()["checks"]["totals"]["ok"] is True
