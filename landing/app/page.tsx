import Link from "next/link";
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

const ENTRADAS = ["Correo", "Escáner", "Celular", "Carpeta compartida"];

const SALIDAS = ["Google Sheets", "Su ERP o sistema, por API", "Avisos por correo", "Datos en cada documento"];

const FLUJOS = [
  {
    when: "Llega una factura al correo",
    does: "Lee RUC, fecha y montos, y cuadra la suma",
    result: "Una fila nueva en la hoja de compras",
  },
  {
    when: "Se archiva un contrato o una póliza",
    does: "Lee la fecha de vencimiento",
    result: "Un aviso por correo 30 días antes",
  },
  {
    when: "Ingresa un documento de personal",
    does: "Revisa qué falta en el expediente",
    result: "La lista de pendientes para talento humano",
  },
  {
    when: "Un cliente envía su comprobante",
    does: "Valida el monto y la fecha",
    result: "Aprobado o marcado para revisar",
  },
  {
    when: "Se aprueba un documento",
    does: "Toma los datos ya revisados",
    result: "Un registro en su ERP, por API",
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
            <a href="#gestor">Gestor</a>
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
                  { letter: "A", name: "Archiva", note: "Correo, escáner o celular: todo en un solo lugar", href: "#gestor" },
                  { letter: "B", name: "Encuentra", note: "Por una palabra, una fecha o un monto", href: "#gestor" },
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

          <section id="gestor" className={`${styles.section} ${styles.copy}`} aria-labelledby="gestor-title">
            <h2 id="gestor-title" className={styles.band}>
              <span className={styles.bandName}>Gestor Documental</span>
              <span className={styles.bandText}>Archive, busque y controle cada documento</span>
            </h2>
            <div className={`${styles.split} ${styles.splitReverse}`}>
              <div className={styles.intro}>
                <p className={styles.statement}>Archiva, lee y encuentra cada documento en segundos.</p>
                <p className={styles.body}>
                  Busque por una palabra, un monto, una fecha o un nombre, dentro del texto de cada página. Pruebe con
                  este archivo de ejemplo.
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
              <span className={styles.bandText}>Un flujo para cada documento</span>
            </h2>
            <div className={styles.flows}>
              <div className={styles.flowsIntro}>
                <p className={styles.statement}>El gestor es el centro de su operación documental.</p>
                <p className={styles.body}>
                  Cada tipo de documento puede tener su propio flujo: se activa cuando el documento entra, cambia o
                  vence, y lleva sus datos a donde los necesita.
                </p>
              </div>

              <div
                className={styles.hub}
                role="img"
                aria-label="Los documentos entran al gestor por correo, escáner, celular o carpeta, y sus flujos envían los datos a Google Sheets, su ERP, avisos por correo o al mismo documento."
              >
                <div className={styles.hubSide}>
                  <span className={styles.hubLabel}>Entra por</span>
                  <ul>
                    {ENTRADAS.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.hubCore}>
                  <Wordmark inverse />
                  <b>Gestor documental</b>
                  <span>Archiva · Lee · Ejecuta sus flujos</span>
                </div>
                <div className={`${styles.hubSide} ${styles.hubOut}`}>
                  <span className={styles.hubLabel}>Sale hacia</span>
                  <ul>
                    {SALIDAS.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={styles.flowTable}>
                <h3 className={styles.subhead}>Algunos flujos que puede activar</h3>
                <table className={styles.areas}>
                  <thead>
                    <tr>
                      <th scope="col">Cuando</th>
                      <th scope="col">El flujo</th>
                      <th scope="col">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FLUJOS.map((f) => (
                      <tr key={f.when}>
                        <th scope="row">{f.when}</th>
                        <td>{f.does}</td>
                        <td>{f.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.extract}>
                <div className={styles.extractText}>
                  <h3 className={styles.subhead}>Extracción: usted define los campos</h3>
                  <p className={styles.body}>
                    Lo verificado queda listo; lo dudoso, para revisar; lo que no está, vacío.
                  </p>
                </div>
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
              <a href="#gestor">Gestor documental</a>
              <a href="#flujos">Flujos</a>
              <a href="#cotizar">Cotizar</a>
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
          <p className={styles.legal}>
            <span>© {new Date().getFullYear()} docutecec · docutecec.com</span>
            <Link href="/terminos">Términos de uso</Link>
            <Link href="/privacidad">Política de privacidad</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
