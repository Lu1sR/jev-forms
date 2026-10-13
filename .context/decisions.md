# Architectural Decisions

Append-only log. Entries are added by /contextly:decide and never rewritten.

---

## ADR-001 — Gestor de producción en una VM EC2 por cliente, con CDK en Python y Cloudflare Tunnel

**Date:** 2026-10-03
**Status:** Accepted
**Affects:** `infra/`, `gestor/deploy/docker-compose.yml`, `gestor/docs/plan-aws.md`

**Context.** El Gestor necesitaba una plantilla de producción reproducible por cliente,
separada de la demo en Railway, dentro de un proyecto AWS de región única (us-east-2) en
plan gratuito con US$100 de créditos.

**Decision.** Una VM EC2 ARM por cliente (`t4g.small` + swap) que corre el mismo Docker
Compose que en local, definida con AWS CDK en Python y parametrizada por
`infra/clients/<cliente>.yaml`. Entrada HTTPS por Cloudflare Tunnel, sin puertos de entrada;
SMTP con Resend; estado en un EBS de datos que se conserva y respaldos diarios a S3 y AWS Backup.

**Alternatives considered.**
- Caddy con Let's Encrypt en 80/443: se mantiene como perfil `caddy` para clientes sin
  Cloudflare, no como opción por defecto, porque abre puertos de entrada.
- Amazon SES para el correo saliente: se eligió Resend (gratis hasta 3.000 correos al mes).

**Consequences.** Aislamiento total por cliente y costo de ~US$20/mes por instancia. Cualquier
cambio en compose, imagen o bootstrap reemplaza la VM (corte de unos minutos). Máximo de 4
clientes por región sin pedir más cuota de VPC. Hay que decidir antes de febrero de 2027 si se
pasa a plan de pago.

---

## ADR-002 — n8n como ejecutor de flujos junto a paperless, sin sidecar propio

**Date:** 2026-10-07
**Status:** Accepted
**Affects:** `gestor/deploy/flows/`, `gestor/deploy/docker-compose.yml`, `docs/workflows-exploration.md`

**Context.** El producto necesita muchos flujos que conecten Gestor con otras herramientas
(Formularios, Google Sheets, aprobaciones), con disparadores, reintentos, conectores y
credenciales cifradas.

**Decision.** Un contenedor n8n por instancia de Gestor (perfil `flows` del compose), con su
base en el mismo Postgres. Paperless sigue siendo la fuente de verdad y la pantalla del
cliente: los workflows nativos disparan por webhook, n8n ejecuta y refleja el resultado con
etiquetas, campos y notas. El cliente nunca entra a n8n.

**Alternatives considered.**
- Servicio Django propio con motor de estados: terminaría siendo un n8n pequeño y cada
  conector costaría semanas. Queda como plan de contingencia si la licencia de n8n resulta inviable.

**Consequences.** Conectores listos y pantalla de ejecuciones gratis. A cambio: la licencia
Sustainable Use exige confirmar el modelo con n8n antes del primer cliente de pago; n8n no
tiene usuarios finales ni auditoría de negocio (lo cubren las notas e historial de
Paperless); hacen falta ~400 MB más de memoria; los webhooks perdidos exigen la
reconciliación periódica.

---

## ADR-003 — Formularios: priorizar API y bandeja de revisión sobre la extensión de Chrome

**Date:** 2026-10-02
**Status:** Accepted
**Affects:** `engine/`, `SIGUIENTES-PASOS.md`

**Context.** La investigación de portales en Ecuador mostró que los reembolsos médicos se
piden sobre todo desde apps móviles, y que el cliente más claro no es quien llena un portal,
sino quien recibe los comprobantes (aseguradoras, organizadores de sorteos, cuentas por pagar).

**Decision.** Ofrecer la extracción como API con claves por cliente, más automatización sin
programar y una bandeja de revisión donde una persona revisa solo los campos en amarillo.

**Alternatives considered.**
- Extensión de Chrome que llena portales de terceros: en pausa, porque no sirve en las apps
  móviles y su cliente es menos claro.

**Consequences.** El motor se expuso públicamente con `ENGINE_API_KEYS` y una línea de uso por
extracción. Quedan pendientes la medición de uso para cobrar, los límites y la bandeja de revisión.

---

## ADR-004 — Facturas por correo con un Cloudflare Email Worker en vez de un buzón IMAP

**Date:** 2026-10-06
**Status:** Accepted
**Affects:** `infra/email-worker/`

**Context.** Las facturas llegan por correo y deben entrar a Gestor con el dueño y los
permisos correctos según la dirección de destino.

**Decision.** Cloudflare Email Routing entrega cada correo a un Worker que sube los PDF y las
fotos a la API de Gestor con una etiqueta por dirección (`ROUTES`). Un workflow de Gestor por
etiqueta asigna dueño y permisos. No hay buzón ni contraseñas de correo guardadas en Gestor.

