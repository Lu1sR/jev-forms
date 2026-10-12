# jev-forms: contexto del repositorio

Monorepo de **docutecec** (docutecec.com), producto B2B para empresas ecuatorianas: un
gestor documental (paperless-ngx con marca propia, que públicamente nunca se nombra) con
un motor de flujos. La extracción de datos de comprobantes ("Formularios") es un paso de
esos flujos, no un producto aparte. El repo contiene la landing comercial, la demo de
extracción con su motor, la imagen de Gestor y la infraestructura para correr una
instancia de Gestor por cliente en AWS. Hoy el único cliente es un piloto familiar
(`docs.luis-dev.com`); no hay clientes de pago.

## Stack

| Pieza | Tecnología |
|---|---|
| Motor de extracción | Python 3.12, FastAPI, PyMuPDF, RapidOCR; matcher Jev vía OpenRouter |
| Demo y landing | Next.js 16, React 19, TypeScript, Node 22 (build `standalone`) |
| Gestor | imagen oficial `paperless-ngx:3.2.1` + plantillas y logo propios |
| Flujos | n8n 2.43.1 en el mismo compose que paperless |
| Infra por cliente | AWS CDK en Python (cdk-nag), EC2 ARM, Cloudflare Tunnel |
| Correo entrante | Cloudflare Email Worker (JavaScript, `postal-mime`, wrangler) |
| Hosting de demos | Railway (landing, web, engine, demo de Gestor) |

## Mapa del repositorio

| Ruta | Responsabilidad |
|---|---|
| `engine/` | Motor: archivo → líneas → matcher → validación → semáforo verde/amarillo/vacío; API y CLI |
| `engine/app/pipeline.py` | Orquesta lectura, matcher y validación; decide el estado de cada campo |
| `engine/app/matchers/jev.py` | Única integración con Jev; el formato de la petición es inferido |
| `web/` | Demo pública formularios.docutecec.com; `web/app/api/extract/route.ts` es el proxy al motor |
| `landing/` | Página comercial docutecec.com (diseño en `landing/DESIGN.md`) |
| `gestor/` | Imagen de Gestor: paperless-ngx + marca (`gestor/branding/`) |
| `gestor/deploy/` | Compose de producción (paperless, Postgres, Valkey, Tika, Gotenberg, n8n, túnel), respaldos |
| `gestor/deploy/flows/` | Flujos n8n exportados como JSON, `gestor/deploy/flows/paperless_setup.py`, `gestor/deploy/flows/import.sh` |
| `infra/` | Stack CDK `Gestor-<cliente>` y configuración por cliente en `infra/clients/` |
| `infra/email-worker/` | Worker de Cloudflare: correo a `facturas@`/`fact@` → API de Gestor |
| `docs/workflows-exploration.md` | Diseño de los flujos con n8n y estado de implementación |
| `gestor/docs/plan-aws.md` | Plan y decisiones de Gestor en AWS |
| `SIGUIENTES-PASOS.md` | Lista viva de pendientes para el lanzamiento |
| `PRODUCT.md`, `DESIGN.md` | Producto, usuarios, principios y sistema visual de la demo |

## Puntos de entrada

- **Motor**: `uvicorn app.api:app --port 8000` desde `engine/`; en contenedor, `engine/serve.py`.
  CLI: `python cli.py <archivo>`. Tests: `pytest` en `engine/`.
- **Web / landing**: `npm run dev` en cada carpeta (puertos 3200 y 3100 en `.claude/launch.json`).
- **Gestor local**: `docker compose up -d --build` en `gestor/deploy/` (ver su README).
- **Infra**: `npx aws-cdk@2 diff|deploy -c client=familia` desde `infra/`, perfil
  `luis-developmente-personal`, región us-east-2.
- **Email Worker**: `npm test` y `npx wrangler deploy` desde `infra/email-worker/`.
- **Despliegue de demos**: Railway reconstruye cada servicio en cada push a `main`. No hay CI en el repo.

## Otros documentos

- `.context/architecture.md`: componentes, flujos de datos, dependencias externas y los
  puntos delicados. Leer antes de tocar infra, flujos o el Worker.
- `.context/conventions.md`: comandos, estilo y errores típicos del primer PR.
- `.context/decisions.md`: decisiones de arquitectura con su porqué.
