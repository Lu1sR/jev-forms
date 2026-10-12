# Arquitectura

## Componentes y fronteras

Hay dos mundos desplegados por separado:

1. **Railway (demos y motor compartido).** `landing`, `web`, `engine` y una demo de Gestor
   (`gestor/` con usuario demo, sin los ajustes de producción). `web` es público y habla
   con `engine` por la red privada de Railway; el motor también tiene dominio público
   (`formularios-api.docutecec.com`) con claves por cliente para que lo llamen los flujos.
2. **AWS (Gestor de producción, una VM por cliente).** Un stack CDK `Gestor-<cliente>` por
   archivo en `infra/clients/`. La VM corre `gestor/deploy/docker-compose.yml`; todo el
   estado vive en un EBS de datos aparte. Entrada solo por Cloudflare Tunnel (security
   group sin reglas de entrada); administración por SSM Session Manager, sin SSH.

Fronteras que el código respeta:

- El navegador nunca habla con el motor: `web/app/api/extract/route.ts` hace de proxy y
  añade `ENGINE_API_KEY`.
- Paperless es la fuente de verdad y la única pantalla del cliente. n8n no tiene usuarios
  finales; lee y escribe en Paperless por API con el usuario de servicio `flujos`.
- Solo los sub-workflows `paperless/*` (`gestor/deploy/flows/workflows/paperless-get.json`,
  `gestor/deploy/flows/workflows/paperless-write.json`, `gestor/deploy/flows/workflows/paperless-find-pending.json`) conocen la API de Paperless.
- El Email Worker usa el usuario `correo`, que solo puede añadir documentos.

## Flujos de datos principales

**Factura por correo → Gestor → Sheets (instancia familia):**

```
proveedor ──> fact@ / facturas@luis-dev.com ──> Cloudflare Email Routing
  ──> Worker gestor-correo-familia (infra/email-worker/src/index.js)
        remitente autorizado + PDF/foto → POST /api/documents/post_document/ con etiqueta de ROUTES
        cualquier otro caso → reenvío completo a FALLBACK_EMAIL con X-Gestor-Motivo
  ──> workflow nativo de Paperless por etiqueta (dueño, permisos, etiqueta flujo:<nombre>)
  ──> webhook interno a n8n (X-Flows-Secret) ──> sheets/process
        paperless/get → motor /extract → fila en Google Sheets → paperless/write
        (campos, nota y etiqueta flujo:<nombre>:ok|revisar|error)
  sheets/reconcile cada 10 min recoge lo que el webhook perdió
```

**Demo de extracción:** navegador → `web` (reduce la foto en el cliente) → proxy → `engine`
`POST /extract` → lectura (PyMuPDF o OCR) → una sola llamada a Jev con una pregunta por
campo → extracción por tipo y validaciones (clave de acceso SRI de 49 dígitos, subtotal +
IVA + otros = total) → verde/amarillo/vacío por campo, con la línea de origen.

## Dependencias externas

| Servicio | Uso | Nota |
|---|---|---|
| OpenRouter / Jev (`typesafe/jev-1.13`) | Matcher del motor | API `/api/alpha/decisions`, alpha y sin documentación |
| Railway | Hosting de demos y motor | Sin watch paths: cada push a `main` reconstruye todo |
| AWS (proyecto `541099636566`, us-east-2) | EC2, EBS, S3, AWS Backup, SSM, ECR, CloudWatch, SNS, Budgets | Plan gratuito con créditos, vence 2027-04-03 |
| Cloudflare | DNS de `luis-dev.com`, Tunnel, Email Routing, Workers | El Worker llama a Gestor por internet |
| Resend | SMTP saliente de Gestor | Remitente `@luis-dev.com` |
| Google Sheets | Destino del flujo `sheets` | Cuenta de servicio con cada hoja compartida |

## Restricciones y puntos delicados

- **El repo es público.** Remitentes autorizados, correo de respaldo, tokens y claves van
  como secretos de wrangler o en SSM `/gestor/<cliente>/` (`infra/scripts/put-secrets.sh`),
  nunca en el código. Los logs del Worker guardan solo el dominio del remitente.
- **Solo us-east-2.** El proyecto AWS no permite recursos en otras regiones. El plan
  gratuito no permite `t4g.medium`, así que la instancia familia corre n8n en `t4g.small`
  con swap y límites de memoria ajustados. `infra/README.md` y `docs/workflows-exploration.md`
  todavía dicen que flows exige `t4g.medium`; manda `infra/gestor_infra/config.py`
  (mínimo `t4g.small`).
- **Un cambio en compose, imagen, bootstrap o tamaño reemplaza la VM** (unos minutos de
  corte). El EBS de datos, el bucket de respaldos y el vault de AWS Backup tienen
  `RemovalPolicy.RETAIN`. Siempre `cdk diff` antes de `cdk deploy`.
- **Plantillas de Gestor copiadas de paperless-ngx v3.2.1** (`gestor/branding/templates/`).
  Al subir la versión hay que compararlas con las nuevas. Restaurar un respaldo exige la
  misma versión de imagen.
- **Paperless por API:** las etiquetas creadas por API quedan con dueño e invisibles para
  otros usuarios, así que se crean sin dueño; el cuerpo del webhook nativo va por `params`
  (un `body` con `as_json` llega como cadena); los webhooks no se reintentan; etiquetas y
  campos se resuelven **por nombre**, porque los ids cambian entre instancias; las
  escrituras van solo por `bulk_edit` y `notes`.
- **n8n** solo registra webhooks al arrancar (`gestor/deploy/flows/import.sh` lo reinicia).
  `N8N_ENCRYPTION_KEY` es necesaria para que sirva el respaldo de la base `n8n`. El editor
  solo escucha en `127.0.0.1:5678`; nunca se expone a un cliente (licencia).
- **Cloudflare bloquea el User-Agent por defecto de Python**:
  `gestor/deploy/flows/paperless_setup.py` envía uno propio.
- **Email Worker:** `setReject` no guarda el correo; por eso todo lo que no entra a Gestor
  se reenvía a `FALLBACK_EMAIL`. Límite de 5 MiB por mensaje y CPU limitada en el plan
  gratuito. Poner Cloudflare Access delante de `docs.luis-dev.com` bloquearía al Worker.
  Un dominio permitido con DMARC `p=none` puede suplantarse: preferir direcciones completas.
- **Motor sin `ENGINE_API_KEYS` acepta todo** (solo para desarrollo). `engine/serve.py`
  abre sockets IPv4 e IPv6 por separado porque la red privada de Railway resuelve a ambos.
- **Formato de Jev inferido:** `build_payload` y `parse_response` en
  `engine/app/matchers/jev.py` son los dos únicos lugares a tocar si cambia.
- **Datos personales:** `engine/samples/` no se versiona; los ejemplos de `web/public/samples/`
  están difuminados; el contenido de la landing es ficticio y va rotulado así.
