# Gestor: funcionalidades y puntos fuertes

Resumen comercial de **Gestor**, el gestor documental de docutecec basado en paperless-ngx 3.2.1. El detalle técnico y las fuentes están en [paperless-ngx-analisis.md](paperless-ngx-analisis.md).

---

## En una frase

**Todos los documentos de su empresa en un solo lugar: se leen solos, se clasifican solos y se encuentran en segundos.** Los datos quedan en su servidor o en nuestra nube, sin licencia por usuario.

## Para quién

Estudios contables, oficinas administrativas, pymes y profesionales que acumulan facturas, retenciones, contratos, roles de pago, estados de cuenta y correspondencia, en papel y en digital.

---

## Funcionalidades

### 1. Captura desde cualquier lado

- **Arrastrar y soltar** en el navegador, en cualquier parte de la aplicación.
- **Correo:** las facturas que llegan a un buzón (Gmail, Outlook o IMAP) entran solas y clasificadas.
- **Escáner de red:** lo que se escanea a una carpeta aparece en Gestor.
- **Hojas con código de barras** separan un lote escaneado en varios documentos y los etiquetan.
- **Dúplex con escáner de una cara:** el sistema intercala las páginas, así que no hace falta cambiar de equipo.
- **Móvil:** interfaz adaptable, instalable como app (PWA); en iPhone, app de terceros recomendada.
- **API** para que otros sistemas suban documentos.

### 2. Lectura automática (OCR)

- Convierte escaneos y fotos en **PDF con texto buscable y seleccionable**, en español.
- Endereza y rota páginas torcidas.
- Detecta la **fecha del documento** desde su contenido.

### 3. Clasificación automática

- Asigna **proveedor o cliente, tipo de documento y etiquetas** por reglas (palabras, RUC, expresiones) o **aprendiendo** de lo que el usuario ya clasificó.
- **Sugerencias en un clic** en cada documento nuevo.
- **Campos propios:** monto, IVA, RUC, Nº de autorización, fecha de vencimiento, estado de pago, más **enlaces entre documentos** (factura ↔ retención ↔ pago).

### 4. Inteligencia artificial (opcional)

- **Chat con sus documentos:** pregunta "¿Cuándo vence el contrato de arriendo?" y recibe la respuesta **con enlace al documento de origen**.
- **Clasificación con IA desde el primer día**, sin semanas de entrenamiento.
- **Documentos similares**.
- **IA privada:** puede correr en el propio servidor, sin enviar documentos a terceros.

### 5. Búsqueda potente

- Busca **dentro del contenido**, no solo en el nombre del archivo.
- Resalta las coincidencias.
- **Ignora acentos** y **tolera errores de escritura**.
- Filtros por proveedor, tipo, etiqueta, fechas ("trimestre anterior"), montos y campos.
- **Vistas guardadas** como "Facturas por pagar", "Vencen esta semana" o "Inbox sin revisar".

### 6. Automatizaciones (workflows)

- Reglas del tipo **"cuando llegue X, haga Y"**: asignar cliente, etiquetar, dar permisos, renombrar.
- **Recordatorios de vencimiento** por correo, N días antes de la fecha.
- **Quitar la contraseña** a los estados de cuenta bancarios.
- **Avisos a otros sistemas** (webhooks) cuando entra un documento.

### 7. Trabajo diario

- **Edición masiva:** clasifica cientos de documentos a la vez.
- **Editor de PDF:** dividir, unir, rotar y reordenar páginas.
- **Versiones** del mismo documento, por ejemplo borrador → firmado → adenda.
- **Notas internas** por documento.
- **Papelera** con 30 días para recuperar.
- **Detector de duplicados:** la misma factura llegada por correo y por escáner.

### 8. Compartir

- **Enlace público con caducidad**, sin crearle cuenta al destinatario.
- **Paquete ZIP en un solo enlace**, por ejemplo todas las facturas del mes de un cliente.
- Envío por correo desde la aplicación.

### 9. Seguridad y control

