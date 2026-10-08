#!/usr/bin/env bash
# Prints fresh random values for the secrets in .env. Copy them in yourself (locally)
# or into SSM Parameter Store (EC2); they are never written to disk by this script.
set -euo pipefail
rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }
echo "POSTGRES_PASSWORD=$(rand 32)"
echo "PAPERLESS_SECRET_KEY=$(rand 64)"
echo "PAPERLESS_ADMIN_PASSWORD=$(rand 24)"
echo "N8N_DB_PASSWORD=$(rand 32)"
echo "N8N_ENCRYPTION_KEY=$(rand 48)"
echo "FLOWS_WEBHOOK_SECRET=$(rand 40)"
