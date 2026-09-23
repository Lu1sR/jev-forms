# engine

Pipeline: **archivo → líneas numeradas → matcher (Jev) → extracción/validación → semáforo**.

```
app/
  readers/detect.py    tipo de archivo: PDF digital (PyMuPDF) / escaneado o foto (PaddleOCR)
  layout.py            fragmentos → líneas; agrupa por fila y separa columnas
  matchers/jev.py      Jev vía OpenRouter (una pregunta Choice por campo, una sola llamada)
  matchers/heuristic.py  línea base offline por palabras clave (sin API, para comparar)
  extract.py           valor por tipo: RUC, número de factura, fecha, montos, texto
  validate.py          clave de acceso SRI (49 dígitos) y chequeo subtotal + IVA = total
  pipeline.py          orquesta todo y decide verde / amarillo / vacío
  forms/sorteo.yaml    definición del formulario (campos, preguntas, tipos)
cli.py                 Fase 0: procesa un archivo e imprime el JSON
evaluate.py            Fase 0: precisión por campo sobre samples/ + expected.json
```

## Uso local

```bash
cd engine
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
pip install -r requirements-ocr.txt      # solo si vas a procesar fotos o PDFs escaneados
cp .env.example .env                     # y poner OPENROUTER_API_KEY

python cli.py factura.pdf --state        # ver las líneas que recibe el matcher
python cli.py factura.pdf                # JSON completo
MATCHER=heuristic python cli.py factura.pdf   # sin API
python evaluate.py                       # reporte de precisión (ver samples/README.md)
pytest
```

## Reglas del semáforo

- **Verde**: probabilidad ≥ `GREEN_THRESHOLD` (0.85) y validación OK; o confirmado de
  forma determinística (coincide con la clave de acceso, o los montos cuadran).
- **Amarillo**: probabilidad baja, validación fallida, o `subtotal + IVA ≠ total`.
- **Vacío**: el matcher respondió `NONE` (y la clave de acceso no lo pudo completar).

La suma acepta descuento, ICE y servicio/propina (10% en restaurantes), leídos como
campos ocultos del formulario.

## Pendiente de verificar

- Formato exacto de la API de Jev en OpenRouter (`app/matchers/jev.py`: solo
  `build_payload` y `parse_response` deberían cambiar).
- PaddleOCR 3.x en CPU: velocidad y calidad con fotos reales.
