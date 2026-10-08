# Exploración: automatización de flujos sobre Gestor (Paperless) con n8n

Estado: exploración del 2026-10-06, revisada el 2026-10-07 para cambiar el enfoque
de "sidecar Django propio" a "n8n como ejecutor de flujos". Sin cambios en el repo ni
en la instancia.

Alcance: una capa de automatización sobre Gestor (paperless-ngx) en la que los flujos
los diseño yo y conectan documentos con otras herramientas (extracción de datos con
Formularios, Google Sheets, correo, aprobaciones humanas, Odoo a futuro). La
aprobación de pagos es solo uno de los flujos posibles. Decisiones que se mantienen:
Paperless es la fuente de verdad de los documentos y refleja el estado con etiquetas y
campos; nada escribe en su base de datos; todo pasa por su REST API.

**Convención.** Lo que no lleva marca está verificado en este repo, en el código y la
documentación oficial de paperless-ngx **v3.2.1** (etiqueta `v3.2.1`, leída el
2026-10-06) o en la documentación oficial de n8n (leída el 2026-10-07).
**[Supuesto]** marca una conclusión propia no verificada. **[Verificar]** marca algo
que conviene probar en la PoC antes de depender de ello.

---

## 1. Inventario del repo

### 1.1 Servicios y versiones (`gestor/deploy/docker-compose.yml`)

| Servicio | Imagen | Notas |
|---|---|---|
| `paperless` | `gestor:local` / ECR, construida desde `gestor/Dockerfile` sobre **`ghcr.io/paperless-ngx/paperless-ngx:3.2.1`** | Solo añade marca (plantillas, logo, scripts de init). Publica `127.0.0.1:${GESTOR_LOCAL_PORT:-8000}:8000`, nunca al exterior. |
| `db` | `postgres:18` | `shared_buffers=64MB`, **`max_connections=30`**. Base `paperless`, usuario `paperless`. |
| `broker` | `valkey/valkey:9-alpine` | `maxmemory 64mb`, persistencia `save 60 1`. Lo usan Celery (cola de tareas) y cachalot (caché de lecturas) de Paperless. |
| `tika` | `apache/tika:3.3.1.0` | `-Xmx256m`, límite 700 MB. |
| `gotenberg` | `gotenberg/gotenberg:8.37` | Límite 700 MB; Chromium y LibreOffice bajo demanda. |
| `cloudflared` | `cloudflare/cloudflared:2025.9.1` | Perfil `tunnel`. Túnel gestionado remotamente (`TUNNEL_TOKEN`); los hostnames públicos se configuran en Cloudflare Zero Trust, no en el repo. `depends_on: paperless`. |
| `caddy` | `caddy:2-alpine` | Perfil `caddy`, alternativa para clientes sin Cloudflare. No se usa en `familia`. |

Otros datos del entorno:

- **Red:** el compose no declara `networks:`, así que todos los servicios comparten la
  red por defecto del proyecto (`gestor_default`) y se resuelven por nombre de servicio
  (`paperless`, `db`, `broker`, …). Un servicio nuevo en el mismo archivo queda en esa red.
- **Volúmenes:** todo bajo `${DATA_ROOT}` (`/data` en EC2, un EBS cifrado aparte):
  `paperless/{data,media,consume,export}`, `postgres`, `redis`, `backups`, `caddy`.
- **Memoria:** VM `t4g.small` (2 GB) + 4 GB de swap. Medido en local el 2026-10-03:
  ~1,0 GB en reposo y pico ~1,75 GB procesando OCR + `.docx` + `.eml`. Es el límite
  que más condiciona a n8n.
- **Infra:** `infra/` (CDK Python), un stack por cliente (`infra/clients/<cliente>.yaml`),
  región `us-east-2`. La VM es desechable; `gestor-up` renderiza `.env` desde SSM
  Parameter Store (`/gestor/<cliente>/`) y hace `docker compose --profile tunnel up`.
  La instancia tiene **IMDSv2 con hop limit 1**, así que los contenedores no alcanzan
  el endpoint de metadatos de EC2.
- **Respaldos:** `backup.sh` diario hace `pg_dump` de la base `paperless` y
  `document_exporter`, y sube a S3. **La base de n8n no entra en ese respaldo
  hasta que se añada** (ver 4.1).
- **Correo saliente:** Resend por SMTP (`SMTP_*`). Entrada de facturas por correo con
  un Cloudflare Email Worker (`infra/email-worker/`) que llama a
  `POST /api/documents/post_document/` con el token del usuario `correo`.

### 1.2 Variables de entorno relevantes (solo nombres)

En `.env`: `DATA_ROOT`, `GESTOR_LOCAL_PORT`, `PAPERLESS_URL`, `GESTOR_DOMAIN`,
`GESTOR_APP_TITLE`, `PAPERLESS_ADMIN_USER`, `PAPERLESS_ADMIN_PASSWORD`,
`PAPERLESS_ADMIN_MAIL`, `PAPERLESS_SECRET_KEY`, `POSTGRES_PASSWORD`,
`GESTOR_OCR_LANGUAGE`, `GESTOR_DATE_ORDER`, `GESTOR_DATE_PARSER_LANGUAGES`,
`GESTOR_SEARCH_LANGUAGE`, `GESTOR_TIME_ZONE`, `GESTOR_TASK_WORKERS`,
`GESTOR_THREADS_PER_WORKER`, `GESTOR_WEBSERVER_WORKERS`, `TIKA_MEM_LIMIT`,
`GOTENBERG_MEM_LIMIT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USE_TLS`, `SMTP_USER`,
`SMTP_PASSWORD`, `SMTP_FROM`, `CLOUDFLARE_TUNNEL_TOKEN`, `BACKUP_LOCAL_DAYS`.

