#!/usr/bin/env bash
# Loads the flows into the n8n of this compose: credentials rendered from .env (and the
# Google service-account file), then every workflows/*.json, then publishes them.
# Idempotent: ids are fixed, so re-running overwrites. Run from gestor/deploy:
#
#   docker compose --profile flows up -d
#   flows/import.sh                       # uses ./.env
#   flows/import.sh --env-file other.env  # local tests
#
# First run only: creates the n8n owner account from N8N_OWNER_EMAIL / N8N_OWNER_PASSWORD
# in .env (n8n needs an owner before anything can be imported).
set -euo pipefail
cd "$(dirname "$0")/.."

env_file=.env
if [[ "${1:-}" == "--env-file" ]]; then env_file="$2"; shift 2; fi
[[ -f "$env_file" ]] || { echo "no $env_file"; exit 1; }
compose=(docker compose --env-file "$env_file" --profile flows)

env_get() { sed -n "s/^$1=//p" "$env_file" | tail -1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"; }
need() { local v; v="$(env_get "$1")"; [[ -n "$v" ]] || { echo "set $1 in $env_file"; exit 1; }; printf '%s' "$v"; }

log() { echo "[flows] $*"; }
n8n() { "${compose[@]}" exec -T -u node n8n n8n "$@"; }
wait_healthy() {
	for _ in $(seq 1 45); do
		"${compose[@]}" exec -T n8n wget -qO- http://localhost:5678/healthz >/dev/null 2>&1 && return 0
		sleep 2
	done
	echo "n8n did not become healthy"; exit 1
}

wait_healthy

# --- owner (first start) ----------------------------------------------------------
owner_email="$(env_get N8N_OWNER_EMAIL)"
owner_password="$(env_get N8N_OWNER_PASSWORD)"
if [[ -n "$owner_email" && -n "$owner_password" ]]; then
	# /rest/owner/setup only works while no owner exists; afterwards n8n answers 400.
	code="$("${compose[@]}" exec -T n8n node -e '
const [email, password] = process.argv.slice(1);
fetch("http://localhost:5678/rest/owner/setup", {method: "POST", headers: {"content-type": "application/json"},
  body: JSON.stringify({email, password, firstName: "Gestor", lastName: "Flujos"})})
  .then(r => { console.log(r.status); }).catch(e => { console.log("ERR " + e.message); });
' "$owner_email" "$owner_password")"
	case "$code" in
		200) log "owner $owner_email created" ;;
		400|403) log "owner already set up" ;;
		*) log "owner setup returned $code"; exit 1 ;;
	esac
fi

# --- credentials -------------------------------------------------------------------
log "credentials"
sa_file="$(env_get GOOGLE_SA_FILE)"
PAPERLESS_FLOWS_TOKEN="$(need PAPERLESS_FLOWS_TOKEN)" \
FLOWS_WEBHOOK_SECRET="$(need FLOWS_WEBHOOK_SECRET)" \
FORMULARIOS_API_KEY="$(env_get FORMULARIOS_API_KEY)" \
GOOGLE_SA_FILE="$sa_file" \
python3 - <<'PY' | "${compose[@]}" exec -T -u node n8n sh -c 'cat >/tmp/credentials.json && n8n import:credentials --input=/tmp/credentials.json; rm -f /tmp/credentials.json'
import json, os, sys
tpl = json.load(open("flows/credentials.template.json", encoding="utf-8"))
values = {k: os.environ.get(k, "") for k in ("PAPERLESS_FLOWS_TOKEN", "FLOWS_WEBHOOK_SECRET", "FORMULARIOS_API_KEY")}
sa = os.environ.get("GOOGLE_SA_FILE")
if sa and os.path.isfile(sa):
    acct = json.load(open(sa, encoding="utf-8"))
    values["GOOGLE_SA_EMAIL"] = acct["client_email"]
    values["GOOGLE_SA_PRIVATE_KEY"] = acct["private_key"]
else:
    values["GOOGLE_SA_EMAIL"] = ""
    values["GOOGLE_SA_PRIVATE_KEY"] = ""
    print("[flows] GOOGLE_SA_FILE not set: Google credential imported empty", file=sys.stderr)
def fill(o):
    if isinstance(o, dict): return {k: fill(v) for k, v in o.items()}
    if isinstance(o, list): return [fill(v) for v in o]
    if isinstance(o, str):
        for k, v in values.items(): o = o.replace("${%s}" % k, v)
    return o
json.dump(fill(tpl), sys.stdout)
PY

# --- workflows ----------------------------------------------------------------------
log "workflows"
n8n import:workflow --separate --input=/flows/workflows
for f in flows/workflows/*.json; do
	id="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["id"])' "$f")"
	n8n publish:workflow --id="$id" >/dev/null && log "published $(basename "$f" .json) ($id)"
done

# The CLI writes to the database; the running server only registers webhooks and
# schedules on startup, so restart it to pick up the new versions.
log "restarting n8n"
"${compose[@]}" restart n8n >/dev/null
wait_healthy
log "done"
