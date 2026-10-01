"use client";

import { useId, useState } from "react";
import { HAS_WHATSAPP, contactHref } from "@/lib/site";
import { MailIcon, WhatsAppIcon } from "./Icons";
import styles from "./QuoteForm.module.css";

const PRODUCTS = [
  { id: "formularios", name: "Formularios", note: "Leer comprobantes y llenar formularios" },
  { id: "gestor", name: "Gestor", note: "Archivar y encontrar todos los documentos" },
  { id: "suite", name: "Suite completa", note: "Formularios y Gestor" },
] as const;

const INSTALLS = [
  { id: "nube", name: "En la nube de docutecec" },
  { id: "servidor", name: "En el servidor de mi empresa" },
  { id: "nose", name: "Aún no lo sé" },
] as const;

const VOLUMES = ["Menos de 500", "De 500 a 5.000", "Más de 5.000"];
const USERS = ["De 1 a 5", "De 6 a 25", "Más de 25"];

export default function QuoteForm() {
  const [product, setProduct] = useState<string>("suite");
  const [install, setInstall] = useState<string>("nube");
  const [volume, setVolume] = useState(VOLUMES[1]);
  const [users, setUsers] = useState(USERS[0]);
  const [company, setCompany] = useState("");
  const id = useId();

  const productName = PRODUCTS.find((p) => p.id === product)!.name;
  const installName = INSTALLS.find((i) => i.id === install)!.name.toLowerCase();

  const message = [
    `Hola, quiero una cotización de docutecec ${productName}.`,
    company.trim() ? `Empresa: ${company.trim()}.` : null,
    `Instalación: ${installName}.`,
    `Documentos al mes: ${volume.toLowerCase()}.`,
    `Usuarios: ${users.toLowerCase()}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <form className={styles.form} onSubmit={(e) => e.preventDefault()} aria-label="Solicitud de cotización">
      <fieldset className={styles.row}>
        <legend className={styles.head}>
          <span className={styles.code}>301</span>
          <span className={styles.label}>Qué necesita</span>
        </legend>
        <div className={styles.options}>
          {PRODUCTS.map((p) => (
            <label key={p.id} className={styles.option}>
              <input type="radio" name={`${id}-product`} value={p.id} checked={product === p.id} onChange={() => setProduct(p.id)} />
              <span className={styles.box} aria-hidden="true" />
              <span className={styles.optText}>
                <b>{p.name}</b>
                <span>{p.note}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.row}>
        <legend className={styles.head}>
          <span className={styles.code}>302</span>
          <span className={styles.label}>Dónde se instala</span>
        </legend>
        <div className={styles.options}>
          {INSTALLS.map((i) => (
            <label key={i.id} className={styles.option}>
              <input type="radio" name={`${id}-install`} value={i.id} checked={install === i.id} onChange={() => setInstall(i.id)} />
              <span className={styles.box} aria-hidden="true" />
              <span className={styles.optText}>
                <b>{i.name}</b>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.pair}>
        <label className={styles.cell}>
          <span className={styles.head}>
            <span className={styles.code}>303</span>
            <span className={styles.label}>Documentos al mes</span>
          </span>
          <select value={volume} onChange={(e) => setVolume(e.target.value)}>
            {VOLUMES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className={styles.cell}>
          <span className={styles.head}>
            <span className={styles.code}>304</span>
            <span className={styles.label}>Personas que lo usarán</span>
          </span>
          <select value={users} onChange={(e) => setUsers(e.target.value)}>
            {USERS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <label className={`${styles.cell} ${styles.full}`}>
        <span className={styles.head}>
          <span className={styles.code}>305</span>
          <span className={styles.label}>Empresa (opcional)</span>
        </span>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Razón social o nombre comercial"
          autoComplete="organization"
          maxLength={80}
        />
      </label>

      <div className={styles.preview}>
        <span className={styles.head}>
          <span className={styles.code}>399</span>
          <span className={styles.label}>Mensaje que se enviará</span>
        </span>
        <p className={styles.message}>{message}</p>
      </div>

      <div className={styles.submit}>
        <a className={styles.send} href={contactHref(message)} target="_blank" rel="noopener noreferrer">
          {HAS_WHATSAPP ? <WhatsAppIcon className={styles.icon} /> : <MailIcon className={styles.icon} />}
          {HAS_WHATSAPP ? "Enviar por WhatsApp" : "Enviar por correo"}
        </a>
        <p className={styles.fine}>Le respondemos con una propuesta según su volumen. Sin compromiso.</p>
      </div>
    </form>
  );
}