Fijadas en el compose y que afectan a n8n:

| Variable | Valor | Efecto para n8n |
|---|---|---|
| `PAPERLESS_WEBHOOKS_ALLOW_INTERNAL_REQUESTS` | `"false"` | **Bloquea webhooks a `http://n8n:5678`** (IP privada de Docker). Ver 4.2. |
| `PAPERLESS_PROXY_SSL_HEADER` | `X-Forwarded-Proto: https` | `{{doc_url}}` en webhooks sale con `https://docs.luis-dev.com`. |
| `PAPERLESS_URL` | `https://docs.luis-dev.com` | Base de `doc_url`. |
| `PAPERLESS_ALLOWED_HOSTS` | no fijada (por defecto `*`) | Hoy n8n puede llamar a `http://paperless:8000`. Si algún día se fija al dominio, hay que añadir `paperless`. |
| `PAPERLESS_AUDIT_LOG_ENABLED` | no fijada (por defecto `true`) | El historial por documento está activo. |
| `PAPERLESS_TASK_WORKERS` | 1 | Los webhooks de workflows son tareas Celery: compiten con el OCR en el único worker. |

### 1.3 Cómo se enruta el tráfico

```
Usuario ──HTTPS──> Cloudflare (docs.luis-dev.com)
                      │ túnel saliente; cero puertos abiertos en AWS
                      ▼
              cloudflared (contenedor, red gestor_default)
                      │ http://paperless:8000   (hostname público configurado en Zero Trust)
                      ▼
                  paperless ── db / broker / tika / gotenberg
```

El Email Worker y cualquier cliente externo entran por el mismo túnel. Nada escucha
en la IP pública de la VM.

---

## 2. Capacidades de la API de Paperless 3.2.1 (verificadas)

Fuentes: `docs/api.md`, `docs/usage.md`, `docs/configuration.md`,
`docs/advanced_usage.md` y el código (`documents/views.py`, `documents/serialisers.py`,
`documents/bulk_edit.py`, `documents/signals/handlers.py`, `documents/workflows/*`,
`paperless/network.py`, `paperless/settings/__init__.py`) de la etiqueta `v3.2.1`.

### 2.1 Autenticación y versionado

- Token: `POST /api/token/` (usuario y contraseña) y cabecera `Authorization: Token …`.
  También se genera desde "My Profile" o en `/admin/`. El endpoint de token está
  limitado a **`5/min`** (`PAPERLESS_TOKEN_THROTTLE_RATE`). Los tokens **no tienen
  alcance ni caducidad**: un token vale lo que vale su usuario.
- Alternativas: Basic, sesión, Remote-User (`PAPERLESS_ENABLE_HTTP_REMOTE_USER_API`)
  y OIDC headless (`api/auth/`). Con 2FA activa en un usuario, Basic deja de funcionar
  para ese usuario; Token sigue.
- Versionado: `Accept: application/json; version=10` (soportadas 9 y 10; respuesta
  con `X-Api-Version` y `X-Version`). Cada versión se mantiene al menos un año.
  **n8n debe fijar `version=10` siempre.**
- Explorador OpenAPI en `/api/schema/view/`.

### 2.2 Campos personalizados

- Tipos: `string`, `longtext`, `url`, `date`, `boolean`, `integer`, `float`,
  `monetary`, `documentlink`, `select`. El tipo **no se puede cambiar** tras crearlo.
- Representación en el documento: `custom_fields: [{"field": <id>, "value": …}]`.
  Valores: `monetary` como cadena `"USD115.00"` (ISO de 3 letras + número; el campo
  puede tener `extra_data.default_currency`); `select` como **cadena con el id de la
  opción** (las opciones viven en `extra_data.select_options: [{"id","label"}]`, el id
  es una cadena aleatoria de 16 caracteres si no se da); `documentlink` como lista de
  ids (crea el enlace simétrico); `date` ISO; `string` máximo 128 caracteres.
- **Escritura, dos vías:**
  1. `PATCH /api/documents/{id}/` con `custom_fields`. **Reemplaza la lista completa:**
     lo que no se envía se quita. Obliga a leer-modificar-escribir y abre una carrera
     con cualquier humano que edite el documento a la vez.
  2. `POST /api/documents/bulk_edit/` con `method: "modify_custom_fields"` y
     `parameters: {"add_custom_fields": {"<id>": valor}, "remove_custom_fields": [ids]}`.
     Solo toca los campos indicados (`update_or_create` por campo). **Es la vía
     recomendada para n8n.** Lo mismo para etiquetas: `modify_tags` con
     `add_tags` / `remove_tags`.
- Lectura con filtro: `?custom_field_query=["<nombre>","exact",valor]` y operadores
  `in`, `isnull`, `exists`, `icontains`, `gt/gte/lt/lte/range`, `contains` (enlaces).
