# Facturas de prueba (Fase 0)

Los archivos de esta carpeta **no se suben a git** (datos reales). Solo este README
y `expected.example.json`.

1. Copia aquí las facturas (PDF, JPG, PNG, HEIC).
2. Crea `expected.json` con los valores correctos de cada una
   (formato en `expected.example.json`). Montos con 2 decimales, fecha `YYYY-MM-DD`.
3. `python evaluate.py`

Idealmente incluir: PDF digital del SRI, foto torcida/arrugada, foto de baja
calidad, y precuentas de restaurante (con 10% de servicio).

## Agrupamiento de líneas

`samples/pairs.json` define qué etiqueta y qué valor deben quedar en la misma fila
(y qué textos no deben mezclarse) para cada imagen:

```json
{"precuenta.jpg": {"same_row": [["^total$", "35,60"]], "not_same_line": [["mesero", "mesa"]]}}
```

`python tools/layout_check.py` corre el OCR sobre cada imagen y copias rotadas
(±3°, ±6°) y reporta cuántas se cumplen, sin llamar a Jev. Con `--baseline` compara
contra otra versión de `app/layout.py`.
