# Plan: Gestor en AWS (plantilla por cliente)

Estado: borrador acordado el 2026-10-03. Primer cliente: instancia familiar de prueba.

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Producto | Gestor (paperless-ngx con marca docutecec) | Lo que el cliente pidió |
| Cuenta | Proyecto AWS personal `541099636566`, región **us-east-2** | Única región del proyecto |
| Plan AWS | Gratuito (US$100 de créditos, vence 2027-04-03) | Prueba familiar; pasar a pago antes de un cliente real |
| Cómputo | **Una VM EC2 por cliente** con Docker Compose | Aislamiento por cliente, barato, igual que en Railway |
| Tamaño | `t4g.small` (ARM, 2 GB) + 4 GB de swap, con Tika y Gotenberg | Cabe en los créditos; sube a `t4g.medium` cambiando un parámetro |
| IaC | **AWS CDK en Python** (`infra/`) | Reproducible por cliente, extensible |
| Entrada HTTPS | **Cloudflare Tunnel**: cero puertos de entrada en AWS | Sin superficie expuesta; HTTPS de Cloudflare |
| Dominio | `docs.luis-dev.com` (Cloudflare) | Dominio propio del cliente de prueba |
| Correo (SMTP) | **Resend**, remitente `@luis-dev.com` | Gratis 3.000/mes; no SES |
| Idiomas | OCR `spa+eng`, fechas `DMY`, parser `es+en` | Documentos mezclados |
| Landing y demos | Se quedan en Railway | Fuera de alcance |

Todo lo que cambia entre clientes vive en un archivo de configuración por cliente
(`infra/clients/<cliente>.yaml`): tamaño de VM, dominio, idiomas, SMTP, modo de entrada
(`cloudflare-tunnel` o `caddy` para clientes sin Cloudflare), retención de respaldos.

## Arquitectura

```
Usuario ──HTTPS──> Cloudflare (docs.luis-dev.com)
                        │  túnel saliente (sin puertos abiertos)
                        ▼
  VPC us-east-2 · subred pública · Security Group sin entrada
  ┌─────────────── EC2 t4g.small (Amazon Linux 2023, ARM) ───────────────┐
  │ docker compose:                                                     │
  │   cloudflared · paperless (imagen gestor desde ECR) · postgres       │
  │   redis · tika (Xmx 256m) · gotenberg (arranque perezoso)            │
  │ EBS raíz cifrado (SO + swap)   EBS datos cifrado /data (BD + docs)   │
  └──────────────────────────────────────────────────────────────────────┘
        │ rol IAM (sin claves en el servidor)
        ├─> SSM Parameter Store (secretos SecureString, gratis)
        ├─> ECR (imagen gestor arm64)
        ├─> S3 respaldos (cifrado, versionado, sin acceso público, ciclo de vida)
        └─> CloudWatch (logs, alarmas de memoria/disco/estado)
  AWS Backup: snapshot diario del EBS de datos
  Administración: SSM Session Manager (sin SSH)
```

## Costo estimado (us-east-2, mensual)

| Recurso | Aprox. |
|---|---|
| EC2 t4g.small | US$12.3 |
| EBS gp3 (12 GB raíz + 20 GB datos) | US$2.6 |
| IPv4 pública (salida a internet, sin NAT) | US$3.7 |
| Snapshots + S3 + CloudWatch | ~US$1–2 |
| Cloudflare Tunnel, Resend, Parameter Store | US$0 |
| **Total** | **~US$20/mes** → los créditos duran **~5 meses** (hasta ~marzo 2027) |

Riesgo: con el plan gratuito, al agotarse los créditos o vencer el plan, el proyecto se
pausa y puede cerrarse con los datos. Mitigación: presupuesto con alertas al 50/80/100% y
respaldo diario en S3 que se puede descargar. Decidir antes de febrero 2027: pasar a pago
o exportar y apagar.

## Fases

### Fase 1: Gestor listo para producción (repo, local)

- [x] `gestor/deploy/docker-compose.yml`: paperless, postgres, redis, tika, gotenberg,
      cloudflared (perfil `tunnel`) y caddy (perfil `caddy`), con límites de memoria.
