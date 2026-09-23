# jev-forms

Demo de ventas: lee un comprobante ecuatoriano (factura, nota de venta o precuenta;
PDF o foto) y llena automáticamente los campos del formulario que se le pida, con un
semáforo de confianza por campo.

| Servicio | Qué es | Estado |
|----------|--------|--------|
| `engine/` | Python: lectura (PyMuPDF / RapidOCR), emparejamiento con Jev, validación; CLI y API HTTP | Motor y API listos |
| `web/`    | Next.js: interfaz de la demo | Fase 2 (pendiente) |

Se desplegará en Railway: `web` público y `engine` solo por la red privada.
Detalles del motor y de la API en [`engine/README.md`](engine/README.md).
