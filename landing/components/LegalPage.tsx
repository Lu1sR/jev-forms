import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { LEGAL_CITY, LEGAL_EMAIL, LEGAL_OWNER, LEGAL_RUC, LEGAL_UPDATED } from "@/lib/legal";
import styles from "./LegalPage.module.css";

// One legal document on the same form sheet as the landing: the header
// casilleros say who answers for it and since when it applies.
export default function LegalPage({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.sheet}>
        <header className={styles.top}>
          <Link href="/" className={styles.brand} aria-label="docutecec, inicio">
            <Wordmark />
          </Link>
          <nav className={styles.nav} aria-label="Documentos legales">
            <Link href="/terminos">Términos</Link>
            <Link href="/privacidad">Privacidad</Link>
          </nav>
        </header>

        <main className={styles.main}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lede}>{lede}</p>

          <dl className={styles.boxes}>
            <div>
              <dt>Responsable</dt>
              <dd>{LEGAL_OWNER}</dd>
            </div>
            {LEGAL_RUC ? (
              <div>
                <dt>RUC</dt>
                <dd>{LEGAL_RUC}</dd>
              </div>
            ) : null}
            <div>
              <dt>Domicilio</dt>
              <dd>{LEGAL_CITY}, Ecuador</dd>
            </div>
            <div>
              <dt>Contacto</dt>
              <dd>
                <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>
              </dd>
            </div>
            <div>
              <dt>Vigente desde</dt>
              <dd>{LEGAL_UPDATED}</dd>
            </div>
          </dl>

          <div className={styles.body}>{children}</div>
        </main>

        <footer className={styles.footer}>
          <Link href="/">Volver a docutecec.com</Link>
          <span>© {new Date().getFullYear()} docutecec</span>
        </footer>
      </div>
    </div>
  );
}