- Regla de permisos: **solo el dueño del documento (o un superusuario) añade o quita
  campos**. Condiciona quién debe ser el dueño de los documentos en flujo (ver 4.3).

### 2.3 Etiquetas

- CRUD en `/api/tags/`, jerárquicas (`parent`), con dueño y permisos por objeto.
  Asignar una hija añade a sus padres; quitar una quita a sus hijas.
- Filtros de documentos: `tags__id__all`, `tags__id__in`, `tags__id__none`, además de
  `is_tagged`. Útil para "todos los documentos con la etiqueta del flujo".
- Los permisos sobre la etiqueta **no** afectan a los documentos que la llevan.

### 2.4 Permisos y dueño por documento

- Campos en el documento: `owner` (id de usuario) y `set_permissions`
  `{"view": {"users": [], "groups": []}, "change": {...}}`. Con `?full_perms=true` se
  reciben completos; por defecto solo `user_can_change`.
- En lote: `bulk_edit` `set_permissions` con `owner`, `set_permissions` y `merge`
  (false por defecto: reemplaza). Solo el dueño o un superusuario puede concederlos.
- Los documentos que entran por la carpeta de consumo o por la API con un usuario
  distinto quedan con ese dueño (o sin dueño); los workflows nativos pueden fijar
  dueño y permisos al entrar.

### 2.5 Notas

`GET/POST/DELETE /api/documents/{id}/notes/`. POST con `{"note": "texto"}`; la
respuesta lista `id`, `note`, `created`, `user`. Ver notas exige `view_document`;
crear o borrar exige `change_document` sobre ese documento. Buscables con
`notes.note:` y `notes.user:`.

### 2.6 Historial (audit log)

- `GET /api/documents/{id}/history/`. Devuelve `[{id, timestamp, action, changes,
  actor: {id, username} | null}]`, incluyendo cambios de campos personalizados.
- Requiere `PAPERLESS_AUDIT_LOG_ENABLED` (true por defecto), el permiso global
  `auditlog.view_logentry`, y que quien consulta sea **dueño del documento o
  superusuario**.
- El actor se captura en el middleware de `django-auditlog` 3.4.1 a partir de
  `request.user` **antes** de que Django REST Framework autentique por token.
  **[Supuesto, verificar en la PoC]:** los cambios hechos por `PATCH` con token
  quedan con `actor: null` ("System" en la interfaz). En cambio `bulk_edit` escribe
  el `LogEntry` a mano con `actor=request.user`, así que sí registra al usuario del
  token. Es una razón más para que la auditoría de negocio viva en notas y campos del
  documento y para escribir por `bulk_edit`.
- Los cambios aplicados por workflows nativos se registran con actor "System".

### 2.7 Workflows nativos y webhooks

- Disparadores: `Consumption Started`, `Document Added`, **`Document Updated`** y
  `Scheduled`. Filtros: etiquetas (cualquiera / todas / ninguna), tipo, corresponsal,
  ruta y consulta de campos personalizados.
- `Document Updated` se dispara con la señal `document_updated`, que envían:
  `DocumentViewSet.update` (es decir, cada `PUT`/`PATCH` por API o interfaz), las
  operaciones de versiones, y la tarea `bulk_update_documents` que corre tras cada
  `bulk_edit`. Es decir: **tanto los cambios de un humano en la interfaz como los del
  propio n8n disparan el webhook** (ver 4.2 para el bucle).
- **Acción Webhook** (`WorkflowActionWebhook`): `url`, `use_params` + `params`
  (clave/valor) o `body` (texto libre), `as_json`, `headers` (clave/valor) e
  `include_document` (adjunta el archivo original como multipart `file`).
- **Payload:** no hay un JSON de evento fijo. El cuerpo o los params son plantillas
  con estas variables: `{{correspondent}}`, `{{document_type}}`, `{{owner_username}}`,
  `{{added}}`, `{{filename}}` (original), `{{current_filename}}`, `{{created}}`,
  `{{title}}`, `{{doc_url}}`, `{{id}}` (en la documentación aparece como
  `{{doc_id}}`; `[Verificar]` cuál acepta el formulario de la interfaz).
  **No incluye etiquetas, campos ni qué cambió.** El webhook es una notificación
  "mira el documento N", no un evento con diff.
- **Entrega:** tarea Celery `send_webhook` con `httpx`, **timeout 5 s**, sin seguir
  redirecciones. Reintenta hasta **3 veces con backoff solo ante `HTTPStatusError`**
  (respuesta 4xx/5xx). **Un error de conexión o un timeout no se reintenta.** Si el
  n8n está caído, el webhook se pierde. Hay un solo worker de Celery
  (`PAPERLESS_TASK_WORKERS=1`), compartido con el OCR.
- **SSRF:** `validate_outbound_http_url` valida esquema (`PAPERLESS_WEBHOOKS_ALLOWED_SCHEMES`,
  por defecto `http,https`) y puerto (`PAPERLESS_WEBHOOKS_ALLOWED_PORTS`, por defecto
  todos); con `PAPERLESS_WEBHOOKS_ALLOW_INTERNAL_REQUESTS=false` el transporte rechaza
  IPs privadas, loopback y link-local. **La instancia actual tiene `false`.**
