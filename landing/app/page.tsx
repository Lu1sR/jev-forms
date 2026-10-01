import ArchiveSearch from "@/components/ArchiveSearch";
import HeroForm from "@/components/HeroForm";
import { ArrowIcon, CheckIcon, DashIcon, MailIcon, QueryIcon, WhatsAppIcon } from "@/components/Icons";
import QuoteForm from "@/components/QuoteForm";
import Wordmark from "@/components/Wordmark";
import {
  FORMULARIOS_URL,
  GESTOR_DEMO_PASSWORD,
  GESTOR_DEMO_USER,
  GESTOR_URL,
  HAS_WHATSAPP,
  SALES_EMAIL,
  contactHref,
  hostOf,
} from "@/lib/site";
import styles from "./page.module.css";

const FORMULARIOS_POINTS = [
  {
    term: "Fotos y PDF",
    text: "Una foto desde el celular, un escaneo o la factura electrónica en PDF. JPG, PNG, HEIC o PDF de hasta 15 MB.",
  },
  {
    term: "Comprobantes ecuatorianos",
    text: "Facturas, notas de venta y precuentas, con RUC, número de comprobante, IVA y servicio donde los haya.",
  },
  {
    term: "Montos que cuadran",
    text: "Comprueba que subtotal, IVA y servicio sumen el total, y que la clave de acceso coincida con el comprobante.",
  },
  {
    term: "Cada valor con su origen",
    text: "Cada dato señala la línea exacta del documento de donde salió, para revisarlo en un segundo.",
  },
  {
    term: "Sus formularios, no los nuestros",
    text: "Usted define los campos: registro de compras, reembolsos, sorteos, reclamos. Los datos salen en JSON por API para su sistema.",
  },
];

const GESTOR_POINTS = [
  { term: "Lee todo lo que archiva", text: "Escaneos y fotos se convierten en texto: se busca dentro de cada página, no solo por el nombre del archivo." },
  { term: "Se clasifica solo", text: "Aprende de lo que usted ya archivó y asigna tipo de documento, proveedor y etiquetas a lo nuevo." },
  { term: "Entra por correo o carpeta", text: "Lo que llega a una casilla de correo o a una carpeta compartida se archiva sin que nadie lo suba." },
  { term: "Cada área ve lo suyo", text: "Permisos por usuario y grupo, reglas de trabajo automáticas e historial de quién cambió qué y cuándo." },
  { term: "Guardado para durar", text: "Conserva el original y una copia en PDF/A, el formato pensado para archivo de largo plazo. Comparte con enlaces que vencen." },
];

const AREAS = [
  {
    area: "Contabilidad",
    docs: "Facturas de proveedores, notas de venta, retenciones",
    change: "Las compras se registran sin digitar, y cada comprobante queda a la mano cuando lo piden.",
  },
  {
    area: "Talento humano",
    docs: "Contratos, roles de pagos, certificados, avisos",
    change: "El expediente de cada persona está completo y en un solo lugar.",
  },
  {
    area: "Gerencia y legal",
    docs: "Contratos, actas, poderes, pólizas",
    change: "La versión firmada aparece en segundos, con sus fechas de vencimiento a la vista.",
  },
  {
    area: "Promociones y servicio al cliente",
    docs: "Comprobantes que envían sus clientes",
    change: "Sorteos, reembolsos y reclamos se validan leyendo el comprobante, no a mano.",
  },
];

const FAQ = [
  {
    q: "¿Funciona con las facturas electrónicas del SRI?",
    a: "Sí. Lee el PDF de la factura electrónica (el RIDE) y también fotos de comprobantes impresos. En las electrónicas, además, comprueba que la clave de acceso coincida con el RUC, el número y la fecha del documento.",
  },
  {
    q: "¿Mis documentos salen de mi empresa?",
    a: "Usted elige. Gestor puede funcionar en nuestra nube o instalarse en un servidor de su empresa, para que los documentos no salgan de su red. Lo conversamos según lo que exija su política de datos y la Ley Orgánica de Protección de Datos Personales.",
  },
  {
    q: "¿Puedo empezar con un producto y sumar el otro después?",
    a: "Sí. Formularios y Gestor se contratan por separado. Si empieza con uno, sumar el otro no obliga a cambiar nada de lo que ya tiene.",
  },
  {
    q: "¿Tengo que cambiar mi sistema contable?",
    a: "No. Formularios entrega los datos en JSON por una API que su sistema puede recibir, y Gestor convive con sus carpetas y su correo actuales.",
  },
  {
    q: "¿Qué pasa cuando el sistema no está seguro de un dato?",
    a: "Lo dice. Cada campo sale como listo, para revisar o vacío si no aparece en el documento, en lugar de inventar un valor. Usted corrige lo marcado y sigue.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "Depende de cuántos documentos procesa al mes, cuántas personas lo usan y dónde se instala. Llene la solicitud de arriba y le enviamos una propuesta.",
  },
];

