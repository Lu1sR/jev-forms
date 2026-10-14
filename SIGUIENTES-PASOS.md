# Siguientes pasos para lanzar docutecec

Estado al 2026-10-14: landing en www.docutecec.com, Formularios en
formularios.docutecec.com, demo de Gestor en gestor.docutecec.com y motor público en
formularios-api.docutecec.com, todo en Railway. Gestor de producción en AWS (plantilla por
cliente), primera instancia docs.luis-dev.com con facturas por correo y flujos n8n.

## 1. Urgente: que los contactos lleguen

- [x] **Correo `contacto@docutecec.com`.** Buzón en DonDominio (Hosting y Correo, plan
      Mini), MX `mx01.dondominio.com`, SPF y DMARC `p=none` (2026-10-13).
      Prueba a Gmail con SPF, DKIM (firma de DonDominio, `d=docutecec.com`) y DMARC en PASS.
      SPF cerrado con `~all`. Pendiente: pasar DMARC a `p=quarantine` cuando los informes
      no muestren fallos.
- [x] **WhatsApp Business.** `NEXT_PUBLIC_WHATSAPP_NUMBER=593979241562` en el servicio
      `landing` de Railway (2026-10-13); los botones abren WhatsApp con el mensaje escrito.

## 2. Gestor: de demo a producto

Detalle en `gestor/docs/paperless-ngx-analisis.md`, sección 18.

Resuelto en la plantilla de producción en AWS (`gestor/deploy/` + `infra/`, plan en
`gestor/docs/plan-aws.md`), una VM por cliente. Primera instancia: `docs.luis-dev.com`
(piloto familiar, desde 2026-10-04).

- [x] `PAPERLESS_ARCHIVE_FILE_GENERATION=always` (copia PDF/A también de PDF digitales).
- [x] Servicios Tika + Gotenberg (Word, Excel, correos `.eml`).
- [x] OCR `spa+eng`, fechas `DMY`, parser `es+en`, búsqueda `es`.
- [x] `PAPERLESS_*_ALLOW_INTERNAL_*=false` (protección SSRF).
- [x] Respaldos: snapshot diario del EBS (AWS Backup) + `pg_dump` y `document_exporter`
      diarios a S3 versionado. Restauración probada.
- [x] SMTP con Resend (remitente `@luis-dev.com`).

La demo en Railway (`gestor.docutecec.com`) sigue como demo, sin estos ajustes.

Pendiente en AWS:
- [ ] **Antes de febrero 2027:** el proyecto está en plan gratuito (US$100 de créditos,
      ~US$20/mes, vence 2027-04-03). Pasar a plan de pago o exportar y apagar.
- [ ] Antes de un cliente real: plan de pago + límite de gasto, contrato de encargo de
      tratamiento (LOPDP; datos en us-east-2, Ohio) y limitar la política de ejecución de
      CloudFormation del bootstrap de CDK (hoy `AdministratorAccess`).
- [ ] DMARC de `luis-dev.com` a `p=quarantine` cuando el envío esté estable (hoy `p=none`).
- [x] Facturas por correo con Cloudflare Email Worker (`infra/email-worker/`):
      `facturas@` y `fact@luis-dev.com` entran a Gestor; todo lo que no entra se reenvía a
      `FALLBACK_EMAIL` (ADR-006).
- [x] **Automatizaciones (n8n, `gestor/deploy/flows/`)**: en producción desde el
      2026-10-08. Factura → Formularios → campos en Gestor → fila en Google Sheets, con dos
      hojas (`sheets`, `sheets-luis`). Diseño en `docs/workflows-exploration.md`.
- [ ] Vigilar la memoria de la VM: sigue en `t4g.small` (2 GB) con Tika, Gotenberg y n8n
      porque el plan gratuito no permite `t4g.medium`. Si saltan las alarmas, plan de pago.
- [ ] Segundo flujo: aprobación (bandeja de revisión) con vistas "Por aprobar" en Gestor
      (`docs/workflows-exploration.md`, 5.4).
- [x] Licencia de n8n: el modelo actual (nuestra nube, solo nosotros editamos flujos, el
      cliente nunca entra a n8n) está permitido según el FAQ oficial (2026-10-13, ADR-007).
      Consultar a license@n8n.io solo antes de instalar en el servidor de un cliente o de
      dejar que un cliente configure flujos.

## 3. Formularios: pulir

- [ ] Pasar los textos de la demo de "tú" a "usted", como el resto de la marca.
- [ ] Limitaciones conocidas: dos comprobantes en una foto se mezclan; algunos campos
      de texto guardan la etiqueta impresa.