- **Sin firma:** el webhook no firma el cuerpo. La autenticación se hace poniendo un
  secreto en `headers` (p. ej. `X-Flows-Secret`).
- Los workflows no tienen permisos por objeto: quien tiene el permiso `Workflow`
  los ve y edita todos. Solo administradores.

### 2.8 Otros ganchos

- `PAPERLESS_POST_CONSUME_SCRIPT`: recibe `DOCUMENT_ID`, `DOCUMENT_FILE_NAME`,
  `DOCUMENT_TYPE`, `DOCUMENT_CREATED/MODIFIED/ADDED`, `DOCUMENT_SOURCE_PATH`,
  `DOCUMENT_ARCHIVE_PATH`, `DOCUMENT_THUMBNAIL_PATH`, `DOCUMENT_DOWNLOAD_URL`,
  `DOCUMENT_THUMBNAIL_URL`, `DOCUMENT_OWNER`, `DOCUMENT_CORRESPONDENT`,
  `DOCUMENT_TAGS`, `DOCUMENT_ORIGINAL_FILENAME`, `TASK_ID`. Es bloqueante y corre
  dentro del contenedor de Paperless; solo cubre la entrada, no los cambios. No lo
  recomiendo: el webhook de `Document Added` hace lo mismo sin
  meter código en la imagen.
- Tareas: `GET /api/tasks/?task_id=` para seguir una subida por `post_document`.
- Actualización en vivo de la interfaz (websocket) al recibir `document_updated`:
  los cambios de n8n se ven sin recargar.

---

## 3. Por qué n8n y no un sidecar propio

El primer borrador de este documento proponía un servicio Django propio con un motor
de estados. Al ampliar el alcance a "muchos flujos que conectan Gestor con otras
herramientas", ese servicio terminaría siendo un n8n pequeño: disparadores, pasos con
reintentos, conectores, pantalla de ejecuciones, credenciales cifradas. n8n ya trae
todo eso, es maduro (serie 2.x desde diciembre de 2025) y tiene nodos para Google
Sheets, correo, HTTP, Postgres y cientos de servicios más. Construirlo sería
reinventar la rueda y cada conector costaría semanas.

Lo que n8n **no** resuelve y hay que diseñar alrededor (detalle en la sección 6):

1. La **licencia** no es libre para operarlo como parte de un servicio cobrado.
2. No tiene **usuarios finales ni roles**: quien tiene un enlace, actúa.
3. Su registro de ejecuciones es técnico y se poda; **no es una auditoría de negocio**.
4. **Memoria**: no cabe cómodo en la VM de 2 GB.
5. **Flujos como código** y despliegue reproducible requieren un pequeño andamiaje.

Ninguno obliga a construir un segundo servicio. Se resuelven con Paperless (que ya
tiene usuarios, permisos, notas e historial), con Cloudflare Access y con scripts.

---

## 4. Arquitectura propuesta

```
Usuario ──HTTPS──> Cloudflare ── docs.luis-dev.com  ──┐
                               ── flujos.luis-dev.com ─┤ (Access delante: solo editor y formularios)
                                                       │ túnel saliente
                                                       ▼
   VM del cliente · docker compose · red gestor_default
   ┌─────────────────────────────────────────────────────────────────────┐
   │ paperless ──webhook (workflow nativo)──> n8n (webhook/, form/)      │
   │     ▲                                     │                          │
   │     └── REST API (bulk_edit, notes) ──────┘                          │
   │ db (Postgres: bases paperless + n8n)   broker (Valkey, solo Paperless)│
   │ tika · gotenberg · cloudflared                                       │
   └───────────────────────────────┬─────────────────────────────────────┘
                                   │ salidas por HTTPS
                                   ▼
          Formularios (motor de extracción) · Google Sheets · Resend · Odoo…
```

Reparto de responsabilidades (la "convivencia"):

| Quién | Hace | No hace |
|---|---|---|
| **Workflows nativos de Paperless** | Reglas al entrar un documento (dueño, permisos, título, tipo), filtros por etiqueta o campo, y **disparar el webhook a n8n** cuando un documento cumple una condición | Lógica que toque otro sistema, esperas humanas, cálculos |
| **n8n** | Todo lo que cruza sistemas: extraer datos con Formularios, escribir en Sheets, enviar correos, esperar una aprobación, llamar a Odoo, y **reflejar el resultado en Paperless** (etiquetas, campos, notas) por la API | Guardar documentos, permisos de usuarios finales, servir de archivo |
| **Paperless (interfaz)** | Es la pantalla del cliente: vistas guardadas por estado ("Por aprobar", "Enviadas a Sheets"), campo "Estado", notas con quién hizo qué, campo URL "Aprobar" que lleva al formulario de n8n | |
| **Cloudflare Access** | Identidad delante de los formularios de aprobación y del editor de n8n | |

### 4.1 Servicio `n8n` en el compose

