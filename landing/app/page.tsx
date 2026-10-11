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

const ARCHIVO_POINTS = [
  { term: "Lee cada página", text: "Escaneos y fotos pasan a texto: se busca dentro del documento." },
  { term: "Se clasifica solo", text: "Tipo, remitente y etiquetas, aprendidos de lo que ya archivó." },
  { term: "Entra sin subirlo", text: "Desde una casilla de correo o una carpeta compartida." },
  { term: "Cada área ve lo suyo", text: "Permisos por grupo e historial de quién cambió qué." },
];

const DESTINOS = [
  { term: "Google Sheets", text: "Una fila por documento, en la hoja que usted elija." },
  { term: "Su sistema", text: "ERP, contabilidad o CRM, por API o webhook." },
  { term: "Correo", text: "Un aviso al responsable cuando algo pide atención." },
  { term: "El mismo archivo", text: "Los datos quedan guardados en cada documento." },
];

const EJEMPLOS = [
  {
    area: "Contabilidad",
    docs: "Facturas, retenciones, notas de venta",
    flow: "Cada factura que llega al correo se registra en la hoja de compras.",
  },
  {
    area: "Talento humano",
    docs: "Contratos, roles de pagos, certificados",
    flow: "Un aviso cuando al expediente de alguien le falta un documento.",
  },
  {
    area: "Gerencia y legal",
    docs: "Contratos, actas, pólizas",
    flow: "Un correo 30 días antes de que venza un contrato o una póliza.",
  },
  {
    area: "Servicio al cliente",
    docs: "Comprobantes que envían sus clientes",
    flow: "Sorteos, reembolsos y reclamos validados leyendo el comprobante.",
  },
];

