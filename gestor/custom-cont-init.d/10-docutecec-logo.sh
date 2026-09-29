#!/bin/bash
# PAPERLESS_APP_LOGO must point inside $PAPERLESS_MEDIA_ROOT/logo, which lives on the
# Railway volume, so the logo is copied there on every boot.
set -e
media_root="${PAPERLESS_MEDIA_ROOT:-/usr/src/paperless/media}"
mkdir -p "${media_root}/logo"
cp /opt/docutecec/logo/* "${media_root}/logo/"
chown -R paperless:paperless "${media_root}/logo"
echo "[docutecec] logo copied to ${media_root}/logo"
