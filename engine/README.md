# engine

Pipeline: **archivo → líneas numeradas → matcher (Jev) → extracción/validación → semáforo**.

```
app/
  api.py               FastAPI: POST /extract (archivo + campos del formulario), GET /forms
  readers/detect.py    tipo de archivo: PDF digital (PyMuPDF) / escaneado o foto (OCR)
  readers/ocr.py       OCR: RapidOCR (por defecto, ONNX) o PaddleOCR (OCR_ENGINE=paddle)
  layout.py            fragmentos → líneas; endereza fotos inclinadas, agrupa por fila y separa columnas
  matchers/jev.py      Jev vía OpenRouter /api/alpha/decisions (una pregunta choice por campo, una sola llamada)
  matchers/heuristic.py  línea base offline por palabras clave (sin API, para comparar)
  extract.py           valor por tipo: RUC, número de factura, fecha, montos, texto
  validate.py          clave de acceso SRI (49 dígitos) y chequeo subtotal + IVA = total
  pipeline.py          orquesta todo y decide verde / amarillo / vacío
  forms/__init__.py    formato de formularios, roles y sus preguntas por defecto
  forms/sorteo.yaml    formulario predefinido de ejemplo
cli.py                 procesa un archivo e imprime el JSON
evaluate.py            precisión por campo sobre samples/ + expected.json
tools/layout_check.py  mide el agrupamiento en filas (fotos rotadas ±3°/±6°) sin llamar a Jev
```

## Uso local

```bash
cd engine
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
pip install -r requirements-ocr.txt      # solo si vas a procesar fotos o PDFs escaneados
cp .env.example .env                     # y poner OPENROUTER_API_KEY (cli y api lo cargan solos)

uvicorn app.api:app --port 8000          # API
python cli.py factura.pdf --state        # ver las líneas que recibe el matcher
python cli.py factura.pdf                # JSON completo
MATCHER=heuristic python cli.py factura.pdf   # sin API
python cli.py foto.jpg --form-file form.json   # con un formulario propio
python evaluate.py                       # reporte de precisión (ver samples/README.md)
python tools/layout_check.py --baseline otro_layout.py   # comparar agrupamiento
pytest
```

## API

El formulario lo manda quien llama: el motor lee el documento (factura, nota de
venta, precuenta…) y llena esos campos.

```bash
curl -F file=@precuenta.jpg -F 'form={"title": "Consumo", "fields": [
  {"key": "local", "label": "Nombre del local", "question": "¿Qué línea contiene el nombre del negocio?"},
  {"key": "ruc_local", "role": "ruc_emisor"},
  {"key": "fecha", "role": "fecha_emision"},
  {"key": "base", "role": "subtotal"},
  {"key": "impuesto", "role": "iva"},
  {"key": "a_pagar", "role": "total"}
]}' localhost:8000/extract
```

Campo: `key` (obligatorio), `label`, `type` (`ruc | invoice_number | date | money | text`),
`question`, `role`, `hidden`, `hints`. Con `role` basta la `key`: toma tipo, etiqueta y
pregunta del rol y activa las validaciones (clave de acceso para RUC/número/fecha,
subtotal + IVA = total para montos). Si el formulario tiene subtotal, IVA y total, el
motor pide además descuento, servicio e ICE como campos ocultos (`aux_*`) para que la
suma cuadre en restaurantes. En vez de `form` se puede mandar `form_id=sorteo`
(`GET /forms` lista los predefinidos). `previews=true` incluye las imágenes de página.

## Reglas del semáforo

- **Verde**: probabilidad ≥ `GREEN_THRESHOLD` (0.85) y validación OK; o confirmado de
  forma determinística (coincide con la clave de acceso, o los montos cuadran).
- **Amarillo**: probabilidad baja, validación fallida, o `subtotal + IVA ≠ total`.
- **Vacío**: el matcher respondió `NONE` (y la clave de acceso no lo pudo completar).

La suma acepta descuento, ICE y servicio/propina (10% en restaurantes), leídos como
campos ocultos del formulario.

## Pendiente de verificar

- La API de decisiones de Jev (`/api/alpha/decisions`) es alpha y sin documentación
  pública: el formato se dedujo de sus mensajes de error.
- OCR: RapidOCR tarda 1–3 s por foto en CPU (M3). PaddleOCR es ~10x más lento en
  Apple Silicon; sigue disponible con `OCR_ENGINE=paddle` (corrige fotos de lado).
- Una foto con dos documentos (factura + recibo) mezcla valores de ambos.
