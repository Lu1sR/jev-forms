# jev-forms

Demo de ventas: lee una factura ecuatoriana (PDF o foto) y llena un formulario
automáticamente, con semáforo de confianza por campo.

| Servicio | Qué es | Estado |
|----------|--------|--------|
| `engine/` | Python: lectura (PyMuPDF / PaddleOCR), emparejamiento con Jev, validación | Fase 0 en curso |
| `web/`    | Next.js: interfaz de la demo | Fase 2 (pendiente) |

Se despliega en Railway: `web` público y `engine` solo por la red privada.
Detalles del motor en [`engine/README.md`](engine/README.md).
