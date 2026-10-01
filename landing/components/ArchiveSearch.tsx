"use client";

import { useId, useMemo, useState } from "react";
import { SearchIcon } from "./Icons";
import styles from "./ArchiveSearch.module.css";

// A tiny, made-up archive to show what full-text search feels like in Gestor.
// The real one searches inside every scanned page (OCR), not only titles.

type Doc = {
  date: string;
  title: string;
  from: string;
  type: "Factura" | "Contrato" | "Rol de pagos" | "Acta" | "Retención";
  tags: string[];
  text: string;
};

const DOCS: Doc[] = [
  { date: "14/03/2026", title: "Factura 001-002-000004517", from: "Ferretería Los Andes", type: "Factura", tags: ["compras", "obra norte"], text: "cemento varilla pintura total 138.00" },
  { date: "02/03/2026", title: "Contrato de arriendo bodega Carcelén", from: "Inmobiliaria Pichincha", type: "Contrato", tags: ["legal", "vence 2027"], text: "canon mensual garantía bodega plazo dos años" },
  { date: "28/02/2026", title: "Rol de pagos febrero", from: "Talento humano", type: "Rol de pagos", tags: ["nómina"], text: "sueldos décimo tercero aportes iess" },
  { date: "21/02/2026", title: "Comprobante de retención 001-001-000000981", from: "Distribuidora El Sol", type: "Retención", tags: ["contabilidad"], text: "retención renta 1.75 % iva 30 %" },
  { date: "19/02/2026", title: "Factura 003-001-000120933", from: "Ferretería Los Andes", type: "Factura", tags: ["compras", "obra sur"], text: "tubería pvc codos pegamento total 86.40" },
  { date: "10/02/2026", title: "Acta de junta general de accionistas", from: "Gerencia", type: "Acta", tags: ["legal", "firmado"], text: "aprobación de estados financieros dividendos" },
  { date: "05/02/2026", title: "Factura 001-001-000055210", from: "Transportes Cotopaxi", type: "Factura", tags: ["logística"], text: "flete quito latacunga total 240.00" },
  { date: "30/01/2026", title: "Contrato de trabajo indefinido", from: "Talento humano", type: "Contrato", tags: ["nómina", "firmado"], text: "jornada completa remuneración periodo de prueba" },
  { date: "22/01/2026", title: "Factura 002-001-000007741", from: "Papelería Central", type: "Factura", tags: ["oficina"], text: "resmas carpetas archivadores total 45.60" },
  { date: "15/01/2026", title: "Contrato de mantenimiento de equipos", from: "Servitec", type: "Contrato", tags: ["legal", "vence 2026"], text: "mantenimiento preventivo trimestral impresoras" },
];

const SUGGESTIONS = ["ferretería", "138.00", "vence", "iess"];

const TYPES = ["Factura", "Contrato", "Rol de pagos", "Acta", "Retención"] as const;

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = norm(text).indexOf(q);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function ArchiveSearch() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("");
  const inputId = useId();
  const q = norm(query.trim());

  const results = useMemo(
    () =>
      DOCS.filter((d) => {
        if (type && d.type !== type) return false;
        if (!q) return true;
        return norm([d.title, d.from, d.type, d.tags.join(" "), d.text, d.date].join(" ")).includes(q);
      }),
    [q, type],
  );

  const inText = (d: Doc) => q && !norm([d.title, d.from].join(" ")).includes(q) && norm(d.text).includes(q);

  return (
    <div className={styles.archive}>
      <header className={styles.head}>
        <span>Archivo de ejemplo · documentos ficticios</span>
      </header>

      <div className={styles.controls}>
        <label className={styles.search} htmlFor={inputId}>
          <span className={styles.code}>401</span>
          <span className={styles.searchBody}>
            <span className={styles.label}>Buscar en todo el archivo</span>
            <span className={styles.inputRow}>
              <SearchIcon className={styles.icon} />
              <input
                id={inputId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Palabra, monto, fecha o proveedor"
                autoComplete="off"
                spellCheck={false}
              />
            </span>
          </span>
        </label>

        <fieldset className={styles.types}>
          <legend className={styles.label}>
            <span className={styles.code}>402</span>
            Tipo de documento
          </legend>
          <div className={styles.typeRow}>
            {["", ...TYPES].map((t) => (
              <label key={t || "all"} className={styles.type}>
                <input type="radio" name="doc-type" value={t} checked={type === t} onChange={() => setType(t)} />
                <span>{t || "Todos"}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={styles.suggest}>
        <span>Pruebe con</span>
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => setQuery(s)} aria-pressed={query === s}>
            {s}
          </button>
        ))}
      </div>

      <p className={styles.count} aria-live="polite">
        {results.length} de {DOCS.length} documentos
      </p>

      {results.length > 0 ? (
        <ul className={styles.results}>
          {results.map((d) => (
            <li key={d.title} className={styles.row}>
              <span className={styles.date}>{d.date}</span>
              <span className={styles.doc}>
                <span className={styles.title}>
                  <Highlight text={d.title} q={q} />
                </span>
                <span className={styles.meta}>
                  <Highlight text={d.from} q={q} /> · {d.type}
                </span>
                {inText(d) && (
                  <span className={styles.snippet}>
                    En el texto: «<Highlight text={d.text} q={q} />»
                  </span>
                )}
              </span>
              <span className={styles.tags}>
                {d.tags.map((t) => (
                  <span key={t} className={styles.tagChip}>
                    {t}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p>
            Ningún documento de este ejemplo contiene «{query.trim()}»{type ? ` entre los de tipo ${type}` : ""}.
          </p>
          <button type="button" onClick={() => { setQuery(""); setType(""); }}>
            Ver todos
          </button>
        </div>
      )}
    </div>
  );
}