- [ ] Medir precisión con 20-30 comprobantes reales y variados (térmicos arrugados,
      facturas SRI, precuentas): porcentaje de campos correctos y en verde.

## 3a. Plan de producto de Formularios: API + revisión

Decisión 2026-10-02: priorizar esto sobre la extensión de Chrome. El cliente principal es
quien recibe comprobantes (aseguradoras, marcas con sorteos, cuentas por pagar).

Tres niveles de oferta:
1. **API**: su sistema envía la foto y recibe JSON con el semáforo por campo.
2. **Automatización sin programar**: entrada por correo, WhatsApp o carpeta; salida a
   Excel, Google Sheets o vía Zapier/Make/n8n.
3. **Bandeja de revisión**: una persona revisa solo los campos en amarillo y aprueba.
   Los verdes pasan directo. Es lo que se muestra en la demo y lo que el cliente paga.

Para tener la API como producto:
- [x] Exponer el motor públicamente con claves de API por cliente
      (`formularios-api.docutecec.com`, `ENGINE_API_KEYS`).
- [ ] Medición de uso por cliente para cobrar. Hoy solo hay una línea de log por
      extracción (`jev.usage`); falta guardarla y sumarla por mes.
- [ ] Límites de solicitudes y retención mínima de documentos (protección de datos).
- [ ] Documentación de la API en español, enlazada desde la landing.
- [ ] Validación contra el XML del SRI usando la clave de acceso.
- [ ] Bandeja de revisión: cola de documentos, revisar solo amarillos, aprobar, exportar.
- [ ] Formulario de ejemplo "Reembolso médico" en la demo, junto al de sorteo.

## 3b. Extensión de Chrome: llenar portales externos (en pausa)

Decisión 2026-10-02: no construirla por ahora.

Los clientes llenan la mayoría de formularios en portales de terceros, no en uno nuestro.
La extensión lleva la lectura de Formularios a esos portales, de forma visual.

Investigación de portales en Ecuador (2026-10-02):
- **Reembolsos médicos** (Saludsa, Confiamed, Humana, Ecuasanitas): se piden sobre todo
  desde apps móviles; Confiamed también tiene portal de afiliados y portal de brokers.
  Se adjuntan facturas electrónicas (RIDE con clave de acceso de 49 dígitos, ambiente
  PRODUCCIÓN, datos del paciente) más recetas y órdenes; plazo de 90 días.
- **Promociones y sorteos** (p. ej. Rico Arroz, centros comerciales): el participante
  escribe sus datos y sube la foto de la factura; los datos de la factura no se
  escriben, alguien de la marca los revisa a mano.
- **Portales de proveedores** (Comfiar, Stupendo y otros): reciben facturas
  electrónicas, normalmente como XML.
- Conclusión: el cliente más claro no es quien llena el portal sino **quien lo recibe**
  (aseguradoras, organizadores de promociones, cuentas por pagar), y entre quienes
  llenan, los **brokers y áreas de RR. HH.** que suben muchos reembolsos por web. En las
  apps móviles una extensión no sirve.

- [ ] MVP: la extensión lee los campos del portal abierto, los envía como formulario al
      motor junto con la foto (el motor ya acepta cualquier lista de campos), llena la
      página y marca cada campo en verde/amarillo/vacío. Nunca envía el formulario.
- [ ] Permisos mínimos (`activeTab`, solo al hacer clic), para que TI no la rechace.
- [ ] Portal de demostración ficticio en docutecec para presentar sin depender de un
      portal real.
- [ ] Plantillas por sitio: lo que el usuario corrige se recuerda para ese portal.
- [ ] Facturas electrónicas: validar contra el XML del SRI usando la clave de acceso.
- [ ] Reunir 2-3 portales reales de los pilotos para probar.

## 4. Para vender

- [ ] Precios internos: Formularios (por documento o mensual), Gestor (nube o servidor
      del cliente). No se publican; sirven para cotizar.
- [x] Términos de uso y política de privacidad de la landing y las demos públicas
      (LOPDP, Ecuador 2021) en `docutecec.com/terminos` y `/privacidad`. Borrador propio:
      revisarlo con un abogado antes del primer cliente de pago.
- [ ] Contrato de servicio y de encargo de tratamiento para clientes de pago (Gestor y
      flujos); los términos públicos no los cubren.
- [ ] 2-3 empresas piloto: un mes gratis a cambio de opinión y testimonio.

## 5. Técnico menor

- [x] `https://docutecec.com` (sin www) funciona desde DonDominio (comprobado el 2026-10-13).
- [ ] Watch paths en Railway para `web`, `engine` y `gestor` (hoy cada push a `main`
      reconstruye todo).
- [ ] Google Search Console para docutecec.com.
