#!/bin/bash
# Creates the demo user when GESTOR_DEMO_USER and GESTOR_DEMO_PASSWORD are set (demo
# instances only). Runs after migrations and superuser creation.
set -e
if [[ -z "${GESTOR_DEMO_USER}" || -z "${GESTOR_DEMO_PASSWORD}" ]]; then
	echo "[docutecec] no demo user configured"
	exit 0
fi
cd /usr/src/paperless/src
s6-setuidgid paperless python3 manage.py shell -c "exec(open('/opt/docutecec/scripts/demo_user.py').read())"