**Alternatives considered.**
- No alternatives formally evaluated (el lector de correo IMAP de paperless era la opción
  implícita; el porqué del rechazo no está registrado más allá de no guardar credenciales de correo).

**Consequences.** Gestor no necesita credenciales de correo y el Worker solo puede añadir
documentos. A cambio, hay un límite de 5 MiB por mensaje, CPU limitada, y Cloudflare Access
delante de Gestor bloquearía al Worker.

---

## ADR-005 — docutecec es un solo producto: el gestor documental con flujos

**Date:** 2026-10-10
**Status:** Accepted
**Affects:** `landing/`, `PRODUCT.md`

**Context.** La landing presentaba Gestor y Formularios como dos productos.

**Decision.** docutecec vende un solo producto, el gestor documental con su motor de flujos.
La extracción (Formularios) se presenta como un paso de un flujo, con Google Sheets como
destino de ejemplo.

**Alternatives considered.**
- No alternatives formally evaluated.

**Consequences.** La landing, la marca y los textos giran alrededor del gestor. La demo
`web/` sigue existiendo como demostración de un paso del flujo, no como oferta aparte.

---

## ADR-006 — El Email Worker reenvía a FALLBACK_EMAIL todo correo que no entra a Gestor

**Date:** 2026-10-11
**Status:** Accepted
**Affects:** `infra/email-worker/src/index.js`, `infra/email-worker/src/logic.js`

**Context.** Un voucher de Datafast enviado a `fact@luis-dev.com` fue rechazado por remitente
no autorizado. `setReject` no guarda el correo y el rebote fue a una dirección no-reply, así
que se perdió sin aviso. El respaldo solo se usaba cuando fallaba la subida a Gestor.

**Decision.** Cualquier correo que no termina en Gestor (remitente no autorizado, sin
adjuntos, dirección sin etiquetas, lista vacía o error al subir) se reenvía completo a
`FALLBACK_EMAIL` con la cabecera `X-Gestor-Motivo`. A Gestor solo entran adjuntos de
remitentes autorizados. Solo se rechaza si `FALLBACK_EMAIL` no está configurado.

**Alternatives considered.**
- Añadir cada remitente nuevo a `ALLOWED_SENDERS`: no evita perder el siguiente correo de un
  remitente desconocido.

**Consequences.** Ningún correo se pierde. El spam que pase SPF/DKIM llega al correo de
respaldo, y cada remitente nuevo hay que autorizarlo a mano para que entre a Gestor.

---

## ADR-007 — El modelo de flujos con n8n no necesita licencia comercial mientras el cliente no toque n8n

**Date:** 2026-10-13
**Status:** Accepted
**Affects:** `gestor/deploy/flows/`, `docs/workflows-exploration.md`, `SIGUIENTES-PASOS.md`, ADR-002

**Context.** ADR-002 dejó pendiente escribir a license@n8n.io antes del primer cliente de
pago, porque operar n8n en nuestra nube y cobrar una mensualidad parecía zona gris de la
Sustainable Use License.

**Decision.** No se pide licencia ni confirmación para el modelo actual. El FAQ oficial
(docs.n8n.io, License FAQ, leído el 2026-10-13) permite construir y mantener flujos para
clientes en nuestras instancias, cobrar por ello y usar n8n por detrás del producto, aunque
el cliente conecte sus propias cuentas, siempre que el cliente no pueda crear ni editar la
lógica de los flujos. Lo que decide es el acceso del cliente, no quién hospeda, cuántos
clientes hay ni cuánto se factura. Ningún cliente recibe acceso al editor de n8n, ni
siquiera si lo pide.

**Alternatives considered.**
- Escribir a license@n8n.io de todos modos: innecesario mientras el FAQ cubra el caso.
- Dar acceso al panel de n8n al cliente que lo pida: rechazado; la edición comunitaria no
  tiene un rol de solo lectura, así que sería alojar n8n y dejar que el cliente construya
  flujos, lo que la licencia prohíbe sin licencia Enterprise.

**Consequences.** El primer cliente de pago no depende de n8n. Hay que consultar a
license@n8n.io antes de: instalar Gestor + n8n en el servidor del cliente como producto
pagado (zona gris según el FAQ), dejar que el cliente configure flujos por cualquier vía
(interfaz propia, API, MCP o un agente) en nuestra nube. En la modalidad "en la cuenta AWS
del cliente" el cliente es el dueño de su n8n y puede entrar al panel y crear sus propios
flujos (uso interno suyo); nosotros cobramos instalación, flujos y administración, nunca
por n8n ni por una licencia que lo incluya, y la cuenta y su factura de AWS son del
cliente (si no, sería hospedaje nuestro). El FAQ llama zona gris a entregar n8n dentro de
un producto pagado en la infraestructura del cliente: confirmar esta modalidad con
license@n8n.io antes del primer cliente que la contrate. El FAQ puede cambiar: revisarlo
antes de cada cambio de modelo.

---