```yaml
  n8n:
    <<: [*restart, *logging]
    image: docker.n8n.io/n8nio/n8n:2.x.y        # fijar versión exacta, igual que paperless
    depends_on: { db: { condition: service_healthy } }
    environment:
      N8N_HOST: ${FLOWS_DOMAIN}                  # flujos.luis-dev.com
      N8N_PROTOCOL: https
      N8N_PORT: 5678
      N8N_EDITOR_BASE_URL: https://${FLOWS_DOMAIN}/
      N8N_WEBHOOK_URL: https://${FLOWS_DOMAIN}/   # WEBHOOK_URL queda obsoleta desde 2.35
      N8N_PROXY_HOPS: 1                          # Cloudflare delante
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}  # cifra las credenciales; guardar en SSM
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: db
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: ${N8N_DB_PASSWORD}
      DB_POSTGRESDB_POOL_SIZE: 2
      EXECUTIONS_DATA_PRUNE: "true"
      EXECUTIONS_DATA_MAX_AGE: 720                # 30 días de ejecuciones
      EXECUTIONS_DATA_PRUNE_MAX_COUNT: 5000
      N8N_DEFAULT_BINARY_DATA_MODE: filesystem    # PDFs fuera de la base
      GENERIC_TIMEZONE: ${GESTOR_TIME_ZONE}
      NODE_OPTIONS: --max-old-space-size=384      # [Verificar] ajustar midiendo
    volumes:
      - ${DATA_ROOT:-./data}/n8n:/home/node/.n8n
    mem_limit: ${N8N_MEM_LIMIT:-600m}
    # sin "ports": solo lo alcanza cloudflared
```

- **Red y hostname:** misma red por defecto; `flujos.luis-dev.com` como segundo
  public hostname del túnel en Zero Trust → `http://n8n:5678`. Añadir `n8n` al
  `depends_on` de `cloudflared`. Con el perfil `caddy`, un bloque más en el `Caddyfile`.
- **Base de datos:** base `n8n` y usuario `n8n` en el mismo Postgres (por defecto n8n
  usa SQLite; Postgres es lo apropiado con una base ya levantada). Añadir su `pg_dump`
  a `backup.sh`. `max_connections=30` alcanza (pool de 2).
- **Redis:** n8n en modo `regular` no usa Redis. El modo `queue` (que sí lo usa) es
  de pago y no hace falta.
- **Memoria.** La documentación oficial no fija un mínimo; las guías de hospedaje
  hablan de 2 GB mínimo y de **300 a 500 MB en reposo** para el contenedor
  **[Supuesto, medir]**. Con Paperless en pico a 1,75 GB, la VM de 2 GB no alcanza:
  **plan con `t4g.medium` (4 GB)** para cualquier cliente con flujos. Es un cambio de
  una línea en `infra/clients/<cliente>.yaml`.
- **Nodos comunitarios de Paperless:** existen `@iamfj/n8n-nodes-paperless-ngx`
  (0.4.2, agosto 2026) y `@mephistojb/n8n-nodes-paperless` (0.2.17, junio 2026).
  Requieren habilitar paquetes comunitarios y su cobertura de la API y mantenimiento
  no están garantizados. **Recomendación: no depender de ellos.** Usar el nodo HTTP
  Request con una credencial "Header Auth" (`Authorization: Token …`) y la cabecera
  `Accept: application/json; version=10`, envuelto en sub-workflows reutilizables
  (ver 5.2). Así la integración con Paperless queda en un solo lugar, que era el
  objetivo de la "interfaz" para conectores futuros.

### 4.2 Cómo entra la señal desde Paperless

Igual que en el diseño anterior, y con las mismas restricciones verificadas en 2.7:

- Workflow nativo con disparador `Document Added` o `Document Updated`, filtro por
  etiqueta (p. ej. `flujo:sheets`), acción Webhook a
  `https://flujos.luis-dev.com/webhook/<ruta>` con `as_json`, cuerpo
  `{"doc_id": {{id}}}` y cabecera secreta. En n8n, nodo Webhook con autenticación
  "Header Auth". Destino público por el túnel, para no relajar
  `PAPERLESS_WEBHOOKS_ALLOW_INTERNAL_REQUESTS=false`.
- Como el webhook de Paperless no reintenta ante conexión fallida y solo trae el id,
  cada flujo empieza igual: **leer el documento por la API y decidir con lo que ve**,
  no con lo que dice el webhook. Y un flujo de **reconciliación** con Schedule Trigger
  cada 5 a 15 minutos que busca documentos con la etiqueta de entrada y sin la
  etiqueta de "procesado" y los reencola. Esto cubre caídas de n8n o del túnel.
- **Evitar bucles:** cada escritura de n8n en Paperless vuelve a disparar
  `Document Updated`. Regla: el filtro del workflow nativo exige la etiqueta de
  entrada **y** la ausencia de la etiqueta de salida (`flujo:sheets` presente,
  `flujo:sheets:ok` ausente), y el primer paso en n8n vuelve a comprobarlo. Las
  escrituras van por `bulk_edit`, que es idempotente.

### 4.3 Cómo escribe n8n en Paperless

Siempre con `POST /api/documents/bulk_edit/` (`modify_tags`, `modify_custom_fields`,
`set_permissions`) y `POST /api/documents/{id}/notes/`. Nunca `PATCH custom_fields`
(reemplaza la lista completa). Usuario de servicio `flujos` en Paperless con token;
los documentos en flujo con dueño `flujos` (lo asigna el workflow nativo de entrada)
para poder escribir campos y leer el historial. `bulk_edit` registra en el historial
del documento al usuario del token, así que en Paperless queda "flujos cambió la
etiqueta X" con fecha.