- **Usuarios, grupos y permisos por documento:** cada cliente o área ve solo lo suyo.
- **Verificación en dos pasos (2FA)** e **inicio de sesión con Microsoft o Google** (SSO).
- **Historial de cambios:** quién modificó qué y cuándo.
- **Integridad verificada:** los originales nunca se modifican y se revisan semanalmente con huella digital (SHA256).
- **Archivo PDF/A**, el estándar ISO para conservación a largo plazo.

### 10. Sus datos son suyos

- Los documentos se guardan como **archivos normales** con nombres legibles.
- **Exportación completa** (PDF + metadatos) en cualquier momento.
- **Sin licencia por usuario**, a diferencia de DocuWare o M-Files (~25–100 USD por usuario al mes).
- **Interfaz en español** y más de 30 idiomas; modo oscuro.

---

## Puntos fuertes (argumentos de venta)

1. **Madurez y respaldo comunitario.** Es el gestor documental de código abierto más usado del mundo (~46.000 estrellas en GitHub), desarrollado por un equipo desde 2022 y con versiones casi semanales en 2026.
2. **Ahorra horas desde el primer mes.** Lo que antes era archivar, renombrar y buscar carpetas ahora es automático: captura, lectura, clasificación y búsqueda.
3. **Hecho para contadores.** Campos de monto, IVA y RUC, enlaces entre factura, retención y pago, y recordatorios de vencimiento; incluye una plantilla contable ecuatoriana lista para usar.
4. **IA con privacidad.** Chat y clasificación con IA que pueden funcionar **sin sacar documentos de su servidor**.
5. **Conservación y orden para auditorías.** Todo buscable, con historial, integridad verificada y respaldos. Un argumento para cumplir la conservación de 7 años del SRI sin depender del portal.
6. **Costo predecible.** Sin licencias por usuario; se paga el servicio, no los puestos.
7. **Sin atarse al proveedor.** Si se va, se lleva todo en formatos abiertos.
8. **Se integra con Formularios** (docutecec), que lee comprobantes y llena formularios. Juntos pasan del documento a los datos sin digitar.

## Qué agrega docutecec sobre paperless-ngx

| paperless-ngx por sí solo | Gestor de docutecec |
|---|---|
| Hay que instalarlo (Docker, base de datos, HTTPS, correo) | Listo para usar, en nuestra nube o en su servidor |
| Soporte solo comunitario, en inglés | Soporte local en español |
| Respaldos y actualizaciones por cuenta propia | Respaldos diarios y actualizaciones probadas |
| Configuración en blanco | Plantilla contable ecuatoriana precargada |
| Guías técnicas de instalación | Capacitación y guía de usuario en español |
| Sin integración con software local | Integración con Formularios y, a pedido, con su sistema contable |

---

## Preguntas difíciles: respuestas honestas

- **"¿Guarda los XML del SRI?"** Hoy archiva el PDF (RIDE) con todos sus datos. Para el XML, docutecec está definiendo la solución: plugin, versión adjunta o integración con Formularios. *No prometer el XML hasta que esté resuelto.*
- **"¿Tiene flujos de aprobación o firma electrónica?"** No de forma nativa. Se manejan estados con etiquetas y permisos, pero no hay firma ni aprobación formal.
- **"¿Borra documentos automáticamente tras X años?"** No. La conservación la garantiza nuestra política de respaldo.
- **"¿Tiene app móvil?"** No hay app oficial. Hay web instalable en el celular y, en iPhone, una app de terceros que recomendamos.
- **"¿Mis datos salen del país?"** Depende del plan: en su servidor, no; en la nube, según la región contratada. La IA puede ser local.
- **"¿Abre Word y Excel?"** Sí, con el módulo de Office activado.
  - *Pendiente en la demo actual:* Tika + Gotenberg no están desplegados todavía.

## Qué no conviene prometer

- Firma electrónica.
- Aprobaciones formales.
- Retención automática.
- Archivo nativo del XML del SRI (hasta que docutecec lo resuelva).
- Una app móvil propia.
- Que la IA llene montos o RUC. Eso lo hace Formularios, no la IA de Gestor.
- Cumplimiento legal específico (SRI, LOPDP) sin validación de un asesor.
