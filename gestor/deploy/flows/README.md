# flows: automatizaciones de Gestor con n8n

n8n corre junto a paperless en el mismo `docker-compose.yml` (perfil `flows`). Paperless
sigue siendo la fuente de verdad y la pantalla del cliente; n8n solo lee y escribe por su
API y refleja cada resultado con etiquetas, campos personalizados y notas. El cliente
nunca entra a n8n: etiqueta documentos en Gestor y ve el resultado en Gestor.

```
flows/
  workflows/*.json         los flujos, exportados de n8n (fuente de verdad en el repo)
  credentials.template.json  credenciales de n8n; los valores salen de .env al importar
  import.sh                carga credenciales y flujos en el n8n del compose y los publica
  paperless_setup.py       crea en Paperless lo que un flujo necesita (etiquetas, campos,
                           vistas, usuario de servicio, workflow nativo con el webhook)
  paperless/<flujo>.yaml   lo que paperless_setup.py aplica para cada flujo
```

## Cómo funciona un flujo

```
persona o regla de correo pone la etiqueta flujo:sheets
   │
   ▼
workflow nativo de Paperless (creado por paperless_setup.py)
   · da permiso de edición al usuario "flujos"
   · POST http://n8n:5678/webhook/paperless-sheets  {"doc_id": N}  + cabecera X-Flows-Secret
   │
   ▼
n8n sheets/webhook ─> sheets/process
   1. paperless/get: lee el documento y descarga el archivo
   2. ¿tiene flujo:sheets y ninguna etiqueta de salida?  no → fin
   3. paperless/write: +flujo:sheets:procesando   (así sus propias escrituras no lo redisparan)
   4. Formularios (/extract): RUC, número, fecha, subtotal, IVA, total, clave de acceso
   5. Google Sheets: una fila (si FLOWS_SHEETS_ID está definido)
   6. paperless/write: campos + nota + etiqueta final (ok | revisar | error) − procesando
sheets/reconcile: cada 10 min busca documentos con la etiqueta de entrada y sin salida
   (y "procesando" con más de 30 min) y los procesa: cubre webhooks perdidos.
```

Etiquetas de salida: `flujo:sheets:ok` (todo verde), `flujo:sheets:revisar` (algún campo
dudoso o la suma no cuadra; la nota dice cuáles), `flujo:sheets:error` (Formularios o
Sheets fallaron; la nota dice por qué). Para reintentar un documento: quitarle la etiqueta
de salida; la reconciliación lo vuelve a tomar.

Los sub-workflows `paperless/*` son los únicos que conocen la API de Paperless. Resuelven
etiquetas y campos **por nombre** (los ids cambian entre instancias) y escriben solo con
`bulk_edit` (toca lo indicado, nunca reemplaza la lista de campos) y `notes`. Las
escrituras quedan en el historial del documento con el usuario `flujos`.

## Puesta en marcha (una vez por instancia)

1. **Secretos en `.env`** (`gen-secrets.sh` los genera): `N8N_DB_PASSWORD`,
   `N8N_ENCRYPTION_KEY`, `FLOWS_WEBHOOK_SECRET`; más `N8N_OWNER_EMAIL` /
   `N8N_OWNER_PASSWORD` (cuenta con la que entras al editor), `FORMULARIOS_URL` /
   `FORMULARIOS_API_KEY` (clave de este cliente en `ENGINE_API_KEYS` del motor) y, para
   Sheets, `FLOWS_SHEETS_TARGETS` y `GOOGLE_SA_FILE` (clave JSON de una cuenta de
   servicio con cada hoja compartida como editor).
2. **Arrancar**: `docker compose --profile flows up -d` (en EC2 lo hace `gestor-up`).
   `flows-init` crea la base `n8n` en el Postgres compartido.
3. **Preparar Paperless** (desde cualquier máquina que llegue a la instancia):
   ```bash
   PAPERLESS_PASSWORD=… FLOWS_WEBHOOK_SECRET=… python3 flows/paperless_setup.py --url https://docs.ejemplo.com sheets
   ```
   Imprime `PAPERLESS_FLOWS_TOKEN` **una sola vez**: guardarlo en `.env` (en EC2:
   `infra/scripts/put-secrets.sh <cliente> --set PAPERLESS_FLOWS_TOKEN`). Es idempotente:
   volver a correrlo actualiza lo que cambió en el YAML.
