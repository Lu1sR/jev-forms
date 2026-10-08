#!/usr/bin/env bash
# Stores one client's secrets in SSM Parameter Store as SecureString, under
# /gestor/<client>/. Random passwords are generated here and never printed; tokens
# and API keys are read without echo. The Google service-account key is read from a
# file and stored as one line (GOOGLE_SA_JSON); the VM writes it back to a file.
#
#   AWS_PROFILE=luis-developmente-personal ./scripts/put-secrets.sh familia
#   ./scripts/put-secrets.sh familia --set PAPERLESS_FLOWS_TOKEN   # one value, prompted
#   ./scripts/put-secrets.sh familia --rotate N8N_DB_PASSWORD
#
# Re-running keeps existing values unless you pass --rotate NAME. Rotating
# POSTGRES_PASSWORD or N8N_DB_PASSWORD on a live instance breaks it: the database
# keeps the old one. Rotating N8N_ENCRYPTION_KEY makes n8n's stored credentials
# unreadable (re-run flows/import.sh afterwards).
set -euo pipefail
client="${1:?usage: put-secrets.sh <client> [--rotate NAME | --set NAME]}"
mode="${2:-}"
rotate=""; only=""
case "$mode" in
	--rotate) rotate="${3:?name}" ;;
	--set) only="${3:?name}"; rotate="$only" ;;
	"") ;;
	*) echo "unknown option $mode"; exit 1 ;;
esac
region="${AWS_REGION:-us-east-2}"
path="/gestor/${client}"

exists() { aws ssm get-parameter --region "$region" --name "$path/$1" >/dev/null 2>&1; }
put() {
	aws ssm put-parameter --region "$region" --name "$path/$1" --type SecureString \
		--value "$2" --overwrite >/dev/null
	echo "  saved $path/$1"
}
rand() { openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

for name in POSTGRES_PASSWORD:32 PAPERLESS_SECRET_KEY:64 PAPERLESS_ADMIN_PASSWORD:24 \
	N8N_DB_PASSWORD:32 N8N_ENCRYPTION_KEY:48 N8N_OWNER_PASSWORD:24 FLOWS_WEBHOOK_SECRET:40; do
	key="${name%%:*}" len="${name##*:}"
	[[ -n "$only" && "$only" != "$key" ]] && continue
	if exists "$key" && [[ "$rotate" != "$key" ]]; then echo "  kept  $path/$key"; else put "$key" "$(rand "$len")"; fi
done

# Prompted values. PAPERLESS_FLOWS_TOKEN is printed by flows/paperless_setup.py;
# FORMULARIOS_API_KEY is this client's entry in the engine's ENGINE_API_KEYS.
for key in CLOUDFLARE_TUNNEL_TOKEN SMTP_PASSWORD FORMULARIOS_API_KEY PAPERLESS_FLOWS_TOKEN; do
	[[ -n "$only" && "$only" != "$key" ]] && continue
	if exists "$key" && [[ "$rotate" != "$key" ]]; then echo "  kept  $path/$key"; continue; fi
	read -r -s -p "$key (empty to skip): " value; echo
	[[ -n "$value" ]] && put "$key" "$value" || echo "  skipped $key"
done

# Google service account (flows → Sheets): path to the JSON key downloaded from Google Cloud.
if [[ -z "$only" || "$only" == "GOOGLE_SA_JSON" ]]; then
	if exists GOOGLE_SA_JSON && [[ "$rotate" != "GOOGLE_SA_JSON" ]]; then echo "  kept  $path/GOOGLE_SA_JSON"; else
		read -r -p "GOOGLE_SA_JSON: path to the service-account key file (empty to skip): " sa_file
		if [[ -n "$sa_file" ]]; then
			put GOOGLE_SA_JSON "$(python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))))' "$sa_file")"
		else echo "  skipped GOOGLE_SA_JSON"; fi
	fi
fi

echo
echo "Admin password: aws ssm get-parameter --region $region --name $path/PAPERLESS_ADMIN_PASSWORD --with-decryption --query Parameter.Value --output text"
echo "n8n owner:      same command with $path/N8N_OWNER_PASSWORD (user: alerts.email of the client)"