- [x] Perfil Ecuador + inglés: `PAPERLESS_OCR_LANGUAGE=spa+eng`, `DATE_ORDER=DMY`,
      `DATE_PARSER_LANGUAGES=es+en`, `ARCHIVE_FILE_GENERATION=always`, `TIME_ZONE=America/Guayaquil`.
- [x] Seguridad: `PAPERLESS_URL`, SSRF interno desactivado, `SECRET_KEY` aleatorio,
      usuario demo apagado (sin `GESTOR_DEMO_*`), admin con contraseña fuerte.
- [x] Ajustes de memoria: `TASK_WORKERS=1`, `THREADS_PER_WORKER=1`, `WEBSERVER_WORKERS=1`,
      Tika `-Xmx256m`, Gotenberg con Chromium/LibreOffice bajo demanda y reinicio cada 5 conversiones.
- [x] SMTP con Resend configurable (`smtp.resend.com`, usuario `resend`, contraseña = API key).
- [x] `backup.sh`: `document_exporter` + `pg_dump` diario → S3.
- [x] Probar completo en local (Mac ARM = misma arquitectura que la VM): OCR spa con tildes y
      fecha DMY, `.docx` y `.eml` vía Tika/Gotenberg, respaldo y restauración en instancia
      nueva. Memoria: ~1.0 GB en reposo, pico ~1.75 GB.
- [ ] SMTP con Resend: probar envío real en la Fase 3 (necesita dominio verificado).

### Fase 2: plantilla CDK (`infra/`)

- [x] Proyecto CDK Python; stack `GestorStack` parametrizado por `infra/clients/<cliente>.yaml`.
- [x] VPC mínima sin NAT, Security Group sin entrada, rol IAM mínimo (SSM, ECR lectura,
      S3 respaldos de ese cliente, Parameter Store de ese cliente, CloudWatch).
- [x] Imagen `gestor/` construida para `linux/arm64` y subida a ECR (`DockerImageAsset`).
- [x] EC2 con user-data: instala Docker, crea swap, conecta y monta `/data`, lee secretos de
      Parameter Store, levanta compose, servicio systemd y timer de respaldo. La VM es
      desechable: un cambio la reemplaza y la nueva toma el mismo disco de datos.
- [x] Bucket S3 de respaldos, plan de AWS Backup, alarmas de CloudWatch, presupuesto.
- [x] `cdk synth` + revisión con cdk-nag (v3): sin hallazgos abiertos; los aceptados están
      justificados en `ACKNOWLEDGEMENTS` de `gestor_stack.py`.

### Fase 3: puesta en marcha de `docs.luis-dev.com`

- [x] Tú: crear el túnel en Cloudflare Zero Trust y guardar el token en Parameter Store.
- [x] Tú: verificar `luis-dev.com` en Resend (registros DNS en Cloudflare).
- [x] `cdk bootstrap` (una vez por proyecto) y `cdk deploy` (con tu aprobación). Desplegado el
      2026-10-04; `https://docs.luis-dev.com` responde. Corregidos tras el primer despliegue: alarmas
      con datos faltantes disparaban RECOVER (reinicio a mitad del arranque) y la política del tema
      SNS impedía publicar a CloudWatch.
- [ ] Crear los 4 usuarios, tipos de documento (Factura, Recibo, Escritura, …) y vistas.
- [ ] **Prueba de restauración**: restaurar un respaldo en una VM temporal y verificar.
- [ ] Opcional: Cloudflare Access como segundo login (ojo: bloquea apps móviles de
      paperless salvo con service tokens).
- [ ] Opcional: regla de correo de paperless para importar facturas electrónicas desde
      un buzón (el XML del SRI no lo lee paperless; el PDF RIDE sí).

### Antes de un cliente real

- [ ] Pasar el proyecto a plan de pago + límite de gasto.
- [ ] Contrato de encargo de tratamiento (LOPDP); informar que los datos están en Ohio, EE. UU.
- [ ] Evaluar `t4g.medium` y retención de respaldos más larga.
- [ ] GPL-3.0: si se entrega la imagen al cliente, entregar el código de `gestor/`.
