# infra: Gestor en AWS con CDK (Python)

Un stack `Gestor-<cliente>` por cliente, en el proyecto `541099636566`, región
**us-east-2**. Cada stack crea una VM EC2 desechable que corre
[`gestor/deploy/docker-compose.yml`](../gestor/deploy/docker-compose.yml), con todo el
estado en un disco EBS aparte. Plan y decisiones: [`gestor/docs/plan-aws.md`](../gestor/docs/plan-aws.md).

```
clients/<cliente>.yaml     configuración del cliente (tamaño, dominio, idiomas, SMTP, respaldos, alertas)
gestor_infra/config.py     carga y valida el YAML
gestor_infra/gestor_stack.py  el stack
gestor_infra/bootstrap.sh  primer arranque de la VM (user-data)
scripts/put-secrets.sh     guarda los secretos del cliente en SSM Parameter Store
email-worker/              Cloudflare Email Worker: facturas@<dominio> → API de Gestor
```

## Qué crea cada stack

| Recurso | Detalle |
|---|---|
| VPC | 1 subred pública en `az`, sin NAT; security group **sin entrada** (con `ingress: tunnel`) |
| EC2 | Amazon Linux 2023 ARM, IMDSv2 con hop limit 1, disco raíz cifrado, sin SSH ni key pair |
| EBS de datos | Cifrado, `/data`, **se conserva** al borrar el stack |
| S3 de respaldos | Cifrado, versionado, sin acceso público, solo TLS; **se conserva** al borrar el stack |
| AWS Backup | Snapshot diario del EBS de datos (`snapshot_retention_days`) |
| ECR | Imagen `gestor/` para arm64 (repositorio del bootstrap de CDK) |
| Rol IAM | SSM Session Manager, leer `/gestor/<cliente>/*`, escribir `s3://…/gestor/*` sin borrar versiones, conectar solo su volumen |
| CloudWatch | Alarmas: estado de la VM (con recuperación automática), memoria ≥90%, swap ≥50%, disco |
| SNS + Budget | Avisos por correo si `alerts.email` está definido; presupuesto mensual 50/80/100% |

## Cómo se actualiza

Cualquier cambio en el compose, la imagen, el bootstrap o el tamaño de la VM **reemplaza
la VM**: CloudFormation crea la nueva, termina la vieja (que hace `docker compose down`)
y la nueva conecta el mismo disco de datos en cuanto queda libre. Corte de unos minutos.
Siempre `cdk diff` antes de `cdk deploy`.

## Requisitos

- Docker Desktop corriendo (construye la imagen arm64).
- Sesión AWS: `aws login --profile luis-developmente-personal`.
- Python 3.12 y `uv`.

```bash
cd infra
uv venv .venv --python 3.12 && uv pip install -p .venv/bin/python -r requirements.txt
export AWS_PROFILE=luis-developmente-personal
npx aws-cdk@2 synth -c client=familia        # genera la plantilla + cdk-nag, no crea nada
```

## Primer despliegue de un cliente

```bash
npx aws-cdk@2 bootstrap aws://541099636566/us-east-2     # una vez por proyecto
./scripts/put-secrets.sh familia                          # contraseñas + token del túnel + API key de Resend
npx aws-cdk@2 diff   -c client=familia
npx aws-cdk@2 deploy -c client=familia
```

Contraseña del admin: el comando lo imprime `put-secrets.sh`. Consola de la VM:
`aws ssm start-session --target <InstanceId>` (salida `Shell` del stack). Log del
arranque: `/var/log/gestor-bootstrap.log`.

## Nuevo cliente

1. Copiar `clients/familia.yaml` a `clients/<cliente>.yaml` y ajustar.
2. Túnel de Cloudflare (o `ingress: caddy` con registro A hacia la IP elástica).
3. `put-secrets.sh <cliente>` y `deploy -c client=<cliente>`.

Límite: 5 VPC por región (una es la por defecto), así que hasta 4 clientes sin pedir
aumento de cuota.

## Borrar

El stack tiene protección de terminación. Al borrarlo se conservan el disco de datos,
el bucket de respaldos y el vault de AWS Backup (y siguen costando): bórrelos a mano
solo después de descargar lo que haga falta.
