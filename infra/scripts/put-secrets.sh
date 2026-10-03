#!/usr/bin/env bash
# Stores one client's secrets in SSM Parameter Store as SecureString, under
# /gestor/<client>/. Random passwords are generated here and never printed; the
# Cloudflare tunnel token and the Resend API key are read without echo.
#
#   AWS_PROFILE=luis-developmente-personal ./scripts/put-secrets.sh familia
#
# Re-running keeps existing values unless you pass --rotate NAME. Rotating
# POSTGRES_PASSWORD on a live instance breaks it: the database keeps the old one.
set -euo pipefail
client="${1:?usage: put-secrets.sh <client> [--rotate NAME]}"
rotate="${3:-}"
region="${AWS_REGION:-us-east-2}"
path="/gestor/${client}"

exists() { aws ssm get-parameter --region "$region" --name "$path/$1" >/dev/null 2>&1; }
put() {
	aws ssm put-parameter --region "$region" --name "$path/$1" --type SecureString \
		--value "$2" --overwrite >/dev/null
	echo "  saved $path/$1"
}
rand() { openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

for name in POSTGRES_PASSWORD:32 PAPERLESS_SECRET_KEY:64 PAPERLESS_ADMIN_PASSWORD:24; do
	key="${name%%:*}" len="${name##*:}"
	if exists "$key" && [[ "$rotate" != "$key" ]]; then echo "  kept  $path/$key"; else put "$key" "$(rand "$len")"; fi
done

for key in CLOUDFLARE_TUNNEL_TOKEN SMTP_PASSWORD; do
	if exists "$key" && [[ "$rotate" != "$key" ]]; then echo "  kept  $path/$key"; continue; fi
	read -r -s -p "$key (empty to skip): " value; echo
	[[ -n "$value" ]] && put "$key" "$value" || echo "  skipped $key"
done

echo
echo "Admin password: aws ssm get-parameter --region $region --name $path/PAPERLESS_ADMIN_PASSWORD --with-decryption --query Parameter.Value --output text"
