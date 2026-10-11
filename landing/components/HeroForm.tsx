"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, DashIcon, QueryIcon, ReplayIcon, SheetIcon } from "./Icons";
import styles from "./HeroForm.module.css";

// Synthetic invoice (RUC, company and access key are made up) run through one
// docutecec flow: read into casilleros, the way formularios.docutecec.com does it
// with a real document, then sent as a row to Google Sheets.

type LineId = "ruc" | "number" | "name" | "date" | "subtotal" | "iva" | "total";

type Field = {
  code: string;
  label: string;
  value: string;
  line: LineId | null;
  figure?: boolean;
  review?: string;
};

const FIELDS: Field[] = [
  { code: "101", label: "RUC del emisor", value: "1790012345001", line: "ruc", figure: true },
  { code: "102", label: "Razón social", value: "Ferretería Los Andes Cía. Ltda.", line: "name", review: "Revise: en la factura aparece partido en varias líneas." },
  { code: "103", label: "N.º de comprobante", value: "001-002-000004517", line: "number", figure: true },
  { code: "104", label: "Fecha de emisión", value: "14/03/2026", line: "date", figure: true },
  { code: "105", label: "Correo del comprador", value: "", line: null },
  { code: "201", label: "Subtotal 15 %", value: "120.00", line: "subtotal", figure: true },
  { code: "202", label: "IVA 15 %", value: "18.00", line: "iva", figure: true },
  { code: "203", label: "Total", value: "138.00", line: "total", figure: true },
];

const ACCESS_KEY = "1403202601179001234500120010020000045174027193812";

const START_DELAY = 700;
const LINE_PAUSE = 380;
const CHAR_MS = 26;
const AFTER_FIELD = 140;
const SEND_MS = 1100;

const STEPS = ["Documento", "Casilleros", "Destino"];

