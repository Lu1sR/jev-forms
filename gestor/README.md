# Gestor

Demo of the document manager sold as **Gestor** (gestor.docutecec.com): the official
paperless-ngx image with docutecec branding on top. Nothing of paperless is forked;
the image only adds:

- `branding/templates/`: the app shell (`index.html`) and account pages
  (`paperless-ngx/base.html`) copied from paperless-ngx v3.2.1, with the docutecec
  wordmark, Spanish loader text and `snippets/docutecec_head.html` (favicon, Archivo and
  Chivo Mono, spot-ink theme). Colors mirror `landing/app/globals.css`.
- `branding/logo/docutecec_logo.svg`: white wordmark for the top bar, traced from
  Archivo (wdth 118, wght 800) so it renders without the webfont.
- `custom-cont-init.d/`: copies the logo into `$PAPERLESS_MEDIA_ROOT/logo` on boot,
  since `PAPERLESS_APP_LOGO` must live there.

When bumping the image tag, diff the two templates against the new upstream versions.

## Railway

Services: `gestor` (this folder, root directory `/gestor`), `Postgres`, `Redis`. One
volume on `gestor` mounted at `/data`. Key variables:

```
PAPERLESS_DATA_DIR=/data/data
PAPERLESS_MEDIA_ROOT=/data/media
PAPERLESS_CONSUMPTION_DIR=/data/consume
PAPERLESS_DBENGINE=postgresql            # DBHOST/PORT/NAME/USER/PASS from ${{Postgres.*}}
PAPERLESS_REDIS=${{Redis.REDIS_URL}}
PAPERLESS_APP_TITLE=Gestor
PAPERLESS_APP_LOGO=/logo/docutecec_logo.svg
PAPERLESS_OCR_LANGUAGE=spa
PAPERLESS_TIME_ZONE=America/Guayaquil
PAPERLESS_TASK_WORKERS=1                 # OCR is memory hungry; one worker is enough for a demo
```
