# email-worker: facturas por correo a Gestor

Un Cloudflare Email Worker recibe lo que llega a las direcciones de `ROUTES` y sube los
adjuntos a Gestor por su API. No hay buzón ni contraseñas de correo guardadas en Gestor.

| Dirección | Etiqueta | Flujo de trabajo en Gestor |
|---|---|---|
| `facturas@luis-dev.com` | `Correo-Familia` | Dueño admin; ver y editar grupo `Familia` |
| `facturas-luis@luis-dev.com` | `Correo-Luis` | Dueño Luis; sin compartir |

```
remitente ──> facturas[-luis]@luis-dev.com ──> Email Routing ──> Worker gestor-correo-familia
                                                            │ PDF y fotos adjuntas
                                                            ▼
                         https://docs.luis-dev.com/api/documents/post_document/
                            (usuario "correo": solo puede añadir documentos)
```

## Qué hace con cada correo

| Caso | Resultado |
|---|---|
| Dirección sin etiquetas en `ROUTES` | Rechazado ("Dirección no configurada") |
| Remitente fuera de `ALLOWED_SENDERS` | Rechazado ("Remitente no autorizado") |
| Sin PDF ni fotos | Rechazado, con un mensaje que pide reenviar la factura como adjunto |
| PDF (también `application/octet-stream` con `.pdf`) | Subido |
| Fotos JPG/PNG/TIFF/WebP adjuntas de 30 KB o más | Subidas |
| XML del SRI, zip, logos en línea, píxeles | Ignorados (Gestor no lee el XML; el PDF RIDE sí) |
| Gestor caído o con error | 3 intentos (0, 3 y 10 s); si siguen fallando, reenvía el correo completo a `FALLBACK_EMAIL` con la cabecera `X-Gestor-Error` |

El remitente se compara con el sobre (`MAIL FROM`, que cubre los reenvíos automáticos de
Gmail, `luis+caf_=…@gmail.com`) y con la cabecera `From` (que cubre a los proveedores que
envían por servicios de correo masivo). Cloudflare ya rechaza correos que no pasan ni SPF
ni DKIM, o que fallan DMARC según la política del dominio. Queda un riesgo: un dominio
permitido con DMARC `p=none` puede ser suplantado. Por eso conviene preferir direcciones
completas a `@dominio`. En el peor caso entra un documento basura marcado "Por revisar".

Límites de Cloudflare: 5 MiB por mensaje, y CPU limitada en el plan gratuito de Workers
(un correo muy grande puede fallar con `EXCEEDED_CPU`; se ve en los logs del Worker).

## Configuración

| Nombre | Tipo | Valor |
|---|---|---|
| `GESTOR_URL` | var (`wrangler.toml`) | `https://docs.luis-dev.com` |
| `ROUTES` | var | JSON: dirección → ids de etiquetas de Gestor, separados por comas |
| `GESTOR_TOKEN` | secreto | token de la API del usuario `correo` |
| `ALLOWED_SENDERS` | secreto | `a@gmail.com, b@gmail.com, @proveedor.ec` |
| `FALLBACK_EMAIL` | secreto | destino **verificado** en Email Routing para correos que no se pudieron subir |

La lista de remitentes y el correo de respaldo van como secretos porque el repo es público.

## Puesta en marcha

1. **Gestor** (docs.luis-dev.com, como admin):
   - Grupo `Familia`; permisos por defecto (ver y editar) para `Familia`.
   - Tipo `Factura`; etiquetas `Por revisar` (de bandeja de entrada), `Correo-Familia` y `Correo-Luis`.
   - Usuario `correo` con solo *Documento → Añadir*; token en `/admin/` → Auth Token → Tokens.
   - Flujo por etiqueta: *Documento añadido* con *Cualquier etiqueta* = `Correo-…`;
     acción *Asignación* con tipo `Factura`, propietario y permisos según la tabla de arriba.
     Sin flujo, los documentos solo los ven `correo` (dueño) y los superusuarios.
2. **Cloudflare**: en luis-dev.com → Email → Email Routing → Destination addresses, verificar
   el correo de respaldo (si no está ya).
3. **Desplegar el Worker** (desde esta carpeta):
   ```bash
   npm install
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put GESTOR_TOKEN
   npx wrangler secret put ALLOWED_SENDERS
   npx wrangler secret put FALLBACK_EMAIL
   ```
   Poner los ids de las etiquetas en `ROUTES` de `wrangler.toml` y volver a hacer `deploy`.
4. **Reglas de correo**: Email Routing → Routing rules → Create address, una por dirección de
   `ROUTES` (`facturas`, `facturas-luis`) → acción *Send to a Worker* → `gestor-correo-familia`.
5. **Probar**: reenviar una factura a cada dirección y revisar en Gestor quién la ve.
   Logs en vivo: `npx wrangler tail`.

Para otra persona: una dirección más en `ROUTES`, su etiqueta `Correo-<nombre>`, su flujo
(dueño esa persona) y su regla en Email Routing. `ALLOWED_SENDERS` es una sola lista para
todas las direcciones.

Si algún día se pone Cloudflare Access delante de docs.luis-dev.com, el Worker queda
bloqueado: habría que darle un service token o excluir `/api/documents/post_document/`.

## Desarrollo local

```bash
npm test                         # reglas de remitentes y adjuntos
cp .dev.vars.example .dev.vars   # apunta a un Gestor local o falso en :9999
npx wrangler dev
curl -X POST 'http://localhost:8787/cdn-cgi/local/email?from=familia@example.com&to=facturas@luis-dev.com' \
  --data-binary @factura.eml     # el .eml debe tener cabecera Message-ID
```