export default function HeroForm() {
  // index of the field being typed; FIELDS.length means everything is filled
  const [active, setActive] = useState(-1);
  const [chars, setChars] = useState(0);
  const [sent, setSent] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const play = useCallback(() => {
    clear();
    setActive(-1);
    setChars(0);
    setSent(false);
    let t = START_DELAY;
    FIELDS.forEach((field, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setActive(i);
          setChars(0);
        }, t),
      );
      t += field.line ? LINE_PAUSE : LINE_PAUSE / 2;
      for (let c = 1; c <= field.value.length; c++) {
        timers.current.push(window.setTimeout(() => setChars(c), t + c * CHAR_MS));
      }
      t += field.value.length * CHAR_MS + AFTER_FIELD;
    });
    timers.current.push(window.setTimeout(() => setActive(FIELDS.length), t + 200));
    timers.current.push(window.setTimeout(() => setSent(true), t + 200 + SEND_MS));
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const id = window.setTimeout(() => {
        setActive(FIELDS.length);
        setSent(true);
      }, 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(play, 0);
    return () => {
      window.clearTimeout(id);
      clear();
    };
  }, [play]);

  const done = active >= FIELDS.length;
  const step = active < 0 ? 0 : done ? 2 : 1;
  const readingLine = !done && active >= 0 ? FIELDS[active].line : null;
  const readLines = new Set(
    FIELDS.filter((f, i) => f.line && (i < active || done)).map((f) => f.line as LineId),
  );
  const codeFor = (line: LineId) => FIELDS.find((f) => f.line === line)?.code;

  const lineClass = (line: LineId) =>
    [styles.line, readingLine === line ? styles.reading : "", readLines.has(line) ? styles.read : ""]
      .filter(Boolean)
      .join(" ");

  const tag = (line: LineId) =>
    readLines.has(line) || readingLine === line ? (
      <span className={styles.tag} aria-hidden="true">
        {codeFor(line)}
      </span>
    ) : null;

  return (
    <figure
      className={styles.form}
      aria-label="Ejemplo: una factura leída, convertida en casilleros y enviada a Google Sheets"
    >
      <header className={styles.head}>
        <span className={styles.headTitle}>Flujo DT-01 · Factura → Google Sheets</span>
        <span className={styles.headNote}>Ejemplo con datos ficticios</span>
      </header>

      <ol className={styles.steps} aria-hidden="true">
        {STEPS.map((name, i) => (
          <li
            key={name}
            className={`${styles.step} ${i === step && !sent ? styles.stepOn : ""} ${
              i < step || sent ? styles.stepDone : ""
            }`}
          >
            <span className={styles.stepNum}>{i + 1}</span>
            {name}
          </li>
        ))}
      </ol>

      <div className={styles.body}>
        <div className={styles.invoice} aria-hidden="true">
          <div className={styles.invTop}>
            <div>
              <p className={lineClass("name")}>
                <span className={styles.invName}>Ferretería Los Andes Cía. Ltda.</span>
                {tag("name")}
              </p>
              <p className={styles.invMuted}>Av. de los Shyris N35-17 · Quito</p>
            </div>
            <div className={styles.invBox}>
              <p className={lineClass("ruc")}>
                <span>
                  RUC <b>1790012345001</b>
                </span>
                {tag("ruc")}
              </p>
              <p className={styles.invDoc}>Factura</p>
              <p className={lineClass("number")}>
                <span>
                  No. <b>001-002-000004517</b>
                </span>
                {tag("number")}
              </p>
            </div>
          </div>

          <p className={lineClass("date")}>
            <span>
              Fecha de emisión <b>14/03/2026</b>
            </span>
            {tag("date")}
          </p>
          <p className={styles.invKey}>
            <span>Clave de acceso</span>
            <span className={styles.keyDigits}>{ACCESS_KEY}</span>
          </p>

          <table className={styles.items}>
            <thead>
              <tr>
                <th>Cant.</th>
                <th>Descripción</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>4</td>
                <td>Cemento tipo GU 50 kg</td>
                <td>34.00</td>
              </tr>
              <tr>
                <td>10</td>
                <td>Varilla corrugada 12 mm</td>
                <td>72.00</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Pintura látex blanco, galón</td>
                <td>14.00</td>
              </tr>
            </tbody>
          </table>

          <div className={styles.sums}>
            <p className={lineClass("subtotal")}>
              <span>Subtotal 15 %</span>
              <b>120.00</b>
              {tag("subtotal")}
            </p>
            <p className={lineClass("iva")}>
              <span>IVA 15 %</span>
              <b>18.00</b>
              {tag("iva")}
            </p>
            <p className={`${lineClass("total")} ${styles.grand}`}>
              <span>Valor total</span>
              <b>138.00</b>
              {tag("total")}
            </p>
          </div>
        </div>

        <div className={styles.fields}>
          {FIELDS.map((field, i) => {
            const filled = done || i < active;
            const typing = i === active && !done;
            const shown = filled ? field.value : typing ? field.value.slice(0, chars) : "";
            const absent = !field.value && (filled || typing);
            return (
              <div
                key={field.code}
                className={`${styles.field} ${typing ? styles.fieldActive : ""} ${
                  field.code === "203" ? styles.fieldTotal : ""
                }`}
              >
                <span className={styles.code}>{field.code}</span>
                <span className={styles.label}>{field.label}</span>
                <span className={`${styles.value} ${field.figure ? styles.figure : ""}`}>
                  <span className="visually-hidden">{field.value ? `${field.value}${field.review ? `. ${field.review}` : ""}` : "No aparece en el documento"}</span>
                  <span aria-hidden="true" className={filled && field.review ? styles.review : undefined}>
                    {absent ? <span className={styles.absent}>No aparece en el documento</span> : shown}
                    {typing && field.value && <span className={styles.caret} />}
                  </span>
                  {filled && field.review && <span className={styles.reason}>{field.review}</span>}
                </span>
                <span className={styles.state} aria-hidden="true">
                  {filled && field.value && field.review && (
                    <span className={styles.warn}>
                      <QueryIcon className={styles.icon} />
                      Revisar
                    </span>
                  )}
                  {filled && field.value && !field.review && (
                    <span className={styles.ok}>
                      <CheckIcon className={styles.icon} />
                      Listo
                    </span>
                  )}
                  {absent && (
                    <span className={styles.none}>
                      <DashIcon className={styles.icon} />
                      Vacío
                    </span>
                  )}
                </span>
              </div>
            );
          })}

          <div className={`${styles.check} ${done ? styles.checkOn : ""}`}>
            <span className={styles.code}>299</span>
            <p className={styles.checkBody}>
              <CheckIcon className={styles.icon} />
              <span>
                Suma verificada: <b className={styles.figure}>120.00 + 18.00 = 138.00</b>
              </span>
            </p>
          </div>

          <div className={`${styles.dest} ${sent ? styles.destOn : ""}`} aria-live="polite">
            <span className={styles.code}>300</span>
            <div className={styles.destBody}>
              <p className={styles.destHead}>
                <SheetIcon className={styles.icon} />
                <span>
                  Google Sheets · <b>Compras 2026</b>
                </span>
                <span className={styles.destState}>
                  {sent ? (
                    <span className={styles.ok}>
                      <CheckIcon className={styles.icon} />
                      Enviado
                    </span>
                  ) : done ? (
                    "Enviando…"
                  ) : (
                    "En espera"
                  )}
                </span>
              </p>
              <table className={styles.sheet}>
                <thead>
                  <tr>
                    <th scope="col" aria-label="Fila" />
                    <th scope="col">Fecha</th>
                    <th scope="col">RUC</th>
                    <th scope="col">Proveedor</th>
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={sent ? styles.rowIn : undefined}>
                    <th scope="row">48</th>
                    <td>{sent ? "14/03/2026" : ""}</td>
                    <td>{sent ? "1790012345001" : ""}</td>
                    <td>{sent ? "Ferretería Los Andes" : ""}</td>
                    <td>{sent ? "138.00" : ""}</td>
                  </tr>
                </tbody>
              </table>
              <p className={styles.destMore}>También a su ERP, un correo o cualquier sistema por API.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className={styles.foot}>
        <span className={styles.tally}>
          {sent
            ? "6 listos · 1 para revisar · 1 vacío · fila 48 enviada"
            : done
              ? "Enviando a Google Sheets…"
              : "Leyendo la factura…"}
        </span>
        <button type="button" className={styles.replay} onClick={play} disabled={!sent}>
          <ReplayIcon className={styles.icon} />
          Repetir
        </button>
      </footer>
    </figure>
  );
}