---

## 5. Flujos como código y despliegue

### 5.1 El repo sigue siendo la fuente de los flujos

La edición Community de n8n no incluye control de versiones con Git ni entornos (son
de pago). Lo mismo se consigue con el CLI y la API pública de n8n, disponibles en
Community:

- Carpeta `flows/workflows/*.json` en el repo, exportada con
  `n8n export:workflow --all --separate` después de editar en el editor.
- Al arrancar la VM (`gestor-up`) o en un comando `flows-deploy`:
  `n8n import:workflow --separate --input=…` y `import:credentials` con un JSON
  renderizado desde SSM (token de Paperless, clave de Formularios, cuenta de servicio
  de Google). Las credenciales nunca viven en el repo.
- Un `README` por flujo con qué etiquetas, campos y vistas guardadas requiere en
  Paperless, y un script `paperless-setup.py` que los crea por API (etiquetas, campo
  "Estado", workflow nativo con el webhook). Así una instancia nueva queda lista con
  un comando.

### 5.2 Biblioteca de sub-workflows "Paperless"

Un conjunto de sub-workflows (nodo Execute Workflow) que son la única parte que
conoce la API: `paperless/get_document`, `paperless/download`,
`paperless/modify_tags`, `paperless/set_fields`, `paperless/add_note`,
`paperless/set_permissions`, `paperless/find_pending`. Los flujos de negocio los
llaman por nombre. Si mañana Odoo o un segundo gestor documental, se escribe otra
biblioteca con las mismas entradas y salidas. Es el equivalente de la interfaz
`DocumentBackend` del diseño anterior, en n8n.

### 5.3 Ejemplo 1: factura → Formularios → Sheets (sin humanos)

```
Webhook (doc_id)  ─> paperless/get_document ─> ¿tiene flujo:sheets y no flujo:sheets:ok? ─(no)─> fin
                                                      │(sí)
                                              paperless/download (PDF o imagen)
                                                      │
                                              HTTP: motor Formularios → JSON con campos y semáforo
                                                      │
                                   ┌─ todos verdes ───┴─── algún amarillo/rojo ─┐
                                   ▼                                            ▼
                     Google Sheets: añadir fila                 paperless/add_note "Revisar: campo X"
                     paperless/set_fields (RUC, total, IVA)     paperless/modify_tags +flujo:sheets:revisar
                     paperless/modify_tags +flujo:sheets:ok
```

Lo que ve el cliente: la factura en Gestor con RUC, total e IVA llenos, la etiqueta
de resultado, y la fila en su hoja. Vista guardada "Facturas por revisar" para las
amarillas. Ningún login nuevo.

### 5.4 Ejemplo 2: aprobación de pagos (con humanos)

```
Webhook (doc_id, etiqueta flujo:pagos) ─> get_document ─> set_fields Estado=Recibido
   ─> Wait (resume on form) ─ guarda $execution.resumeUrl en el campo URL "Aprobar"
   ─> correo al jefe (Resend) con el enlace al documento en Gestor
   ─> [espera] el jefe abre el documento, hace clic en "Aprobar" → formulario n8n
       (Cloudflare Access pide login; el correo del aprobador llega en una cabecera)
   ─> ¿correo ∈ aprobadores del flujo? ─(no)─> nota "intento no autorizado" y volver a esperar
   ─> set_fields Estado=Aprobado, Monto aprobado; add_note "Aprobado por X el …";
      quitar campo URL; +flujo:pagos:aprobado ─> siguiente Wait para contabilidad …
```

Puntos verificados: el nodo Wait pausa la ejecución y la guarda en la base hasta que
llega la URL de reanudación o se envía el formulario; cada ejecución tiene su URL
única; se puede fijar un límite de tiempo. El formulario admite campos de texto,
número, fecha, lista desplegable y ocultos, con estilos propios (en español, con la
marca docutecec).

Puntos a verificar en la PoC: **[Verificar]** que las cabeceras
`Cf-Access-Authenticated-User-Email` llegan al nodo Form Trigger/Wait (en el nodo
Webhook sí llegan las cabeceras); **[Verificar]** el comportamiento del formulario
si la ejecución ya se reanudó (doble clic, dos aprobadores). Si las cabeceras no
llegan al formulario, alternativa: un nodo Webhook detrás de Access que recibe la
identidad y luego llama a la URL de reanudación con un Header Auth interno.

---

## 6. Lo que n8n no trae y cómo se cubre

