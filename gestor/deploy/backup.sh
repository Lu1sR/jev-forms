#!/usr/bin/env bash
# Daily backup of one Gestor instance. Run from this folder (cron/systemd on EC2).
#
#   1. pg_dump of the database      -> DATA_ROOT/backups/db/<timestamp>.sql.gz
#      (plus <timestamp>.n8n.sql.gz when the flows profile created the n8n database)
#   2. document_exporter (documents, archive PDF/A, metadata, users, settings)
#                                   -> DATA_ROOT/paperless/export (incremental)
#   3. with BACKUP_S3_URI set: upload the dump and sync the export to S3. The bucket
#      is versioned, so files deleted or changed in paperless stay recoverable there.
#
# Restore: `document_importer` on an empty instance of the same paperless version
# (see README), or pg_restore of the dump plus the media folder.
set -euo pipefail
cd "$(dirname "$0")"

# Read only the variables this script needs; .env is compose syntax, not shell.
env_get() { sed -n "s/^$1=//p" .env | tail -1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"; }
DATA_ROOT="$(env_get DATA_ROOT)"
DATA_ROOT="${DATA_ROOT:-./data}"
BACKUP_S3_URI="$(env_get BACKUP_S3_URI)"
BACKUP_LOCAL_DAYS="$(env_get BACKUP_LOCAL_DAYS)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
db_dir="${DATA_ROOT}/backups/db"
mkdir -p "${db_dir}"

log() { echo "[backup ${stamp}] $*"; }
compose() { docker compose "$@"; }

log "pg_dump"
compose exec -T db pg_dump -U paperless -d paperless --format=plain --no-owner \
	| gzip -9 >"${db_dir}/${stamp}.sql.gz.part"
mv "${db_dir}/${stamp}.sql.gz.part" "${db_dir}/${stamp}.sql.gz"

# n8n (flows profile): workflows, credentials (encrypted) and recent executions.
if compose exec -T db psql -U paperless -d paperless -tAc "SELECT 1 FROM pg_database WHERE datname='n8n'" | grep -q 1; then
	log "pg_dump n8n"
	compose exec -T db pg_dump -U paperless -d n8n --format=plain --no-owner \
		| gzip -9 >"${db_dir}/${stamp}.n8n.sql.gz.part"
	mv "${db_dir}/${stamp}.n8n.sql.gz.part" "${db_dir}/${stamp}.n8n.sql.gz"
fi

log "document_exporter"
# -c: only copy files whose checksum changed; -d: drop files no longer in paperless.
compose exec -T paperless document_exporter ../export -c -d --no-progress-bar

if [[ -n "${BACKUP_S3_URI:-}" ]]; then
	log "upload to ${BACKUP_S3_URI}"
	aws s3 cp --only-show-errors "${db_dir}/${stamp}.sql.gz" "${BACKUP_S3_URI%/}/db/${stamp}.sql.gz"
	[[ -f "${db_dir}/${stamp}.n8n.sql.gz" ]] && aws s3 cp --only-show-errors "${db_dir}/${stamp}.n8n.sql.gz" "${BACKUP_S3_URI%/}/db/${stamp}.n8n.sql.gz"
	aws s3 sync --only-show-errors --delete "${DATA_ROOT}/paperless/export/" "${BACKUP_S3_URI%/}/export/"
fi

# Keep only a few local dumps; S3 (or the EBS snapshots) hold the history.
find "${db_dir}" -name '*.sql.gz' -mtime +"${BACKUP_LOCAL_DAYS:-3}" -delete

log "done"
