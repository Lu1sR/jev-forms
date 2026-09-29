# Gestor (gestor.docutecec.com): paperless-ngx with docutecec branding. Service on Railway.
# The branded templates are copies of the v3.2.1 originals; re-diff them when bumping the tag.
FROM ghcr.io/paperless-ngx/paperless-ngx:3.2.1

COPY branding/templates/ /usr/src/paperless/src/documents/templates/
COPY branding/logo/ /opt/docutecec/logo/
COPY --chmod=755 custom-cont-init.d/ /custom-cont-init.d/