const FAQ = [
  {
    q: "¿Qué documentos acepta?",
    a: "Cualquiera: PDF, escaneos y fotos. Contratos, facturas, actas, expedientes. Todo se lee y se busca por su contenido.",
  },
  {
    q: "¿A qué sistemas puede enviar los datos?",
    a: "Google Sheets, correo y cualquier sistema que reciba datos por API o webhook. El flujo lo armamos con usted.",
  },
  {
    q: "¿Funciona con las facturas electrónicas del SRI?",
    a: "Sí. Lee el RIDE en PDF y fotos de comprobantes impresos, y comprueba que la clave de acceso coincida con el documento.",
  },
  {
    q: "¿Mis documentos salen de mi empresa?",
    a: "Usted elige: nuestra nube o un servidor de su empresa, según su política de datos y la Ley Orgánica de Protección de Datos Personales.",
  },
  {
    q: "¿Qué pasa cuando no está seguro de un dato?",
    a: "Lo dice. Cada campo sale como listo, para revisar o vacío. Nunca un valor inventado.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "Depende de su volumen, cuántas personas lo usan y dónde se instala. Llene la solicitud y le enviamos una propuesta.",
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
            <a href="#archivo">Archivo</a>
            <a href="#flujos">Flujos</a>
            <a href="#cotizar">Cotizar</a>
            <a href="#preguntas">Preguntas</a>
          </nav>
          <ContactButton label={HAS_WHATSAPP ? "WhatsApp" : "Escríbanos"} className={styles.topBtn} />
        </header>

        <main id="inicio">
          <section className={styles.hero} aria-labelledby="hero-title">
            <div className={styles.heroText}>
              <h1 id="hero-title" className={styles.display}>
                Sus documentos,
                <span> trabajando solos.</span>
              </h1>
              <p className={styles.lede}>
                docutecec archiva y lee los documentos de su empresa, los encuentra en segundos y lleva sus datos a
                donde los necesita.
              </p>
              <div className={styles.actions}>
                <ContactButton label={HAS_WHATSAPP ? "Escríbanos por WhatsApp" : "Escríbanos"} />
                <a className={styles.secondary} href={GESTOR_URL} target="_blank" rel="noopener">
                  Entrar a la demo
                  <ArrowIcon className={styles.btnIcon} />
                </a>
              </div>

              <ul className={styles.products}>
                {[
                  { letter: "A", name: "Archiva", note: "Correo, escáner o celular: todo en un solo lugar", href: "#archivo" },
                  { letter: "B", name: "Encuentra", note: "Por una palabra, una fecha o un monto", href: "#archivo" },
                  { letter: "C", name: "Automatiza", note: "Flujos que leen y envían los datos", href: "#flujos" },
                ].map((c) => (
                  <li key={c.letter}>
                    <a href={c.href} className={styles.product}>
                      <span className={styles.productLetter}>{c.letter}</span>
                      <span>
                        <b>{c.name}</b>
                        <span>{c.note}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.heroForm}>
              <HeroForm />
            </div>
          </section>

          <dl className={styles.strip}>
            <div>
              <dt>Documentos</dt>
              <dd>Todos los de su empresa</dd>
            </div>
            <div>
              <dt>Destinos</dt>
              <dd>Google Sheets, correo, API</dd>
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

          <section id="archivo" className={`${styles.section} ${styles.copy}`} aria-labelledby="archivo-title">
            <h2 id="archivo-title" className={styles.band}>
              <span className={styles.bandName}>Archivo</span>
              <span className={styles.bandText}>Todo en un solo lugar</span>
            </h2>
            <div className={`${styles.split} ${styles.splitReverse}`}>
              <div className={styles.intro}>
                <p className={styles.statement}>La carpeta guardada “en algún lado” ya no existe.</p>
                <p className={styles.body}>
                  Busque como en internet: por una palabra, un monto, una fecha o un nombre. Pruebe con este archivo de
                  ejemplo.
                </p>
                <dl className={styles.points}>
                  {ARCHIVO_POINTS.map((p) => (
                    <div key={p.term}>
                      <dt>{p.term}</dt>
                      <dd>{p.text}</dd>
                    </div>
                  ))}
                </dl>
                <div className={styles.installs}>
                  <div>
                    <b>En la nube de docutecec</b>
                    <span>Sin servidores que mantener.</span>
                  </div>
                  <div>
                    <b>En el servidor de su empresa</b>
                    <span>Los documentos no salen de su red.</span>
                  </div>
                </div>
                <div className={styles.demoAccess}>
                  <a className={styles.demoLink} href={GESTOR_URL} target="_blank" rel="noopener">
                    <span className={styles.demoLabel}>Entrar a la demo</span>
                    <span className={styles.demoHost}>{hostOf(GESTOR_URL)}</span>
                    <ArrowIcon className={styles.btnIcon} />
                  </a>
                  {GESTOR_DEMO_USER && GESTOR_DEMO_PASSWORD ? (
                    <dl className={styles.demoLogin} aria-label="Acceso a la demo">
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

          <section id="flujos" className={styles.section} aria-labelledby="flujos-title">
            <h2 id="flujos-title" className={styles.band}>
              <span className={styles.bandName}>Flujos</span>
              <span className={styles.bandText}>Del documento a su sistema</span>
            </h2>
            <div className={styles.flows}>
              <p className={styles.statement}>Llega el documento. Sus datos llegan a donde los necesita.</p>
              <ol className={styles.flow}>
                <li>
                  <span className={styles.flowStep}>1</span>
                  <b>Llega</b>
                  <span>Por correo, escáner o una foto del celular.</span>
                </li>
                <li>
                  <span className={styles.flowStep}>2</span>
                  <b>Se lee</b>
                  <span>Cada dato a su casillero, verificado.</span>
                </li>
                <li>
                  <span className={styles.flowStep}>3</span>
                  <b>Se envía</b>
                  <span>A Google Sheets, su ERP, un correo o por API.</span>
                </li>
              </ol>

              <div className={styles.flowParts}>
                <div className={styles.intro}>
                  <h3 className={styles.subhead}>Extracción: usted define los campos</h3>
                  <p className={styles.body}>
                    Lo verificado queda listo; lo dudoso, para revisar; lo que no está, vacío. Nunca un dato inventado.
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
                    <span className={styles.demoLabel}>Pruebe con un documento suyo</span>
                    <span className={styles.demoHost}>{hostOf(FORMULARIOS_URL)}</span>
                    <ArrowIcon className={styles.btnIcon} />
                  </a>
                </div>
                <div className={styles.intro}>
                  <h3 className={styles.subhead}>Destinos: a donde ya trabaja</h3>
                  <dl className={styles.points}>
                    {DESTINOS.map((d) => (
                      <div key={d.term}>
                        <dt>{d.term}</dt>
                        <dd>{d.text}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          </section>

          <section id="ejemplos" className={styles.section} aria-labelledby="ejemplos-title">
            <h2 id="ejemplos-title" className={styles.band}>
              <span className={styles.bandName}>Ejemplos</span>
              <span className={styles.bandText}>Un flujo por área</span>
            </h2>
            <div className={styles.tableWrap}>
              <table className={styles.areas}>
                <thead>
                  <tr>
                    <th scope="col">Área</th>
                    <th scope="col">Documentos</th>
                    <th scope="col">Flujo de ejemplo</th>
                  </tr>
                </thead>
                <tbody>
                  {EJEMPLOS.map((a) => (
                    <tr key={a.area}>
                      <th scope="row">{a.area}</th>
                      <td>{a.docs}</td>
                      <td>{a.flow}</td>
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
                <p className={styles.statement}>Una propuesta a su medida, no un plan de catálogo.</p>
                <ol className={styles.steps}>
                  <li>
                    <b>Nos escribe</b>
                    <span>Con esta solicitud, por WhatsApp o correo.</span>
                  </li>
                  <li>
                    <b>Lo vemos con sus documentos</b>
                    <span>Una demostración con documentos reales de su empresa.</span>
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
              Traiga un documento suyo. Lo vemos trabajar en vivo.
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
            <p>Gestión documental con flujos automáticos para empresas del Ecuador.</p>
          </div>
          <nav className={styles.footCols} aria-label="Enlaces">
            <div>
              <h3>docutecec</h3>
              <a href="#archivo">Archivo</a>
              <a href="#flujos">Flujos</a>
              <a href="#ejemplos">Ejemplos</a>
            </div>
            <div>
              <h3>Demos</h3>
              <a href={GESTOR_URL}>{hostOf(GESTOR_URL)}</a>
              <a href={FORMULARIOS_URL}>{hostOf(FORMULARIOS_URL)}</a>
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