| Falta | Cómo se cubre | Costo |
|---|---|---|
| **Licencia.** Texto de la SUL (LICENSE.md): uso "solo para fines internos del negocio o uso personal o no comercial"; distribución "solo gratis y con fines no comerciales". FAQ oficial (docs.n8n.io, License FAQ, leído el 2026-10-07): fin interno es usar n8n "dentro de tu organización o producto, donde personas externas pueden recibir o ver lo que tus flujos producen"; "los servicios de consultoría y automatización están explícitamente permitidos" si "n8n sigue siendo tu herramienta interna, donde los clientes reciben resultados, no acceso"; está permitido "usar n8n tras bambalinas en tu propio producto, donde los usuarios usan y disparan las automatizaciones que tú construiste, e incluso conectan sus propias cuentas"; si el cliente corre n8n en su infraestructura, puedes cobrarle por instalar, configurar, construir flujos y mantener. **Prohibido:** "hospedar n8n como servicio y permitir que tus clientes construyan flujos", white-label cobrando acceso, y dejar que usuarios externos construyan o configuren sus propios flujos (por interfaz propia, API, MCP o un agente), que exige licencia Enterprise/Embed. **Lectura para Gestor:** el modelo "n8n por instancia, solo yo edito, el cliente solo dispara y aprueba, el valor del producto está en Gestor y Formularios" encaja en lo permitido; la zona gris es que la instancia esté en mi nube y se cobre mensualidad. Acción: escribir a license@n8n.io describiendo exactamente ese modelo y guardar la respuesta; nunca dar acceso al editor a un cliente; si un cliente quiere construir sus propios flujos, instancia propia a su nombre. Alternativas con licencia permisiva si la respuesta es negativa: Activepieces (núcleo MIT), Windmill (AGPL), Node-RED (Apache 2.0) **[Verificar licencias actuales]**. **Esto no es asesoría legal.** El piloto familiar es uso personal | Decisión de negocio, no de código |
| **Usuarios y roles de negocio** | Paperless tiene los usuarios, grupos y permisos por documento; Cloudflare Access da la identidad en los formularios; la lista de aprobadores por flujo vive en una tabla pequeña (Postgres, nodo Data Table de n8n o una hoja) que el flujo consulta | Bajo |
| **Auditoría de negocio** | Cada paso relevante escribe una **nota** en el documento ("Aprobado por X el …", "Enviado a Sheets, fila 123") y actualiza campos; el historial de Paperless registra quién y cuándo. Para consultas agregadas, una tabla `eventos` en la base `n8n` (nodo Postgres) o una hoja de auditoría. Las ejecuciones de n8n se conservan 30 días para depurar | Bajo |
| **Bandeja "mis pendientes"** | Vistas guardadas de Paperless por estado, compartidas con el grupo correspondiente, con el campo URL "Aprobar" visible en la lista | Cero |
| **Idempotencia y bucles** | Etiquetas de entrada/salida en el filtro del workflow nativo y comprobación al inicio del flujo; `bulk_edit`; flujo de reconciliación periódico | Disciplina al diseñar cada flujo |
| **Secretos** | Credenciales cifradas en la base de n8n con `N8N_ENCRYPTION_KEY` (guardar la clave en SSM; sin ella la base no sirve). Secretos externos es función Enterprise | Bajo |
| **Memoria** | `t4g.medium` para clientes con flujos; `mem_limit`, poda de ejecuciones, binarios en disco | ~US$12/mes más por VM **[Supuesto según precios on-demand de Graviton]** |
| **Acceso al editor** | Solo tú. Access con tu correo delante de `flujos.luis-dev.com` salvo las rutas `/webhook/*` y `/form/*` (política de bypass para el webhook de Paperless, Access con login de usuarios del cliente para los formularios) | Configuración en Zero Trust |

---

## 7. Riesgos y preguntas abiertas

| Tema | Riesgo | Mitigación |
|---|---|---|
| Licencia de n8n | Modelo "yo hospedo y cobro" fuera de lo permitido | Resolver antes del primer cliente de pago (sección 6); el piloto no lo necesita |
| Memoria | n8n + Paperless en 2 GB | `t4g.medium`; medir en reposo y en pico de OCR |
| Pérdida de webhooks | Paperless no reintenta ante conexión fallida; un solo worker de Celery | Reconciliación periódica desde n8n; alarma si encuentra atrasados |
| Bucles webhook ↔ escrituras | Ejecuciones en cadena | Etiquetas de entrada/salida en el filtro nativo; comprobación inicial; `bulk_edit` |
| Formularios públicos | Quien tenga la URL aprueba | Access delante de `/form/*` y verificación del correo en el flujo; URL por ejecución y se quita del documento al usarse |
| Dos aprobadores a la vez | Doble reanudación | **[Verificar]** la segunda llamada a una ejecución ya reanudada; registrar en nota ambos intentos |
| Datos fuera de la instancia | Sheets, Formularios en Railway, Resend | Cláusulas en el contrato de encargo (LOPDP); el motor de Formularios debería terminar en la misma región o en la VM |
| Actualizaciones | Paperless cambia `bulk_edit` o variables de plantilla; n8n 2.x cambia nodos | Fijar versiones exactas; los sub-workflows `paperless/*` concentran el cambio; probar en local antes de subir |
| Motor de Formularios | Hoy solo accesible en la red privada de Railway | Ya está en `SIGUIENTES-PASOS.md` 3a: exponerlo con claves de API |
| Multi-tenant | Un n8n por VM por cliente | Correcto para el modelo actual; un n8n central para muchos clientes sacaría los datos de cada instancia y complicaría la licencia aún más |

Preguntas abiertas:

1. ¿Dónde vivirá la instancia del cliente de pago: tu AWS o la del cliente? Define la
   respuesta de licencia.
2. ¿Qué flujos tienen demanda real? Los dos ejemplos son hipótesis hasta hablar con
   los pilotos.
3. ¿Formularios como servicio compartido (Railway) o como contenedor en la VM del
   cliente? Afecta memoria, latencia y protección de datos.

