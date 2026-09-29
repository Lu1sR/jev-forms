# paperless-ngx: análisis funcional completo

Base técnica de **Gestor** (docutecec). Versión analizada: **paperless-ngx 3.2.1** (publicada el 20-sep-2026), la misma que está desplegada en `gestor/`.

**Fuentes**

- Documentación oficial de la etiqueta `v3.2.1`: `index`, `usage`, `advanced_usage`, `configuration`, `administration`, `setup`, `api`, `faq`, `troubleshooting`, `migration-v3` y `changelog`, leídos completos.
- Verificaciones puntuales en el código fuente de `v3.2.1`.
- Fuentes externas: reseñas, guías, ecosistema, comparativas y normativa ecuatoriana. Cada una lleva su URL en la sección 16.

**Convención.** Todo lo que no está marcado lo afirma la documentación oficial o el código. **[Inferencia]** marca una conclusión propia de docutecec. **[Verificar]** marca algo que conviene confirmar antes de prometerlo a un cliente. Los nombres de menús y variables se citan tal como aparecen en el producto, en inglés.

> Este documento no es asesoría legal. Las menciones al SRI y a la LOPDP deben validarse con un abogado o asesor tributario ecuatoriano.

---

## Índice

1. [Qué es y de dónde viene](#1-qué-es-y-de-dónde-viene)
2. [Arquitectura](#2-arquitectura)
3. [Modelo de datos: cómo se organiza un documento](#3-modelo-de-datos-cómo-se-organiza-un-documento)
4. [Captura: cómo entran los documentos](#4-captura-cómo-entran-los-documentos)
5. [OCR, archivo PDF/A y formatos](#5-ocr-archivo-pdfa-y-formatos)
6. [Clasificación automática](#6-clasificación-automática)
7. [Inteligencia artificial (LLM)](#7-inteligencia-artificial-llm)
8. [Workflows (automatizaciones)](#8-workflows-automatizaciones)
9. [Búsqueda](#9-búsqueda)
10. [Trabajo con documentos](#10-trabajo-con-documentos)
11. [Compartir](#11-compartir)
12. [Usuarios, permisos y seguridad](#12-usuarios-permisos-y-seguridad)
13. [API e integraciones](#13-api-e-integraciones)
14. [Operación: despliegue, respaldo, actualización, rendimiento](#14-operación-despliegue-respaldo-actualización-rendimiento)
15. [Ecosistema, comparativas y mercado](#15-ecosistema-comparativas-y-mercado)
16. [Cumplimiento en Ecuador](#16-cumplimiento-en-ecuador)
17. [Limitaciones: lo que NO hace](#17-limitaciones-lo-que-no-hace)
18. [Recomendaciones para Gestor](#18-recomendaciones-para-gestor)
19. [Fuentes](#19-fuentes)

---

## 1. Qué es y de dónde viene

paperless-ngx es un sistema de gestión documental de código abierto. Convierte papel y archivos digitales en un archivo en línea, con búsqueda de texto completo, OCR, clasificación automática y automatizaciones.

**Historia**

| Etapa | Qué pasó |
|---|---|
| Paperless | Creado por Daniel Quinn: v0.3.0 en ene-2017, se detuvo en la v2.7.0 (ene-2019). |
| Paperless-ng | Creado por Jonas Winkler: estable en ene-2021, último commit en sep-2021. Quedó abandonado cuando su único mantenedor se retiró. |
| Paperless-ngx | Fork comunitario de 2022, "drop-in replacement". Pasó a un equipo con áreas separadas (frontend, CI/CD, traducción) para no depender de una sola persona. |

**Indicadores del proyecto (sep-2026)**

- **Licencia:** GPL-3.0.
- **Popularidad:** ~46.200 estrellas y ~3.200 forks en GitHub. Es el gestor documental open source más adoptado, con mucha diferencia sobre Papermerge, Docspell o Mayan.
- **Volumen de publicaciones:** 36 versiones 1.x, 100 versiones 2.x y 12 versiones 3.x.
- **Cadencia de la serie 3.x en 2026:** 3.0.0 el 22-jul, cinco parches hasta el 1-ago, 3.1.0 el 27-ago, tres parches hasta el 4-sep (uno de seguridad), 3.2.0 el 19-sep y 3.2.1 el 20-sep.
- **Volumen de cambios:** la 3.0.0 enumera 360 cambios de aplicación y 160 de dependencias. Entre la 3.0.0 y la 3.2.0 hubo ~1.000 pull requests.
- **Seguridad:** hay divulgación responsable activa. En la serie 2.x se resolvieron 13 avisos GHSA, 12 de ellos en 2.20.x, y en la 3.x hubo varias entradas de endurecimiento.
- **Pila tecnológica:** Python 3.14, Django, Angular 22 y Debian Trixie.
- **Soporte:** solo comunitario (GitHub Discussions y Matrix), sin garantía de que se implementen las funciones pedidas. El propio proyecto se describe como "en gran medida completo en funciones".
  - [Inferencia] Esto es justamente el hueco que cubre docutecec: soporte, operación y adaptación local.
- **Idiomas:** interfaz traducida a más de 30 idiomas vía Crowdin, entre ellos **español**. Ver el anexo B.
- **Demo pública:** demo.paperless-ngx.com.

---

## 2. Arquitectura

| Componente | Función |
|---|---|
| Webserver (Granian, ASGI) | Interfaz web, API REST y admin de Django. |
| Consumer | Vigila la carpeta de consumo. |
| Task processor (Celery) | Consume documentos, descarga correo, mantiene el índice y entrena el clasificador. Procesa en paralelo. |
| Scheduler | Tareas periódicas: correo cada 10 min, entrenamiento cada hora, índice diario, verificación de integridad semanal, papelera diaria, índice de IA diario. |
| Broker | Valkey o Redis (obligatorio). |
| Base de datos | PostgreSQL (recomendado, mínimo 14), MariaDB o SQLite. |
| Opcionales | Apache Tika + Gotenberg (Office y correo .eml), SMTP, proveedor OIDC, backend de IA (Ollama u OpenAI-compatible) y Azure AI (OCR remoto). |

**Motores internos:**

- **Búsqueda:** Tantivy (Rust), desde la v3; antes era Whoosh.
- **Vectores de IA:** sqlite-vec.
- **OCR:** OCRmyPDF + Tesseract.
- **Códigos de barras:** zxing-cpp.

[Inferencia] Todo funciona sin depender de servicios SaaS externos; la IA también puede ser local.

**Requisitos:**

- Docker (recomendado) o bare metal **solo en Linux**. Windows no está soportado.
- CPU x86-64-v2 (SSE4.2) desde v3.
- Imágenes para amd64 y arm64.
- La documentación **no fija requisitos mínimos de hardware**.
- Referencias de la comunidad:
  - ~300 MB de RAM en reposo y 1–2 GB por worker durante el OCR.
  - ~30 páginas/min en un Intel N100 y más de 100 en un Ryzen 5.
  - ~50 GB por cada 10.000 documentos.

---

## 3. Modelo de datos: cómo se organiza un documento

No hay carpetas, a propósito. Cada documento lleva estos metadatos:

| Campo | Qué es | Ejemplo contable |
|---|---|---|
| **Title** | Título, editable o generado por plantilla. | "Factura 001-001-000123 · Proveedor XYZ" |
| **Correspondent** | Quién emite o recibe. | SRI, IESS, Banco Pichincha, Proveedor XYZ |
| **Document type** | Qué es. | Factura, Retención, Nota de crédito, Rol de pagos, Contrato |
| **Tags** | Etiquetas múltiples, jerárquicas desde v2.19 (máx. 5 niveles). | `Clientes › Cliente ABC › 2026 › Declaraciones` |
| **Storage path** | Dónde y con qué nombre se guarda el archivo en disco. | `Cliente ABC/2026/03/Factura_001-001-123.pdf` |
| **Date created** | Fecha del documento, detectada del contenido. | Fecha de emisión |
| **Date added** | Fecha de ingreso al sistema. No se debe cambiar. | — |
| **ASN** | Número de serie para el archivo físico. | Nº del bibliorato |
| **Content** | Texto extraído (OCR). Alimenta la búsqueda y la clasificación. | — |
| **Custom fields** | Metadatos propios tipados. | Ver abajo |
| **Notes** | Comentarios con autor. | "Pendiente firma del gerente" |
| **Owner / permisos** | Dueño y permisos de ver y editar por usuario o grupo. | Solo el grupo "Cliente ABC" |

**Etiquetas jerárquicas.** Al asignar una etiqueta hija se añaden sus padres, y al quitar una etiqueta se quitan sus hijas.

**Tipos de campos personalizados (custom fields)**

| Tipo | Uso típico |
|---|---|
| `Text` / texto largo | Nº de autorización SRI, RUC emisor |
| `Boolean` | ¿Pagada? |
| `Date` | Fecha de vencimiento, fecha de pago |
| `URL` | Enlace al comprobante en el portal |
| `Integer` / `Number` | Nº de cuotas, % de retención |
| `Monetary` | Total, IVA. Código ISO de moneda y 2 decimales, p. ej. `USD115.00`. |
| `Select` | Estado: Pendiente / Pagado / Anulado |
| `Document Link` | Enlaza documentos en ambos sentidos: factura ↔ retención ↔ comprobante de pago. |

**Reglas y límites de los campos:**

- El tipo **no se puede cambiar** después de crear el campo.
- Un mismo campo solo puede asignarse una vez por documento.
- Solo el dueño del documento agrega o quita campos.
- Los campos se asignan desde workflows, en edición masiva y por API, y se filtran con consultas por rango, exacto, contiene, etc.

---

## 4. Captura: cómo entran los documentos

Al ingresar, cada documento pasa por estos pasos:

1. OCR, si no tiene texto.
2. Archivo PDF/A, según la configuración.
3. Clasificación automática.
4. Workflows.
5. Indexado.

**El original se guarda siempre, sin modificar.** Se protege con checksum SHA256.

| Vía | Cómo funciona | Notas |
|---|---|---|
| **Web** | Botón de carga o arrastrar archivos a **cualquier parte** de la aplicación. | La vía más simple en la nube. |
| **Carpeta de consumo** | Carpeta vigilada; el escáner de red deja archivos por SMB, FTP, SFTP o NFS. | Los archivos se **borran** de la carpeta tras procesarlos. Admite subcarpetas (`PAPERLESS_CONSUMER_RECURSIVE`), subcarpetas como etiquetas (`PAPERLESS_CONSUMER_SUBDIRS_AS_TAGS`) y patrones para ignorar (regex). [Inferencia] Es natural on-premise; en la nube requiere un servicio intermedio. |
| **Correo (IMAP)** | Varias cuentas con reglas por cuenta: carpeta, remitente, asunto, patrón de adjunto y antigüedad. Revisa cada 10 min (`PAPERLESS_EMAIL_TASK_CRON`). | Ver el detalle abajo. |
| **API REST** | `POST /api/documents/post_document/`, con metadatos y campos personalizados en la misma llamada. | Asíncrona: devuelve un ID de tarea. |
| **Móvil** | Sin app oficial. Web responsive e instalable (PWA) y apps de terceros (sección 15). | — |
| **Navegador** | Extensiones de terceros "Save to Paperless" (Chrome) y "Send to Paperless-ngx" (Firefox). | — |

**Reglas de correo, en detalle**

- **Acciones sobre el correo:**
  - Marcar como leído (por defecto).
  - Mover a carpeta.
  - Marcar (flag).
  - Borrar.
  - Añadir keyword IMAP.
- **Qué procesa:** adjuntos, el propio correo como documento (.eml, requiere Tika + Gotenberg) o ambos.
- **Autenticación:** OAuth2 para **Gmail y Outlook**. Requiere registrar apps OAuth propias.
- **Controles:**
  - Registro de correos procesados, reprocesable.
  - Opción de dejar de evaluar reglas tras la primera coincidencia.
  - Bloqueo de servidores internos.
- **Cuidado:** la acción se aplica **aunque luego el consumo falle**.
- **Ejemplo:** el buzón `facturas@cliente.com` recibe facturas electrónicas. Una regla por remitente con `*.pdf` asigna corresponsal y etiqueta "Factura recibida" y mueve el correo a "Procesadas".

**Códigos de barras** (solo PDF, o TIFF si se habilita). Admite QR, Code128, Code39, EAN, DataMatrix, PDF417, Aztec y otros.

- **Hoja separadora** (`PATCHT` por defecto): un lote escaneado se divide en varios documentos.
- **ASN** (`ASN00001`): asigna el número de archivo físico. Un ASN duplicado no se consume.
- **Etiquetas por código** (`TAG:factura`): asigna etiquetas y, con `PAPERLESS_CONSUMER_TAG_BARCODE_SPLIT`, también separa. Por ejemplo, 6 páginas con TAG en la 3 y en la 5 dan 3 documentos, cada uno con su etiqueta.
- **Configuración:** desde la interfaz (desde v2.16) o por variables. Hay parámetros de calidad (DPI, upscale, máx. de páginas).

**Dúplex con escáner de una cara.** Se escanean las impares y luego las pares (el lote volteado) en la subcarpeta `double-sided`, dentro de 30 minutos, y el sistema las intercala.

- Viene desactivado por defecto.
- [Inferencia] Argumento: "use el escáner que ya tiene".

**Duplicados (cambio en v3).** Ya **no se rechazan**: se aceptan, se marcan y se revisan en la pestaña **Duplicates**. Desde 3.2.0 hay además un filtro de duplicados en la lista.

- Para rechazarlos, `PAPERLESS_CONSUMER_DELETE_DUPLICATES=true`.
- El comando `document_fuzzy_match` detecta casi-duplicados por contenido.

---

## 5. OCR, archivo PDF/A y formatos

**OCR** (OCRmyPDF + Tesseract, más de 100 idiomas)

- **Idioma:** `PAPERLESS_OCR_LANGUAGE`. El valor por defecto es `eng`, así que **hay que fijar `spa`** o `spa+eng`. La imagen Docker ya trae español, inglés, alemán, francés e italiano.
- **Modos (`PAPERLESS_OCR_MODE`):**
  - `auto` (por defecto): OCR solo si no hay texto.
  - `redo`: rehace capas de texto malas.
  - `force`: rasteriza todo.
  - `off`.
- **Corrección de la imagen:**
  - Enderezado (`DESKEW`) y rotación automática de páginas.
  - Limpieza con unpaper.
  - OCR solo de las primeras N páginas.
  - Límites de píxeles, como protección anti-DoS.
- **OCR remoto (opcional):** **Azure AI Document Intelligence**, de pago. Puede aplicarse a todo o solo a los documentos que un workflow indique (`workflow_only`). Útil para manuscritos o escaneos malos.
- **Fechas:**
  - Orden `DMY` por defecto, correcto para Ecuador.
  - Idiomas del detector de fechas.
  - Fechas a ignorar.
  - Hasta N fechas sugeridas.
  - **Advertencia:** la fecha detectada puede fallar si el OCR es malo o hay varias fechas en el documento.

**Archivo a largo plazo**

- **Formato de salida:** PDF/A-2b por defecto (`PAPERLESS_OCR_OUTPUT_TYPE`; también `pdfa-1` y `pdfa-3`), con texto seleccionable, guardado **junto** al original.
- **Cambio en v3:** `PAPERLESS_ARCHIVE_FILE_GENERATION=auto` (por defecto) **no genera PDF/A para PDFs digitales que ya tienen texto**. Si se vende "archivo a largo plazo", fijar `always`.
- **Verificación de integridad:** un proceso semanal (`document_sanity_checker`) detecta originales faltantes, **corrupción por checksum**, archivos huérfanos y documentos sin contenido.

**Formatos admitidos (verificado en el código v3.2.1)**

| Grupo | Formatos | Requisito |
|---|---|---|
| PDF e imágenes (con OCR) | PDF, PNG, JPEG, TIFF, GIF, WebP, BMP, HEIC | Ninguno |
| Texto | TXT, CSV | Ninguno |
| Office / LibreOffice | DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT, ODS, ODP, ODG, RTF | Tika + Gotenberg |
| Correo | EML | Tika + Gotenberg |
| **XML** | **No admitido de forma nativa** | Plugin de parser de terceros o conversión previa |

> **Importante para Ecuador:** los comprobantes electrónicos del SRI son XML (con el PDF RIDE aparte). Hoy Gestor puede archivar el RIDE, pero **no el XML** tal cual. Ver las opciones en la sección 18.

---

## 6. Clasificación automática

Cada corresponsal, tipo, etiqueta y ruta de almacenamiento tiene un algoritmo de coincidencia:

| Algoritmo | Cómo funciona | Ejemplo |
|---|---|---|
| None | No asigna nada. | — |
| Any | Cualquiera de las palabras. Las frases van entre comillas. | `"Servicio de Rentas Internas" SRI` |
| All | Todas las palabras, en cualquier orden. | — |
| Exact | Cadena exacta. | `Instituto Ecuatoriano de Seguridad Social` |
| Regular expression | Expresión regular. | RUC `1790012345001`; `COMPROBANTE DE RETENCI[OÓ]N` |
| Fuzzy | Coincidencia aproximada (RapidFuzz). | Nombres con errores de OCR |
| **Auto** | Red neuronal que **aprende de los documentos ya revisados**. | Proveedores recurrentes |

**Auto** se reentrena cada hora y solo aprende de documentos **sin** etiqueta de bandeja de entrada.

- Necesita volumen y ejemplos positivos y negativos.
- Etiquetas sin relación con el texto, como "TODO", no se pueden aprender.
- Desde 3.2.0 es más preciso: se eliminó un sesgo y hay un umbral mínimo (`PAPERLESS_CLASSIFIER_MATCH_THRESHOLD`).
- También usa menos memoria y aplica stemming y stopwords en **español**.

**Sugerencias (sin LLM).** En el detalle de un documento el modelo local sugiere etiquetas, corresponsal, tipo y ruta, y el usuario acepta o rechaza.

- **No envía datos a ningún lado.**
- Se piden solas al abrir un documento de la bandeja de entrada, o con el botón **Suggest**.

**Reclasificar lo existente.** `document_retagger` reaplica las reglas a documentos viejos.

---

## 7. Inteligencia artificial (LLM)

Es nuevo en v3 y viene **desactivado por defecto**. Se activa con `PAPERLESS_AI_ENABLED`, o en **Settings → Application Configuration** (lo que se fije allí prevalece sobre las variables).

| Función | Qué hace |
|---|---|
| **Sugerencias con IA** | Un LLM propone título, fechas, etiquetas, corresponsal, tipo y ruta. Desde 3.1 **prefiere objetos que ya existen** en lugar de inventar nuevos. |
| **Chat con documentos** | Botón en la barra superior. Pregunta sobre un documento o sobre varios según la vista, y **las respuestas enlazan los documentos fuente**. Respeta permisos: [Inferencia] un usuario solo consulta lo que puede ver. |
| **Índice RAG y similares** | Índice vectorial (embeddings) para respuestas con contexto y "documentos similares". Se actualiza a diario. |
| **Workflow "Apply AI Suggestions"** (3.1) | Clasifica automáticamente en lote. Opcionalmente crea etiquetas, corresponsales o tipos faltantes; las rutas nunca se crean solas. Corre en segundo plano y omite los documentos sin texto. |

**Backends**

- **Chat y sugerencias:** `ollama` (local) u `openai-like` (OpenAI o cualquier API compatible). El modelo es configurable; los valores por defecto son `llama3.1` y `gpt-3.5-turbo`.
- **Embeddings:** `huggingface` (100 % local; descarga el modelo la primera vez), `ollama` u `openai-like`.
- **Idioma de las respuestas:** `PAPERLESS_AI_LLM_OUTPUT_LANGUAGE`; si no se fija, usa el idioma del usuario.
- **Seguridad:** `PAPERLESS_AI_LLM_ALLOW_INTERNAL_ENDPOINTS` bloquea endpoints internos (SSRF).

**Límites**

- Con un backend remoto, **el contenido de los documentos sale del servidor** y el uso puede tener costo.
- La documentación **no dice que la IA llene campos personalizados** (monto, RUC, IVA). Solo cubre título, fechas y clasificación.
- La precisión numérica del chat no está garantizada. [Inferencia] Sirve para orientar, no para reemplazar el cálculo contable.
- [Inferencia] Con Ollama, "IA sin que los documentos salgan de su servidor" es un argumento fuerte frente a la LOPDP. Requiere hardware, idealmente con GPU.

---

## 8. Workflows (automatizaciones)

Los workflows están desde v2.3. Se aplican **en orden**: en campos simples gana el último, y en los multivalor (etiquetas, campos, permisos) se suman.

**Disparadores**

1. **Consumption Started**: antes de procesar. Filtra por fuente (carpeta, API/web, correo), ruta, nombre de archivo y regla de correo.
2. **Document Added**: después de procesar. Filtra por contenido y por los metadatos ya asignados.
3. **Document Updated**: al modificar un documento.
4. **Scheduled**: programado respecto a una fecha (added, created, updated o **un campo de fecha personalizado**), con desfase en días positivo o negativo. Se evalúa cada hora.

**Filtros avanzados** (desde 2.19): con alguna / todas / ninguna etiqueta, por tipo o corresponsal (incluidos o excluidos), por ruta y por consulta de campos personalizados.

**Acciones**

| Acción | Uso |
|---|---|
| **Assignment** | Asigna título (plantilla Jinja), etiquetas, corresponsal, tipo, ruta, dueño, permisos de ver o editar y campos con valor. |
| **Removal** | Quita cualquiera de los anteriores. |
| **Email** | Envía correo con asunto y cuerpo con variables; puede adjuntar el documento. |
| **Webhook** | POST a una URL con cuerpo JSON o formulario, cabeceras y variables. Se puede restringir a esquemas o puertos y bloquear IPs internas. |
| **Move to Trash** | Descarta automáticamente. |
| **Password Removal** | Quita la contraseña de PDFs protegidos, probando una lista de claves. Guarda el resultado **como nueva versión**, sin tocar el original. |
| **Remote OCR** | Envía el documento a Azure AI. |
| **Apply AI Suggestions** | Clasificación automática con LLM. |

**Variables de plantilla:** `{{correspondent}}`, `{{document_type}}`, `{{owner_username}}`, `{{created_year}}`, `{{created_month_name}}`, `{{added}}`, `{{original_filename}}`, `{{doc_url}}` y `{{doc_id}}`. También admiten filtros Jinja, por ejemplo `localize_date`.

**Ejemplos listos para una oficina contable**

- **Recordatorio de vencimiento:** Scheduled sobre el campo "Fecha de vencimiento" con −5 días, más un Email a contabilidad con `{{doc_url}}`.
- **Separación por cliente:** Consumption Started con la ruta `*/cliente-ABC/*` asigna dueño, la etiqueta "Cliente ABC" y vista para el grupo "Contadores".
- **Estados de cuenta cifrados:** Password Removal con la clave que usa el banco.
- **Integración:** Document Added con tipo "Factura" dispara un Webhook a n8n o al sistema contable.
- **Título automático:** `{{correspondent}} - {{document_type}} - {{created_year}}-{{created_month}}`.

**Cuidado:** los workflows **no tienen permisos por objeto**. Quien tiene el permiso Workflow ve y edita todos, así que no se debe dar a clientes finales.

---

## 9. Búsqueda

**Búsqueda global** (barra superior). Busca documentos, etiquetas, workflows y otros objetos, siempre respetando permisos.

**Texto completo** (Tantivy, desde v3)

- Busca en contenido, título, corresponsal, tipo y etiquetas.
- Ordena por relevancia, **resalta las coincidencias** y autocompleta.
- **Ignora acentos** (`cafe` encuentra `café`) y **separadores** (`1312` encuentra `A-1312/B`).
- Búsqueda **difusa**, tolerante a errores de escritura (desde 3.2.0), activable con `PAPERLESS_ADVANCED_FUZZY_SEARCH_THRESHOLD`.
- **"More like this"** encuentra documentos similares.
- Stemming en español con `PAPERLESS_SEARCH_LANGUAGE=es`.

**Sintaxis avanzada**

- `AND`, `OR`, `NOT`, paréntesis y frases entre comillas.
- **Campos:** `title:`, `correspondent:`, `type:`, `tag:`, `asn:`, `created:`, `added:`, `page_count:`, `checksum:`, `notes.note:` y `custom_fields.value:`.
- **Rangos:** `created:[2026-01 to 2026-03]`, `asn:[50 to 150]`.
- **Fechas relativas:** `created:"previous quarter"`, `added:[-1 week to now]`.
- **Ejemplos:**
  - `type:factura correspondent:"proveedor xyz" created:[2026-01 to 2026-03]`
  - `tag:por-pagar NOT tag:anulada`
  - `created:"previous quarter" type:retencion`
- **Trampas:**
  - Las palabras clave están en inglés (`previous month`, `this year`).
  - `-término` **no** excluye; hay que usar `NOT`.
  - Las notas y los campos personalizados necesitan su prefijo.

**Filtros de lista.** Hay filtros visuales por etiquetas, corresponsales, tipos, rutas, fechas relativas, campos personalizados, tipo de archivo, compartidos y duplicados. Se combinan y se guardan como **vistas guardadas**.

---

## 10. Trabajo con documentos

**Interfaz**

- **Dashboard** con estadísticas y vistas guardadas.
- **Lista de documentos** en tres estilos: tabla, tarjetas pequeñas y grandes.
- **Detalle** con el visor PDF al lado de los metadatos, editable.
- Barra lateral "slim", elementos de la barra ocultables y **modo oscuro**.
- **Atajos de teclado** (`Shift+?`), tour guiado e interfaz **responsive** para móvil.
- **Actualización en vivo:** los cambios de otros usuarios se ven sin recargar.
- Cada usuario elige qué campos se ven en el detalle.

**Vistas guardadas**

- Son "archivadores" dinámicos, por ejemplo "Facturas por pagar", "Inbox sin revisar" o "Vencen esta semana".
- Se muestran en el dashboard o en la barra lateral, con iconos propios.
- Desde v3 se pueden **compartir entre usuarios**.

**Edición masiva.** Selecciona varios documentos y asigna etiquetas, corresponsal, tipo, ruta, campos personalizados y permisos; también borra, reprocesa, fusiona o rota.

**Editor de PDF** (desde 2.18; solo PDF)

- Dividir, unir, rotar, reordenar y borrar páginas.
- **Rotar o borrar páginas modifica el archivo original**, lo que invalidaría una firma electrónica.
- [Inferencia] No usarlo sobre contratos o comprobantes firmados.

**Versiones de archivo** (nuevo en v3)

- Varias versiones del archivo bajo un mismo documento, con metadatos compartidos. Cada versión conserva su propio texto y checksum.
- **Merge as versions** (3.1) convierte documentos existentes en versiones de uno raíz. No se puede deshacer desde la interfaz, y los fusionados pierden su ASN.
- Ejemplo: borrador → contrato firmado → adenda, o declaración original → sustitutiva.

**Historial / auditoría**

- La pestaña **History** muestra quién cambió qué y cuándo (audit log, activo por defecto).
- Los cambios hechos por workflows aparecen con el actor "System".
- [Verificar] La documentación habla de "cambios"; no indica que registre lecturas ni descargas.

**Notas.** Comentarios por documento con autor, buscables con `notes.note:`.

**Papelera**

- Borrar es reversible durante **30 días** (`PAPERLESS_EMPTY_TRASH_DELAY`).
- Opcionalmente, al vaciar, los originales se mueven a una carpeta en lugar de borrarse (`PAPERLESS_EMPTY_TRASH_DIR`).

**Otros:** botón de imprimir y descarga del original o del archivo PDF/A.

---

## 11. Compartir

| Mecanismo | Detalle |
|---|---|
| **Share links** | Enlace público `…/share/{slug}` **sin necesidad de cuenta**, con caducidad opcional. Solo el dueño del documento puede crearlos. |
| **Share link bundles** (v3) | Varios documentos en **un solo enlace ZIP**, preparado en segundo plano. |
| **Gestión centralizada** (3.2) | Pantalla única para ver, reintentar o revocar todos los enlaces y paquetes. |
| **Enviar por email** | Botón **Send → Email**, también para varios documentos. Requiere SMTP. |
| **Entre usuarios** | Mediante permisos (sección 12). |

**Ejemplo:** a fin de mes el contador envía al cliente un único enlace ZIP con todas sus facturas, que caduca en 7 días, sin crearle una cuenta.

---

## 12. Usuarios, permisos y seguridad

**Modelo de permisos**

- **Globales:** qué secciones y acciones puede usar cada usuario (documentos, etiquetas, workflows, correo, configuración, estadísticas, estado del sistema…).
- **Por objeto:** cada documento, etiqueta, corresponsal, etc. tiene **dueño** y permisos de **ver** y **editar** por usuario o grupo.
  - Sin permiso de ver, el nombre aparece como "Private".
  - Solo el dueño concede permisos, crea enlaces públicos y maneja los campos del documento.
- **Grupos** con herencia de permisos. Hay permisos por defecto configurables para objetos nuevos.
- **Superusuario:** acceso total; solo otro superusuario lo otorga. **Staff:** logs, estado del sistema y admin de Django.
- **Cuidado:** los documentos que entran por la **carpeta de consumo no tienen dueño**, así que los ve todo el mundo salvo que un workflow asigne uno.

**Autenticación**

- Usuario y contraseña, con **restablecimiento por correo** (requiere SMTP).
- **2FA / TOTP** desde "My Profile", con 10 códigos de recuperación. Un superusuario puede desactivarlo a otro usuario.
  - Con MFA activa, se desactiva la autenticación básica de la API.
  - [Verificar] La documentación no indica que pueda **forzarse** 2FA para todos.
- **SSO** (django-allauth): OIDC y proveedores sociales. [Inferencia] Esto incluye Microsoft Entra ID, Google Workspace, Keycloak y Authentik.
  - **Sincronización de grupos** y de roles admin/staff desde el proveedor de identidad (3.1).
  - Se puede ocultar el login local o redirigir directo a SSO.
- **Remote-User:** autenticación por cabecera detrás de un proxy (Authelia, Authentik). Es peligroso si el proxy está mal configurado.
- **Sesiones:** 2 semanas por defecto, configurable.
- **Anti fuerza bruta:** el endpoint de token de la API está limitado a `5/min`.

**Endurecimiento**

- `PAPERLESS_SECRET_KEY` obligatoria y `PAPERLESS_ALLOWED_HOSTS` (por defecto `*`, hay que fijarlo).
- Tareas Celery firmadas.
- Protección SSRF configurable para webhooks, correo, IA y OCR remoto.
- Validación de SVG y logos.
- Registro de cuentas desactivado por defecto.
- **HTTPS no viene incluido**: lo pone el proxy o la plataforma (Railway, nginx, Traefik, Caddy).

**Cifrado**

- **v3 eliminó el cifrado de documentos a nivel de aplicación.**
- El cifrado en reposo se resuelve en el disco o volumen del servidor.
- La exportación con `--passphrase` cifra solo "ciertos campos".

---

## 13. API e integraciones

**API REST completa**

- Todo lo que hace la interfaz se puede hacer por API.
- Tiene explorador interactivo OpenAPI en `/api/schema/view/`.
- **Versionado:** se elige con la cabecera `Accept: application/json; version=10` (se soportan la 9 y la 10). Cada versión anterior se mantiene al menos 1 año.

**Autenticación**

- Basic, sesión o **Token** (`Authorization: Token …`, generado en "My Profile" o con `POST /api/token/`).
- Remote-User y OIDC "headless" (`api/auth/`).
- [Verificar] Los tokens no tienen alcances ni caducidad documentados.

**Operaciones clave**

| Operación | Endpoint |
|---|---|
| Subir documento | `POST /api/documents/post_document/` con título, fecha, corresponsal, tipo, ruta, etiquetas, ASN y `custom_fields`. Devuelve un UUID de tarea que se consulta en `/api/tasks/?task_id=`. |
| Buscar | `/api/documents/?query=…` (texto completo), `?text=` (título y contenido), `?more_like_id=` y `custom_field_query=` con exacto, contiene, rango, mayor/menor y OR/AND. Devuelve puntuación y resaltado. |
| Editar en lote | `POST /api/documents/bulk_edit/`: etiquetas, corresponsal, tipo, ruta, borrar, reprocesar, permisos y `modify_custom_fields`. |
| Versiones | `update_version`, `merge_as_versions`, borrar o renombrar versiones. |
| PDF | Endpoints propios para merge, rotate y edit_pdf (v10). |
| Autocompletar | `/api/search/autocomplete/`. |
| Tareas | `/api/tasks/` paginado, resumen y conteos. |

**Ganchos de integración**

- **Scripts pre y post consumo:** `PAPERLESS_PRE_CONSUME_SCRIPT` y `PAPERLESS_POST_CONSUME_SCRIPT`.
  - El script post-consumo recibe `DOCUMENT_ID`, `DOCUMENT_DOWNLOAD_URL`, las etiquetas, el corresponsal, etc.
  - Son **bloqueantes**, así que el trabajo lento debe lanzarse en segundo plano.
- **Webhooks de workflows:** notifican a sistemas externos (n8n, Zapier, un ERP). No hay un endpoint de "suscripción" a webhooks; se configuran como acciones.
- **Plugins de parsers** (v3): paquetes Python que añaden formatos de archivo. No tienen soporte oficial.
  - [Inferencia] Es la vía para soportar XML del SRI.
- **Plantillas de nombre de archivo con Jinja:** `{{ correspondent }}/{{ created_year }}/{{ created_month }}/{{ document_type }}_{{ custom_fields|get_cf_value('Número de factura','s-n') }}`.
- **Home Assistant:** integración oficial. **Clientes de API:** PyPaperless (Python) y paperless-rs (Rust).
- **Monitoreo:** Flower para la cola Celery y métricas Prometheus.

**Flujo con el extractor de Formularios** [Inferencia]:

1. Gestor recibe la factura.
2. El script post-consumo, o un webhook, avisa al motor de docutecec.
3. El motor extrae RUC, autorización, subtotal, IVA y total.
4. El motor escribe esos datos de vuelta en campos personalizados con `PATCH /api/documents/{id}/`.
5. El proceso inverso también funciona: Formularios sube el documento con los campos ya llenos vía `post_document`.

---

## 14. Operación: despliegue, respaldo, actualización, rendimiento

**Configuración**

- Todo se configura por variables de entorno. Algunas opciones de OCR y de la interfaz también se cambian desde **Application Configuration**, y esas **prevalecen** sobre las variables.
- El permiso `AppConfig` es de administrador.
- Admite Docker secrets con el sufijo `_FILE`.

**Despliegue**

- **Rutas:** script de instalación, plantillas Docker Compose (sqlite, postgres o mariadb, con o sin Tika) o bare metal.
- **Imagen oficial:** `ghcr.io/paperless-ngx/paperless-ngx`. Admite imagen personalizada, como hace Gestor.
- **Varias instancias** pueden compartir infraestructura con `PAPERLESS_REDIS_PREFIX`, `PAPERLESS_COOKIE_PREFIX` y una base de datos por instancia.

**Rendimiento**

- `PAPERLESS_TASK_WORKERS` × `PAPERLESS_THREADS_PER_WORKER` no debe superar los núcleos disponibles.
- `PAPERLESS_WEBSERVER_WORKERS`.
- Caché de lecturas en Redis. **Cuidado:** tras restaurar hay que ejecutar `invalidate_cachalot`.
- Pool de conexiones PostgreSQL.
- Existe una lista oficial de ajustes para equipos modestos.
- [Inferencia] Escala vertical por instancia; el escalado horizontal no está documentado.

**Respaldo**

- `document_exporter` exporta documentos, miniaturas, metadatos y la configuración completa.
  - Es **incremental**, así que funciona con `rsync`.
  - Admite zip con zstd y exportación de solo datos.
  - Borra del destino lo que se eliminó del sistema.
  - No exporta los tokens de API.
- `document_importer` restaura, pero **solo en una instancia vacía y de la misma versión**. Hay que anotar la versión con cada respaldo.
- La documentación presenta el exportador explícitamente como la vía para **llevarse los documentos a otro sistema**.

**Sin dependencia del proveedor (lock-in)**

- Los originales se guardan como archivos normales, sin modificar, con checksum.
- Los nombres son legibles y configurables (`PAPERLESS_FILENAME_FORMAT`).
- La exportación es PDF + JSON.

**Actualización**

- Docker: `pull` + `up`. Las migraciones se aplican solas y el índice se reconstruye si hace falta.
- Recomendado: fijar la versión exacta y respaldar antes de actualizar.
- A v3 solo se llega desde 2.20.15, con cambios incompatibles.

**Comandos de mantenimiento**

- `document_sanity_checker`: integridad.
- `document_retagger`: reclasificar.
- `document_index reindex`.
- `document_llmindex rebuild`.
- `document_thumbnails`.
- `document_archiver`: generar PDF/A retroactivamente.
- `document_renamer`.
- `document_fuzzy_match`.
- `mail_fetcher`.
- `createsuperuser`: también sirve para recuperar el acceso si SSO lo bloquea.

**Problemas conocidos (troubleshooting)**

- SQLite con varios workers da errores "db locked"; hay que usar PostgreSQL.
- Carpetas NFS o SMB sin inotify necesitan `PAPERLESS_CONSUMER_POLLING_INTERVAL`.
- Escáneres que reescriben el archivo necesitan subir `PAPERLESS_CONSUMER_STABILITY_DELAY`.
- Un OCR malo suele deberse a que falta el paquete de idioma.
- Gotenberg da 504 con Office grandes porque su timeout es de 30 s.
- El clasificador sin datos de entrenamiento no ha visto aún documentos revisados.
- `PAPERLESS_SOCIAL_ACCOUNT_SYNC_SUPERUSER_GROUP` puede dejar sin admin.
- `PAPERLESS_DISABLE_REGULAR_LOGIN` no cierra `/admin/` ni la API.

---

## 15. Ecosistema, comparativas y mercado

**Apps móviles (ninguna oficial; el proyecto no da soporte a terceros)**

- **iOS:**
  - **Swift Paperless** es el estándar de facto: cámara, compartir y Face ID.
  - También Paperless Go y Less Paper.
- **Android:**
  - Paperless Mobile **sin mantenimiento**.
  - Paperless Share y Paperless-NGX Uploader para "compartir para subir".
  - Lo más fiable es la **web instalada como PWA**.

**Escáneres.** Cualquiera que escriba en SMB, FTP, SFTP o NFS, o que envíe por correo.

- La comunidad cita Brother ADS-1700W, ADS-2800W y ADS-1800W, y Fujitsu ScanSnap iX1600.
- [Inferencia] docutecec debería homologar modelos disponibles en Ecuador.

**Herramientas de IA complementarias:** paperless-gpt y paperless-ai. [Inferencia] La IA nativa de v3 las vuelve menos necesarias.

**Frente a otros open source**

| Sistema | Fortaleza | Frente a paperless-ngx |
|---|---|---|
| **paperless-ngx** | El más adoptado; comunidad y ecosistema mayores; auto-etiquetado; Docker sencillo. | No es un ECM empresarial. |
| Mayan EDMS | Gobernanza, verificación de firmas, workflows de negocio. | Más pesado y complejo. |
| Docspell | Extracción de datos (montos, fechas). | Menor adopción; interfaz menos pulida. |
| Papermerge | Carpetas estilo escritorio. | Comunidad menor. |
| Teedy | Orientado a equipos. | Menor madurez. |

**Frente a comerciales**

- DocuWare y M-Files cuestan ~25–100 USD por usuario al mes. paperless-ngx **no tiene licencia por usuario**.
- Los comerciales le ganan en aprobaciones, firma, retención y cumplimiento formal.

**Hosting gestionado de paperless en el exterior (referencia de precios)**

| Proveedor | Precio mensual |
|---|---|
| Hostinger (VPS) | desde 6,49 USD |
| Sliplane | 9 EUR |
| Elestio | desde 16 USD |
| Apertus | 25–50 EUR |
| Cloudshift (DE) | 29–69 EUR |
| **Node Digital (UK)** | **desde 45 GBP** |

[Inferencia] **Node Digital** es el modelo más parecido a Gestor: servicio gestionado con respaldos, actualizaciones, IA regional y migración, dirigido a despachos legales, salud y finanzas.

**Mercado local**

- Software contable en la nube que el cliente ya paga: Contífico ~63 USD/año (plan contador), iConta 15–70 USD/mes y Boox desde 15 USD.
- No se encontró un gestor documental ecuatoriano específico para contadores.
- Las guías en español que existen son todas de instalación técnica; **no hay material de usuario final** para oficinas contables.

**Dolor que Gestor resuelve** (según reseñas)

- Instalar lleva de medio día a un día, y hay mantenimiento trimestral.
- El clasificador clásico exige ~1 mes de etiquetado manual; la IA de v3 lo mitiga.
- Hay que armar respaldos, HTTPS y correo por cuenta propia.

---

## 16. Cumplimiento en Ecuador

> Resumen de fuentes secundarias y normativa encontrada. **Validar con asesoría legal y tributaria** antes de usarlo en material comercial.

**SRI: conservación de comprobantes**

- **Plazo:** el art. 41 del *Reglamento de Comprobantes de Venta, Retención y Documentos Complementarios* obliga a conservar los comprobantes **7 años**, y a los emisores electrónicos, el "archivo magnético".
- **Documentos alcanzados:** facturas, liquidaciones de compra, notas de crédito y débito, retenciones y guías de remisión.
- **XML:** fuentes secundarias subrayan que el **XML autorizado** es el documento con validez y debe conservarse; el PDF (RIDE) es solo una representación.
- **Portal del SRI:** el Boletín SRI 018 (mar-2024) reportó intermitencias en la consulta por alta demanda y "robots". [Inferencia] No conviene depender del portal del SRI como archivo.
- **Si faltan comprobantes en una auditoría:** gastos no deducibles, recargos e imposibilidad de pedir devoluciones.
- **Implicaciones para Gestor:**
  - Hace falta resolver el archivo del **XML** (sección 18).
  - Hace falta una política de respaldo de al menos 7 años.
  - paperless **no tiene políticas de retención o eliminación automática**, así que la conservación la garantiza la operación de docutecec.

**LOPDP (Ley Orgánica de Protección de Datos Personales)**

- **Roles:** al alojar documentos del cliente, docutecec actúa típicamente como **encargado del tratamiento** y el cliente como **responsable**. Se requiere un **contrato de encargo**.
- **Seguridad:** el principio de seguridad exige medidas acordes al estado de la técnica, incluido el cifrado. El Reglamento trae un anexo de medidas.
- **Transferencias internacionales** (Resolución SPDP-SPD-2026-0004-R, 28-ene-2026; una fuente la cita como 0003-R):
  - Requieren un nivel de protección adecuado o garantías, como cláusulas tipo.
  - La documentación de respaldo se conserva 3 años.
  - **Railway (EE. UU.)** o una **IA externa** (OpenAI, Azure) implican transferencia internacional. **Ollama local** la evita.
- **Delegado de protección de datos:** existe el deber de designarlo en los casos obligados (plazo al 31-dic-2025).

**Qué aporta paperless a un argumento de cumplimiento**

- Auditoría de cambios.
- Permisos por documento.
- 2FA y SSO.
- Verificación de integridad por checksum.
- Originales intactos.
- PDF/A (con `always`).
- Exportación completa.
- IA opcional y local.

---

## 17. Limitaciones: lo que NO hace

| Limitación | Detalle | Cómo lo cubre Gestor [Inferencia] |
|---|---|---|
| **XML no admitido** | No archiva XML de forma nativa (verificado en código). | Parser propio, o conversión o guardado paralelo del XML (sección 18). |
| Sin multi-tenencia | Una instancia = una organización. La petición se cerró por poca demanda. | Una instancia por empresa cliente; dentro, separar por grupos y permisos. |
| Sin flujos de aprobación | Petición cerrada sin implementar (nov-2024). | Etiquetas de estado + workflows + permisos; no prometer aprobaciones formales. |
| Sin firma electrónica | No firma ni valida firmas. | Archivar el documento firmado; no editarlo. |
| Editor de PDF altera el original | Rotar o borrar páginas modifica el archivo. | Capacitar; restringir el uso en documentos firmados. |
| Sin retención automática | No hay políticas "borrar tras X años". | Política operativa y respaldos de al menos 7 años. |
| Sin cifrado en la aplicación (v3) | Se eliminó. | Cifrado de disco o volumen y respaldos cifrados. |
| PDF/A no siempre | Con `auto` no se genera para PDFs digitales. | Fijar `PAPERLESS_ARCHIVE_FILE_GENERATION=always`. |
| Office y .eml requieren servicios extra | Tika + Gotenberg. | Incluirlos en el plan o como extra. |
| Sin app móvil oficial | Solo terceros; Android flojo. | PWA + app recomendada y soportada por docutecec. |
| Carpeta de consumo sin dueño | Visible para todos salvo workflow. | Workflow por defecto que asigne dueño. |
| Workflows sin permisos | Globales. | No dar el permiso Workflow a clientes. |
| Búsqueda avanzada en inglés | `previous month`, `NOT`… | Guía rápida en español. |
| La IA no llena campos | Solo título, fechas y clasificación. | El motor de Formularios llena los campos vía API. |
| Soporte solo comunitario | Sin SLA. | Soporte y SLA de docutecec. |
| Sin requisitos de hardware oficiales | — | Dimensionamiento propio con pruebas. |

---

## 18. Recomendaciones para Gestor

**Estado actual del despliegue de demo** (`gestor/`, Railway)

| Ajuste | Estado |
|---|---|
| OCR en español (`spa`) | Configurado |
| Zona horaria `America/Guayaquil` | Configurado |
| Postgres + Redis + volumen | Configurado |
| Marca docutecec (login, tema, logo, favicon) | Configurado |
| `PAPERLESS_ARCHIVE_FILE_GENERATION=always` | **Pendiente**: sin esto no hay PDF/A de PDFs digitales |
| `PAPERLESS_SEARCH_LANGUAGE=es` y `PAPERLESS_DATE_PARSER_LANGUAGES=es` | Pendiente (hoy se infieren del OCR) |
| Tika + Gotenberg (Office, .eml) | **No desplegado**: hoy no se aceptan Word, Excel ni .eml |
| SMTP (restablecer contraseña, enviar por email, workflows de correo) | No configurado |
| `PAPERLESS_*_ALLOW_INTERNAL_*=false` (protección SSRF en la nube) | Pendiente |
| IA | Desactivada |

**Perfil "Ecuador" recomendado:**

```
PAPERLESS_OCR_LANGUAGE=spa+eng
PAPERLESS_DATE_ORDER=DMY
PAPERLESS_DATE_PARSER_LANGUAGES=es
PAPERLESS_SEARCH_LANGUAGE=es
PAPERLESS_TIME_ZONE=America/Guayaquil
PAPERLESS_ARCHIVE_FILE_GENERATION=always
PAPERLESS_AI_LLM_OUTPUT_LANGUAGE=es
```

**Oferta de producto** [Inferencia]

1. **Una instancia por empresa cliente**, con respaldo diario (`document_exporter` incremental hacia almacenamiento externo) y versión fijada.
2. **Plantilla contable precargada:**
   - Tipos de documento: Factura, Retención, Nota de crédito, Liquidación de compra, Rol de pagos, Contrato, Declaración.
   - Campos: RUC, Nº de autorización, Total, IVA, Fecha de vencimiento, Pagado, Retención asociada.
   - Corresponsales frecuentes: SRI, IESS, bancos.
   - Workflows de vencimiento.
   - Vistas "Por pagar" y "Vencen esta semana".
3. **Solución para el XML del SRI.** Hay tres opciones:
   - (a) Un plugin de parser que acepte `.xml` de comprobantes y extraiga el texto legible.
   - (b) Adjuntar el XML como **versión** del documento RIDE.
   - (c) Que Formularios reciba el par XML + PDF, archive el PDF en Gestor con los campos llenos y guarde el XML con enlace al documento.
   - Validar con un asesor cuál satisface la conservación del "archivo magnético".
4. **Integración Formularios ↔ Gestor** vía API y webhook (sección 13).
5. **IA como complemento:** local con Ollama para clientes sensibles (sin transferencia internacional) o API externa con consentimiento y costo medido.
6. **Captura:** escáneres homologados, buzón de correo por cliente y PWA o app recomendada en el móvil.
7. **Material en español:** guía de usuario final, guía de búsqueda y capacitación. Es un hueco real del mercado.
8. **Legal:** contrato de encargo de tratamiento (LOPDP), evaluación de la región de hosting y política de conservación de 7 años.
9. **Licencia GPL-3.0:** al distribuir la imagen modificada on-premise hay que entregar el código fuente de las modificaciones (la carpeta `gestor/`). No impide cobrar por el servicio.

---

## 19. Fuentes

**Documentación oficial** (etiqueta `v3.2.1`): https://github.com/paperless-ngx/paperless-ngx/tree/v3.2.1/docs. Sitio: https://docs.paperless-ngx.com

- `index.md`, `usage.md`, `advanced_usage.md`, `configuration.md`, `administration.md`, `setup.md`, `api.md`, `faq.md`, `troubleshooting.md`, `migration-v3.md`, `changelog.md`.
- Código fuente verificado: `src/paperless/parsers/{tesseract,text,tika,mail,remote}.py` (tipos MIME admitidos).
- Releases y fechas: https://github.com/paperless-ngx/paperless-ngx/releases

**Proyecto e historia**

- https://github.com/paperless-ngx/paperless-ngx
- https://deployn.de/en/guides/paperless-ngx/
- https://github.com/jonaswinkler/paperless-ng/issues/1690
- https://releasebot.io/updates/paperless-ngx

**Reseñas y guías**

- https://ettayeb.fr/en/selfhosted/paperless-ngx-document-management-2026/
- https://blog.elest.io/go-paperless-in-2026-how-paperless-ngx-organizes-your-documents-better-than-dropbox/
- https://dev.to/pickuma/paperless-ngx-self-hosted-document-management-for-developers-who-want-the-api-dgm
- https://www.xda-developers.com/i-use-local-llms-and-self-hosted-apps-to-manage-my-documents/
- https://tailscale.com/blog/paperless-ngx-local-ai-document-search

**Guías en español**

- https://libros.catedu.es/books/raspberry-pi/page/314-paperless-ngx-gestion-documental
- https://cubepath.com/docs/productividad-self-hosted/paperless-ngx-gestion-de-documentos
- https://www.ochobitshacenunbyte.com/2026/02/05/gestion-documental-con-paperless-ngx-y-docker/
- https://tecnobits.com/como-organizar-facturas-con-paperless-ngx/
- https://www.flopy.es/instalacion-del-gestor-documental-paperless-ngx-usando-docker-compose/

**Ecosistema**

- Wiki de proyectos relacionados: https://github.com/paperless-ngx/paperless-ngx/wiki/Related-Projects
- Swift Paperless: https://github.com/paulgessinger/swift-paperless
- Apps para móvil: https://www.klissner.uk/en/paperless-apps-for-on-the-go/
- Paperless Mobile: https://github.com/astubenbord/paperless-mobile
- Paperless Share: https://f-droid.org/packages/com.quinncasey.paperless_share/
- Paperless-NGX Uploader: https://github.com/gmag11/Paperless_ngx_uploader/
- Extensión para Chrome: https://chromewebstore.google.com/detail/save-to-paperless/ajjpjmlgojdjnlmmbcfbhncccpjodfed
- Recomendaciones de escáneres: https://github.com/paperless-ngx/paperless-ngx/wiki/Scanner-&-Software-Recommendations
- Home Assistant: https://www.home-assistant.io/integrations/paperless_ngx/
- paperless-gpt: https://github.com/icereed/paperless-gpt

**Comparativas y precios**

- https://www.layer3labs.io/guides/open-source-ai-document-management-software
- https://www.libhunt.com/compare-paperless-ngx-vs-Mayan-EDMS
- https://www.opentechhub.io/paperless-ngx/
- https://openalternative.co/paperless-ngx
- https://node.uk/applications/paperless/
- https://www.cloudshift.de/en/cloud/paperless-ngx/
- https://apertus.ai/en/apps/paperless-ngx/
- https://elest.io/open-source/paperless-ngx
- https://sliplane.io/blog/self-hosting-paperless-ngx-the-easy-way
- https://www.hostinger.com/applications/paperless-ngx
- https://www.siigo.com/ec/software-contable-para-contadores/
- https://www.iconta.com.ec/

**Limitaciones reportadas (discusiones en GitHub)**

- Multi-tenencia: https://github.com/paperless-ngx/paperless-ngx/discussions/6012
- Aprobaciones: https://github.com/paperless-ngx/paperless-ngx/discussions/3625

**Normativa Ecuador**

- Reglamento de Comprobantes (SRI): https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/142f0d6e-b156-4ac6-b804-0bd4938bc7b8/Reglamento+de+Comprobantes+de+Venta,+Retenci%F3n+y+Documentos+Complementarios.pdf
- Conservación de comprobantes por 7 años:
  - https://ciro.com.ec/blog/obligacion-conservacion-comprobantes-7-anos/
  - https://ecuador221.com.ec/sri-comprobantes-electronicos-deben-conservarse-por-7-anos/
- Boletín SRI 018 (vía prensa): https://www.primicias.ec/noticias/economia/facturacion-electronica-sri-comprobantes-iva/
- LOPDP: https://www.finanzaspopulares.gob.ec/wp-content/uploads/2021/07/ley_organica_de_proteccion_de_datos_personales.pdf
- Reglamento LOPDP: https://spdp.gob.ec/wp-content/uploads/2024/12/04.pdf.pdf
- Transferencias internacionales:
  - https://nmslaw.com.ec/blog/2026/02/02/spdp-transferencias-comunicaciones-datos-personales-ecuador-internacionales/
  - https://www.robalinolaw.com/es/medios/norma-transferencias-datos-personales-spdp-2026

---

## Anexo A: Cronología de funciones

| Versión | Funciones principales |
|---|---|
| 1.11 | Correo gestionado desde la web; consumo de .eml |
| 1.13 | Separación por códigos de barras ASN |
| 1.14 | Permisos multiusuario |
| 2.0 | Enlaces para compartir, campos personalizados, auditoría, restablecer contraseña |
| 2.3 | **Workflows** |
| 2.4 | Personalización de marca |
| 2.5 | **OIDC / SSO**, etiquetas por código de barras |
| 2.7 | Unir, dividir y rotar PDF; auditoría activa por defecto |
| 2.8 | Búsqueda global, atajos, historial del documento |
| 2.10 | **Papelera** |
| 2.13 | **Gmail/Outlook OAuth**, plantillas Jinja, consultas por campos |
| 2.14 | **2FA**, workflows con email, webhook y programados |
| 2.15 | Enviar por email, OpenAPI |
| 2.16 | HEIC, códigos de barras configurables desde la interfaz |
| 2.18 | **Editor de PDF**, restricciones de webhooks |
| 2.19 | **Etiquetas jerárquicas**, filtros avanzados de workflows |
| **3.0** (22-jul-2026) | **IA (LLM, chat, RAG)**, Tantivy, versiones de archivo, paquetes de enlaces, OCR remoto Azure, duplicados marcados, SHA256 |
| 3.1 (27-ago-2026) | Workflow de IA, fusionar como versiones, grupos OIDC → roles |
| 3.2 (19-sep-2026) | Búsqueda difusa, filtro de duplicados, gestión de enlaces, mejor clasificación |
| 3.2.1 (20-sep-2026) | Correcciones: índice de búsqueda, OCRmyPDF 17.12, correo |

## Anexo B: Idioma de la interfaz

- **Español incluido.** El idioma se elige por usuario en **Settings → General → Display language**; si no se elige, se usa el del navegador.
- Las respuestas de la IA se configuran aparte (`PAPERLESS_AI_LLM_OUTPUT_LANGUAGE`).
- Algunos textos siguen nombrando a "Paperless-ngx", por ejemplo la tarjeta de bienvenida del dashboard.
