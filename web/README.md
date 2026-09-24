# web

Demo pública: el visitante sube una foto o PDF de un comprobante y ve el formulario
lleno, con cada dato marcado sobre el documento (listo, revisa, no aparece), puede
corregir tocando la línea correcta y llevarse los datos en JSON.

```
app/page.tsx              la demo (una sola página)
app/api/extract/route.ts  proxy al motor: el navegador nunca habla con engine directamente
components/Demo.tsx       flujo completo: subir → leer → marcar → corregir → exportar
components/Sheet.tsx      el documento con el resaltado, llamadas numeradas y marcas
components/FormEditor.tsx plantillas y campos del formulario
lib/templates.ts          plantillas (sorteo, restaurante, reembolso) y formato para el motor
lib/notes.ts              notas del motor → una frase simple por campo
lib/image.ts              reduce fotos grandes en el navegador antes de subirlas
public/samples/           documentos de ejemplo (datos personales difuminados)
```

## Uso local

Con el motor corriendo en `localhost:8000` (ver `engine/README.md`):

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

| Variable | Por defecto | Qué hace |
|----------|-------------|----------|
| `ENGINE_URL` | `http://localhost:8000` | Dónde está el motor (en Railway, su dirección privada) |
| `NEXT_PUBLIC_CONTACT_URL` | (vacía) | Enlace de "Me interesa" / "Escríbenos"; sin ella no se muestran |