function ContactButton({ label, className }: { label: string; className?: string }) {
  return (
    <a className={`${styles.primary} ${className ?? ""}`} href={contactHref()} target="_blank" rel="noopener noreferrer">
      {HAS_WHATSAPP ? <WhatsAppIcon className={styles.btnIcon} /> : <MailIcon className={styles.btnIcon} />}
      {label}
    </a>
  );
}

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.sheet}>
        <header className={styles.top}>
          <a href="#inicio" className={styles.brand} aria-label="docutecec, inicio">
            <Wordmark />
          </a>
          <nav className={styles.nav} aria-label="Secciones">
            <a href="#formularios">Formularios</a>
            <a href="#gestor">Gestor</a>
            <a href="#cotizar">Cotizar</a>
            <a href="#preguntas">Preguntas</a>
          </nav>
          <ContactButton label={HAS_WHATSAPP ? "WhatsApp" : "Escríbanos"} className={styles.topBtn} />
        </header>

        <main id="inicio">
          <section className={styles.hero} aria-labelledby="hero-title">
            <div className={styles.heroText}>
              <h1 id="hero-title" className={styles.display}>
                Deje de digitar.
                <span> Empiece a encontrar.</span>
              </h1>
              <p className={styles.lede}>
                docutecec lee las facturas y documentos de su empresa, llena los campos que usted necesita y
                guarda cada archivo donde lo encuentra en segundos.
              </p>
              <div className={styles.actions}>
                <ContactButton label={HAS_WHATSAPP ? "Escríbanos por WhatsApp" : "Escríbanos"} />
                <a className={styles.secondary} href={FORMULARIOS_URL}>
                  Probar con un comprobante
                  <ArrowIcon className={styles.btnIcon} />
                </a>
              </div>

              <ul className={styles.products}>
                <li>
                  <a href="#formularios" className={styles.product}>
                    <span className={styles.productLetter}>A</span>
                    <span>
                      <b>Formularios</b>
                      <span>Lee comprobantes y llena sus formularios</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a href="#gestor" className={styles.product}>
                    <span className={styles.productLetter}>B</span>
                    <span>
                      <b>Gestor</b>
                      <span>Archiva cada documento y lo encuentra al instante</span>
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            <div className={styles.heroForm}>
              <HeroForm />
            </div>
          </section>

          <dl className={styles.strip}>
            <div>
              <dt>Productos</dt>
              <dd>Formularios · Gestor</dd>
            </div>
            <div>
              <dt>Contratación</dt>
              <dd>Juntos o por separado</dd>
            </div>
            <div>
              <dt>Instalación</dt>
              <dd>Nube docutecec o servidor propio</dd>
            </div>
            <div>
              <dt>Idioma y soporte</dt>
              <dd>Español, para empresas del Ecuador</dd>
            </div>
          </dl>

          <section id="formularios" className={styles.section} aria-labelledby="formularios-title">
            <h2 id="formularios-title" className={styles.band}>
              <span className={styles.bandName}>Formularios</span>
              <span className={styles.bandText}>El comprobante entra, los datos salen listos</span>
            </h2>
            <div className={styles.split}>
              <div className={styles.intro}>
                <p className={styles.statement}>
                  Nadie más copia a mano un RUC de trece dígitos.
                </p>
                <p className={styles.body}>
                  Suba una foto o un PDF y cada campo de su formulario se llena en segundos. Lo que el sistema
                  verificó queda marcado como listo; lo dudoso, para revisar; lo que no está en el documento, vacío.
                  Nunca un dato inventado.
                </p>
                <ul className={styles.legend} aria-label="Cómo se marca cada campo">
                  <li className={styles.legendOk}>
                    <CheckIcon className={styles.legendIcon} />
                    Listo
                  </li>
                  <li className={styles.legendWarn}>
                    <QueryIcon className={styles.legendIcon} />
                    Revisar
                  </li>
                  <li className={styles.legendNone}>
                    <DashIcon className={styles.legendIcon} />
                    No aparece
                  </li>
                </ul>
                <a className={styles.demoLink} href={FORMULARIOS_URL}>
                  <span className={styles.demoLabel}>Demo abierta</span>
                  <span className={styles.demoHost}>{hostOf(FORMULARIOS_URL)}</span>
                  <ArrowIcon className={styles.btnIcon} />
                </a>
              </div>
              <dl className={styles.points}>
                {FORMULARIOS_POINTS.map((p) => (
                  <div key={p.term}>
                    <dt>{p.term}</dt>
                    <dd>{p.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section id="gestor" className={`${styles.section} ${styles.copy}`} aria-labelledby="gestor-title">
            <h2 id="gestor-title" className={styles.band}>
              <span className={styles.bandName}>Gestor</span>
              <span className={styles.bandText}>Todo el archivo de la empresa, en un solo lugar</span>
            </h2>
            <div className={`${styles.split} ${styles.splitReverse}`}>
              <div className={styles.intro}>
                <p className={styles.statement}>La carpeta que alguien guardó “en algún lado” ya no existe.</p>
                <p className={styles.body}>
                  Gestor reúne facturas, contratos, actas y expedientes en un archivo que se busca como se busca en
                  internet: por una palabra, un monto, una fecha o un proveedor. Pruebe el buscador con este archivo de
                  ejemplo.
                </p>
                <dl className={styles.points}>
                  {GESTOR_POINTS.map((p) => (
                    <div key={p.term}>
                      <dt>{p.term}</dt>
                      <dd>{p.text}</dd>
                    </div>
                  ))}
                </dl>
                <div className={styles.installs}>
                  <div>
                    <b>En la nube de docutecec</b>
                    <span>Sin equipos que comprar ni servidores que mantener.</span>
                  </div>
                  <div>
                    <b>En el servidor de su empresa</b>
                    <span>Los documentos no salen de la red de su empresa.</span>
                  </div>
                </div>
                <div className={styles.demoAccess}>
                  <a className={styles.demoLink} href={GESTOR_URL} target="_blank" rel="noopener">
                    <span className={styles.demoLabel}>Entrar a la demo</span>
                    <span className={styles.demoHost}>{hostOf(GESTOR_URL)}</span>
                    <ArrowIcon className={styles.btnIcon} />
                  </a>
                  {GESTOR_DEMO_USER && GESTOR_DEMO_PASSWORD ? (
                    <dl className={styles.demoLogin} aria-label="Acceso a la demo de Gestor">
                      <div>
                        <dt>Usuario</dt>
                        <dd>{GESTOR_DEMO_USER}</dd>
                      </div>
                      <div>
                        <dt>Contraseña</dt>
                        <dd>{GESTOR_DEMO_PASSWORD}</dd>
                      </div>
                    </dl>
                  ) : null}
                </div>
              </div>
              <div className={styles.archiveWrap}>
                <ArchiveSearch />
              </div>
            </div>
          </section>

          <section id="suite" className={styles.section} aria-labelledby="suite-title">
            <h2 id="suite-title" className={styles.band}>
              <span className={styles.bandName}>Suite</span>
              <span className={styles.bandText}>Juntos o por separado</span>
            </h2>
            <div className={styles.suite}>
              <p className={styles.statement}>
                Cada uno resuelve un problema. Juntos cubren el camino completo del documento.
              </p>
              <ol className={styles.flow}>
                <li>
                  <span className={styles.flowStep}>1</span>
                  <b>Llega el documento</b>
                  <span>Por correo, desde el escáner o como foto tomada con el celular.</span>
                </li>
                <li>
                  <span className={styles.flowStep}>2</span>
                  <b>Formularios lo lee</b>
                  <span>RUC, número, fecha y montos quedan en sus casilleros, verificados.</span>
                </li>
                <li>
                  <span className={styles.flowStep}>3</span>
                  <b>Gestor lo archiva</b>
                  <span>Queda guardado, clasificado y listo para encontrarlo por cualquier palabra, fecha o monto.</span>
                </li>
              </ol>
              <p className={styles.body}>
                Puede empezar solo con Formularios para dejar de digitar, o solo con Gestor para ordenar el archivo, y
                sumar el otro cuando lo necesite.
              </p>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="areas-title">
            <h2 id="areas-title" className={styles.band}>
              <span className={styles.bandName}>Áreas</span>
              <span className={styles.bandText}>Dónde se nota primero</span>
            </h2>
            <div className={styles.tableWrap}>
              <table className={styles.areas}>
                <thead>
                  <tr>
                    <th scope="col">Área</th>
                    <th scope="col">Documentos</th>
                    <th scope="col">Qué cambia</th>
                  </tr>
                </thead>
                <tbody>
                  {AREAS.map((a) => (
                    <tr key={a.area}>
                      <th scope="row">{a.area}</th>
                      <td>{a.docs}</td>
                      <td>{a.change}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="cotizar" className={styles.section} aria-labelledby="cotizar-title">
            <h2 id="cotizar-title" className={styles.band}>
              <span className={styles.bandName}>Cotización</span>
              <span className={styles.bandText}>Marque lo que necesita y envíelo</span>
            </h2>
            <div className={styles.quote}>
              <div className={styles.intro}>
                <p className={styles.statement}>Una propuesta a la medida de su volumen, no un plan de catálogo.</p>
                <ol className={styles.steps}>
                  <li>
                    <b>Nos escribe</b>
                    <span>Con esta solicitud llena, por WhatsApp o por correo.</span>
                  </li>
                  <li>
                    <b>Lo vemos con sus documentos</b>
                    <span>Una demostración con comprobantes y archivos reales de su empresa.</span>
                  </li>
                  <li>
                    <b>Recibe la propuesta</b>
                    <span>Alcance, instalación y condiciones, por escrito.</span>
                  </li>
                </ol>
              </div>
              <QuoteForm />
            </div>
          </section>

          <section id="preguntas" className={styles.section} aria-labelledby="preguntas-title">
            <h2 id="preguntas-title" className={styles.band}>
              <span className={styles.bandName}>Instrucciones</span>
              <span className={styles.bandText}>Preguntas frecuentes</span>
            </h2>
            <div className={styles.faq}>
              {FAQ.map((f) => (
                <details key={f.q} className={styles.faqItem}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className={styles.close} aria-labelledby="close-title">
            <h2 id="close-title" className={styles.closeTitle}>
              Traiga un comprobante suyo. Se lo leemos en vivo.
            </h2>
            <div className={styles.closeActions}>
              <ContactButton label={HAS_WHATSAPP ? "Escríbanos por WhatsApp" : "Escríbanos"} />
              <a className={styles.closeMail} href={`mailto:${SALES_EMAIL}`}>
                {SALES_EMAIL}
              </a>
            </div>
            <div className={styles.signature} aria-hidden="true">
              <span />
              <span>Firma autorizada · docutecec</span>
            </div>
          </section>
        </main>

        <footer className={styles.footer}>
          <div className={styles.footBrand}>
            <Wordmark inverse />
            <p>Lectura de comprobantes y gestión documental para empresas del Ecuador.</p>
          </div>
          <nav className={styles.footCols} aria-label="Enlaces">
            <div>
              <h3>Productos</h3>
              <a href="#formularios">Formularios</a>
              <a href="#gestor">Gestor</a>
              <a href="#suite">Suite completa</a>
            </div>
            <div>
              <h3>Demos</h3>
              <a href={FORMULARIOS_URL}>{hostOf(FORMULARIOS_URL)}</a>
              <a href={GESTOR_URL}>{hostOf(GESTOR_URL)}</a>
            </div>
            <div>
              <h3>Contacto</h3>
              <a href={contactHref()} target="_blank" rel="noopener noreferrer">
                {HAS_WHATSAPP ? "WhatsApp" : "Escríbanos"}
              </a>
              <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>
            </div>
          </nav>
          <p className={styles.legal}>© {new Date().getFullYear()} docutecec · docutecec.com</p>
        </footer>
      </div>
    </div>
  );
}
