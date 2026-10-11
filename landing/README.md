# Landing docutecec.com

Página comercial de **docutecec**, un solo producto: el gestor documental. La página no
nombra paperless-ngx; habla del software como propio. Su característica central es el
motor de flujos, y la extracción de datos (antes "Formularios") se presenta como un paso
de un flujo, con Google Sheets como destino de ejemplo entre varios.

| Demo | Qué muestra | Dominio |
|------|-------------|---------|
| Gestor | El gestor documental, basado en paperless-ngx (`gestor/`) | `gestor.docutecec.com` |
| Extracción | Lectura de un documento en casilleros (`web/` + `engine/`) | `formularios.docutecec.com` |

Todo el contenido de demostración (la factura del hero y el archivo del buscador) es
ficticio y va rotulado como tal. La página no muestra precios, clientes ni cifras.

## Desarrollo

```bash
npm install
npm run dev -- --port 3100
```

## Variables (se fijan en el build)

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número de WhatsApp Business con código de país (`5939XXXXXXXX`). Si está vacío, todos los botones de contacto abren un correo. |
| `NEXT_PUBLIC_SALES_EMAIL` | Correo de ventas (por defecto `contacto@docutecec.com`, que debe existir). |
| `NEXT_PUBLIC_FORMULARIOS_URL` | Demo de Formularios (por defecto `https://formularios.docutecec.com`). |
| `NEXT_PUBLIC_GESTOR_URL` | Demo de Gestor (por defecto `https://gestor.docutecec.com`). |

En Railway van como variables del servicio: el `Dockerfile` las recibe como build args.

## Despliegue y dominios (Railway)

| Dominio | Servicio |
|---------|----------|
| `docutecec.com`, `www.docutecec.com` | `landing` (este directorio, root directory `landing`) |
| `formularios.docutecec.com` | `web` (demo de Formularios) |
| `gestor.docutecec.com` | servicio de paperless-ngx |

En cada servicio: *Settings → Networking → Custom Domain*. Railway entrega un registro
`CNAME` (y un `TXT` de verificación) que se crea en el proveedor del dominio. Para el
dominio raíz `docutecec.com` el proveedor debe admitir `CNAME` flattening o `ALIAS`
(Cloudflare lo hace); si no, apunte `www` al servicio y redirija el raíz a `www`.
