# Convenciones

## Idioma y tono

- Documentación, READMEs, mensajes al usuario final y textos de UI en **español**. La
  marca trata de "usted" (la demo `web/` todavía usa "tú" y está pendiente de cambiar).
- Comentarios de código e identificadores en **inglés**. Los comentarios explican el
  porqué, no el qué.
- La landing y el Gestor nunca nombran paperless-ngx ni muestran precios, clientes o
  cifras inventadas (`PRODUCT.md`).

## Flujo de trabajo en git

- Ramas `claude/<tema>` desde `main`, PR en GitHub y merge con commit de merge.
- Asunto del commit: `<área>: <resumen>` (`email-worker:`, `landing:`, `flows:`, `Gestor AWS:`…).
- No hay CI: los tests se corren a mano antes del PR.
- Al cerrar algo que figura en `SIGUIENTES-PASOS.md` o `gestor/docs/plan-aws.md`, marcarlo allí.

## Comandos

| Parte | Test / validación | Otros |
|---|---|---|
| `engine/` | `pytest` | `python evaluate.py` (precisión sobre `engine/samples/`), `MATCHER=heuristic` para correr sin API |
| `web/`, `landing/` | `npm run lint`, `npm run build` (también comprueba tipos) | `npm run dev` |
| `infra/` | `npx aws-cdk@2 synth -c client=familia` (incluye cdk-nag) | `diff` siempre antes de `deploy` |
| `infra/email-worker/` | `npm test` (`node --test`) | `npx wrangler deploy`, `npx wrangler tail` |
| `gestor/deploy/` | `docker compose up -d --build` en local (Mac ARM = arquitectura de la VM) | `gestor/deploy/backup.sh` |

## Patrones del código

- **Configuración:** lo que varía entre clientes va en `infra/clients/<cliente>.yaml`, que se
  valida en `infra/gestor_infra/config.py`; los secretos van a SSM, nunca al YAML. Cada
  servicio trae un `.env.example`; los archivos .env reales están en `.gitignore`.
- **Motor:** la lógica pura está separada por etapa (`engine/app/readers/`, `engine/app/layout.py`, `engine/app/matchers/`,
  `engine/app/extract.py`, `engine/app/validate.py`) y `engine/app/pipeline.py` orquesta. Los errores de la API se devuelven
  como códigos HTTP concretos (400, 404, 413, 415, 502) con `detail` en español.
- **Email Worker:** la lógica pura vive en `infra/email-worker/src/logic.js` y se prueba en
  `infra/email-worker/test/logic.test.js`; `infra/email-worker/src/index.js` solo orquesta.
  Las cabeceras añadidas al reenviar deben ser ASCII de una línea (`headerSafe`).
- **Flujos n8n:** se editan en el editor y se exportan a `gestor/deploy/flows/workflows/`. Los
  ids de flujos y credenciales están fijos en los JSON (importar sobrescribe, no duplica).
  Las credenciales solo existen como `gestor/deploy/flows/credentials.template.json`.
- **CDK:** cada hallazgo de cdk-nag que se acepta lleva su justificación en
  `ACKNOWLEDGEMENTS` (`infra/gestor_infra/gestor_stack.py`).

## Errores típicos del primer PR

- Poner una dirección de correo, un id de hoja privado o un token en el código: el repo es público.
- Crear un recurso AWS fuera de us-east-2, o subir a `t4g.medium` (no lo permite el plan gratuito).
- Cambiar el compose o el bootstrap sin saber que eso reemplaza la VM en el próximo deploy.
- Referenciar etiquetas o campos de Paperless por id en vez de por nombre.
- Editar un flujo en n8n y no exportarlo al repo: el próximo `gestor/deploy/flows/import.sh` lo sobrescribe.
- Rechazar correo en el Worker (`setReject`) en vez de reenviarlo: se pierde sin rastro.
- Subir la versión de paperless-ngx sin comparar las plantillas de `gestor/branding/templates/`.