---

## 8. Recomendación final

1. **n8n como ejecutor de flujos**, un contenedor por instancia de Gestor, en el
   mismo compose, con base `n8n` en el mismo Postgres y sin Redis. VM `t4g.medium`.
2. **Paperless sigue siendo la pantalla del cliente y la fuente de verdad.** Los
   workflows nativos disparan; n8n ejecuta; n8n refleja el resultado con etiquetas,
   campos y notas por `bulk_edit`. El cliente no entra a n8n.
3. **No construir un sidecar propio.** Lo único a escribir: la biblioteca de
   sub-workflows `paperless/*`, el script de preparación de Paperless por API, y el
   despliegue de flujos y credenciales desde el repo y SSM.
4. **Aprobaciones** con el nodo Wait y formularios de n8n detrás de Cloudflare
   Access, enlazados desde un campo URL en el documento.
5. **Resolver la licencia antes del primer cliente de pago.** Mientras tanto, el
   piloto familiar es uso personal.

El diseño del sidecar Django queda como plan de contingencia si la licencia de n8n
resulta inviable y las alternativas con licencia permisiva no convencen: sus
hallazgos sobre la API (sección 2) y la detección de cambios (4.2) aplican igual.

## 9. Estado de la implementación (2026-10-07)

Construido en la rama `claude/gestor-flows` y probado en local con la imagen
`paperless-ngx:3.2.1` y `n8n:2.43.1`:

- Motor de Formularios con claves de API por cliente (`ENGINE_API_KEYS`, cabecera
  `X-API-Key`) y línea de uso por extracción; la demo web manda su clave.
- Compose: perfil `flows` con `n8n` y `flows-init` (base `n8n` en el Postgres compartido),
  webhooks internos permitidos, respaldo de la base `n8n`, secretos nuevos.
- `gestor/deploy/flows/`: seis flujos (`paperless/get`, `paperless/write`,
  `paperless/find-pending`, `sheets/process`, `sheets/webhook`, `sheets/reconcile`),
  `paperless_setup.py` con `paperless/sheets.yaml`, `import.sh` y plantilla de credenciales.
- Infra: `flows.enabled` por cliente, `t4g.medium`, secretos `N8N_*`, `FLOWS_WEBHOOK_SECRET`,
  `FORMULARIOS_API_KEY`, `PAPERLESS_FLOWS_TOKEN`, `GOOGLE_SA_JSON`; `gestor-up` importa los
  flujos cuando el token existe.
- Verificado de punta a punta: documento subido con `flujo:sheets` → webhook nativo (cuerpo
  JSON por `params`) → n8n → motor → siete campos escritos, nota y etiqueta `ok`; el
  historial de Paperless registra a `flujos` como actor; la reconciliación corre cada 10 min.
- Hallazgos que cambiaron el diseño: las etiquetas creadas por API quedan con dueño y son
  invisibles para otros usuarios (se crean sin dueño); un `body` de texto con `as_json`
  llega como *cadena* JSON (se usan `params`); la CLI de n8n escribe en la base y el servidor
  solo registra webhooks al arrancar (`import.sh` reinicia n8n).
- Pendiente de probar con credenciales reales: la escritura en Google Sheets.

## 10. Plan original de prueba de concepto (pasos pequeños)

Todo probable en local con `gestor/deploy` antes de tocar la instancia familiar.

1. **Levantar n8n junto a Paperless en local** (servicio del 4.1, base `n8n` en el
   mismo Postgres). Medir memoria en reposo. Crear el usuario `flujos` y su token.
2. **Primer webhook de ida y vuelta:** workflow nativo `Document Added` con etiqueta
   `flujo:prueba` → Webhook de n8n → `bulk_edit` que añade `flujo:prueba:ok` y una
   nota. Confirmar que el eco no vuelve a disparar (filtro de etiqueta de salida) y
   qué aparece en el historial del documento.
3. **Biblioteca `paperless/*`** como sub-workflows, exportada a `flows/workflows/`
   y reimportada con el CLI en un contenedor limpio. Prueba de despliegue
   reproducible con credenciales desde un JSON renderizado.
4. **Flujo Sheets completo** (5.3) con el motor de Formularios: primero apuntando al
   motor en local (`engine/`), después al de Railway cuando tenga clave de API. Hoja
   de prueba con cuenta de servicio de Google.
5. **Reconciliación** con Schedule Trigger: apagar n8n, etiquetar tres documentos,
   encender y comprobar que los procesa.
6. **Aprobación** (5.4): Wait + formulario, URL en campo del documento, correo por
   Resend. Primero sin Access; luego con Access en local no es posible, así que la
   prueba de cabeceras se hace en la instancia familiar con `flujos.luis-dev.com`.
7. **Producción familiar:** `n8n` en el compose, hostname en Zero Trust, políticas
   de Access, `pg_dump` de `n8n` en `backup.sh`, clave de cifrado y contraseñas en
   SSM, `t4g.medium`. Un flujo real: facturas de la familia → campos llenos → hoja
   de gastos.
8. **Licencia y pilotos:** cotización de n8n Embed o decisión de desplegar en la
   nube del cliente; dos pilotos con un flujo cada uno. Solo entonces invertir en más
   flujos.
