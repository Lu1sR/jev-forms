# Documentos de ejemplo de la demo

Cada plantilla de formulario (`lib/templates.ts`, campo `samples`) ofrece los
ejemplos que le corresponden:

| Plantilla | Archivo | Qué es |
|-----------|---------|--------|
| Sorteo por compras | `factura-supermercado.pdf` | Factura electrónica sintética (datos inventados) |
| Consumo en restaurante | `precuenta-restaurante.jpg` | Precuenta real; nombres de cajera y mesera difuminados |
| Consumo en restaurante | `precuenta-inclinada.jpg` | Precuenta real, foto inclinada, 10% de servicio; datos del cliente difuminados |
| Reembolso de gastos | `factura-hotel.pdf` | Factura electrónica sintética (datos inventados) |

Las facturas sintéticas salen de `make_ride` en `engine/tests/fixtures.py`.
Si reemplazas una foto, difumina antes cualquier dato personal.
