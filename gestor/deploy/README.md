# Gestor: despliegue de una instancia por cliente

`docker-compose.yml` levanta paperless-ngx (imagen `gestor/` con marca docutecec),
Postgres, Redis (Valkey), Tika y Gotenberg, ajustado para una VM de 2 GB con swap. El
mismo archivo corre en local y en EC2; lo que cambia va en `.env`. Plan completo en
[`../docs/plan-aws.md`](../docs/plan-aws.md).

## Prueba local

```bash
cd gestor/deploy
cp .env.example .env            # PAPERLESS_URL=http://localhost:8000, SMTP_HOST vacío
./gen-secrets.sh >> .env        # y borrar las líneas vacías duplicadas de esos secretos
docker compose up -d --build
open http://localhost:8000      # usuario PAPERLESS_ADMIN_USER / PAPERLESS_ADMIN_PASSWORD
```

## Entrada (perfiles)

| Perfil | Qué hace | Requiere |
|---|---|---|
| ninguno | Solo `127.0.0.1:8000` (prueba local o túnel SSM) | |
| `tunnel` | Cloudflare Tunnel; ningún puerto de entrada abierto | `CLOUDFLARE_TUNNEL_TOKEN`; hostname público → `http://paperless:8000` |
| `caddy` | Caddy + Let's Encrypt en 80/443 | `GESTOR_DOMAIN` con registro A hacia la VM |
| `flows` | n8n junto a paperless: automatizaciones ([`flows/README.md`](flows/README.md)) | VM de 4 GB; secretos `N8N_*`, `FLOWS_*` |

```bash
docker compose --profile tunnel up -d
docker compose --profile tunnel --profile flows up -d     # con automatizaciones
```

## Memoria (VM de 2 GB)

Un solo worker de OCR y un worker web; Postgres con `shared_buffers=64MB`; Valkey con
64 MB; Tika (`-Xmx256m`) y Gotenberg limitados a 700 MB cada uno, con Chromium y
LibreOffice arrancando bajo demanda. En la VM hay además 4 GB de swap.

Medido en local (2026-10-03): ~1.0 GB en reposo; pico ~1.75 GB procesando a la vez una
foto (OCR), un `.docx` y un `.eml` (paperless 960 MB, Gotenberg 480 MB, Tika 260 MB). Con una VM más
grande, subir `GESTOR_TASK_WORKERS` y los límites en `.env`.

## Respaldos

`./backup.sh` (diario por cron en EC2):

1. `pg_dump` → `DATA_ROOT/backups/db/<fecha>.sql.gz` (se guardan `BACKUP_LOCAL_DAYS`);
   con el perfil `flows`, también `<fecha>.n8n.sql.gz` (flujos, credenciales cifradas,
   ejecuciones recientes).
2. `document_exporter -c -d` → `DATA_ROOT/paperless/export` (documentos, PDF/A,
   metadatos, usuarios y configuración; incremental).
3. Con `BACKUP_S3_URI`: sube el dump y sincroniza el export al bucket (versionado).

### Restaurar

En una instancia nueva y vacía con la **misma versión** de la imagen:

```bash
# copiar el export de S3 a DATA_ROOT/paperless/export, luego:
docker compose up -d
docker compose exec -T paperless document_importer ../export
```

El importador avisa "Found existing user(s)" porque el admin se crea al arrancar; es
esperado e importa igual (probado el 2026-10-03: 3 documentos con sus PDF/A).

Alternativa: `gunzip -c <dump>.sql.gz | docker compose exec -T db psql -U paperless -d paperless`
sobre una base vacía, más la carpeta `media/` (snapshot del EBS).

## Seguridad

- SSRF bloqueado (`PAPERLESS_*_ALLOW_INTERNAL_*=false`) para correo, OCR remoto e IA.
  Los webhooks sí pueden llamar a la red interna (`PAPERLESS_WEBHOOKS_ALLOW_INTERNAL_REQUESTS=true`):
  es como Paperless avisa a `n8n`. Solo administradores editan workflows, y en EC2 el
  endpoint de metadatos ya queda fuera de alcance de los contenedores (IMDSv2, hop limit 1).
- n8n no expone puertos: su editor solo se alcanza por `127.0.0.1:5678` (SSM port forwarding).
- Sin usuario demo: `GESTOR_DEMO_*` no se define en producción.
- `.env` nunca se sube a git; en EC2 se genera desde SSM Parameter Store.