4. **Importar los flujos**: `flows/import.sh` (en EC2 lo hace `gestor-up` en cada arranque
   cuando el token existe). Crea el dueño de n8n la primera vez, importa credenciales y
   flujos, los publica y reinicia n8n para que registre webhooks y horarios.
5. **Probar**: poner `flujo:sheets` a una factura y mirar sus etiquetas, campos y notas.

Hoja de cálculo: la pestaña debe tener en la fila 1 estas cabeceras: `Documento`,
`Título`, `RUC emisor`, `Número de factura`, `Fecha de emisión`, `Subtotal`, `IVA`,
`Total`, `Estado`, `Enlace`, `Procesado`.

### Varias hojas (una instancia del flujo por hoja)

El mismo flujo sirve varias hojas. Cada instancia tiene su nombre, sus etiquetas
`flujo:<nombre>[:estado]` y su hoja en `FLOWS_SHEETS_TARGETS` (en EC2 sale de
`flows.sheets` del YAML del cliente):

```bash
FLOWS_SHEETS_TARGETS='{"sheets": {"id": "<hoja familia>", "tab": "Facturas"}, "sheets-luis": {"id": "<hoja Luis>", "tab": "Facturas"}}'
python3 flows/paperless_setup.py --url https://docs.ejemplo.com sheets --name sheets-luis
```

El webhook nativo manda `{"doc_id": N, "flow": "sheets-luis"}`; n8n elige etiquetas y
hoja por ese nombre, y la reconciliación recorre todas las instancias del mapa. Para que
una regla de correo alimente una instancia, su workflow nativo (`Facturas de Luis`) añade
la etiqueta de entrada `flujo:sheets-luis`.

## Editar un flujo

El editor solo escucha en `127.0.0.1:${N8N_LOCAL_PORT}` (5678). En EC2:
`aws ssm start-session --target <instancia> --document-name AWS-StartPortForwardingSession --parameters 'portNumber=5678,localPortNumber=5678'`
y abrir `http://localhost:5678` con `N8N_OWNER_EMAIL` / `N8N_OWNER_PASSWORD`.

Después de editar, exportar al repo y volver a importar en las demás instancias:

```bash
docker compose --profile flows exec -T -u node n8n n8n export:workflow --all --separate --output=/tmp/wf
docker compose --profile flows cp n8n:/tmp/wf/. flows/workflows/
git diff flows/workflows
```

Los ids de flujos y credenciales están fijos en los JSON: importar sobrescribe, nunca
duplica. Las credenciales nunca van al repo; solo la plantilla.

## Añadir un flujo

1. `paperless/<nombre>.yaml` con sus etiquetas, campos, vistas y el workflow nativo
   (webhook a `http://n8n:5678/webhook/<ruta>` con `X-Flows-Secret`).
2. Flujos en n8n reutilizando `paperless/get`, `paperless/write` y
   `paperless/find-pending`; exportarlos a `workflows/`.
3. Para esperas humanas (aprobaciones): nodo Wait con formulario y un campo URL en el
   documento con `$execution.resumeUrl`; el formulario debe quedar detrás de Cloudflare
   Access (requiere exponer `flujos.<dominio>` en el túnel). Pendiente de construir.

## Límites y cuidados

- **Licencia de n8n** (Sustainable Use License): permitido como herramienta interna detrás
  de tu producto donde los clientes reciben resultados, no acceso al editor. Confirmar con
  license@n8n.io antes de cobrar por instancias en tu nube. No dar nunca acceso al editor a
  un cliente.
- **Memoria**: n8n necesita ~400 MB; la VM debe ser de 4 GB (`t4g.medium`).
- Webhooks de Paperless: no se reintentan si n8n está caído; por eso existe
  `sheets/reconcile`. `PAPERLESS_WEBHOOKS_ALLOW_INTERNAL_REQUESTS=true` es necesario
  para que Paperless alcance `n8n` por la red interna.
- `N8N_ENCRYPTION_KEY` cifra las credenciales en la base `n8n`; sin ella el respaldo de esa
  base no sirve (está en SSM junto con el resto).
- Ejecuciones: se guardan 30 días (`N8N_EXECUTIONS_MAX_AGE_HOURS`), son el registro
  técnico. El registro de negocio son las notas y el historial de cada documento.
