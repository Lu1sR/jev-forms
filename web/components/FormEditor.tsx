"use client";

import { useState } from "react";
import { TEMPLATES, TYPE_LABELS, keyFromLabel } from "@/lib/templates";
import type { FieldType, FormField } from "@/lib/types";
import s from "./FormEditor.module.css";

interface Props {
  templateId: string;
  fields: FormField[];
  onTemplate: (id: string) => void;
  onFields: (fields: FormField[]) => void;
  onDone: () => void;
}

const ROLE_NOTE: Partial<Record<NonNullable<FormField["role"]>, string>> = {
  ruc_emisor: "se compara con la clave de acceso",
  numero_factura: "se compara con la clave de acceso",
  fecha_emision: "se compara con la clave de acceso",
  subtotal: "entra en la suma del total",
  iva: "entra en la suma del total",
  total: "se comprueba con la suma",
};

export function FormEditor({ templateId, fields, onTemplate, onFields, onDone }: Props) {
  // A just-added field gets focus with its placeholder name selected.
  const [newKey, setNewKey] = useState<string | null>(null);

  const update = (key: string, patch: Partial<FormField>) =>
    onFields(fields.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  const add = () => {
    const key = keyFromLabel("campo nuevo", new Set(fields.map((f) => f.key)));
    onFields([...fields, { key, label: "Campo nuevo", type: "text" }]);
    setNewKey(key);
  };

  return (
    <div className={s.editor}>
      <fieldset className={s.templates}>
        <legend className={s.legend}>Empieza desde</legend>
        {TEMPLATES.map((t) => (
          <label key={t.id} className={s.template} data-on={t.id === templateId || undefined}>
            <input
              type="radio"
              name="template"
              value={t.id}
              checked={t.id === templateId}
              onChange={() => onTemplate(t.id)}
              className="visually-hidden"
            />
            <span className={s.templateTitle}>{t.title}</span>
            <span className={s.templateBlurb}>{t.blurb}</span>
          </label>
        ))}
      </fieldset>

      <h3 className={s.heading}>Campos a llenar</h3>
      <ol className={s.fields}>
        {fields.map((f, i) => (
          <li key={f.key} className={s.field}>
            <span className={s.n} aria-hidden>
              {i + 1}
            </span>
            <div className={s.fieldBody}>
              <div className={s.row}>
                <label className="visually-hidden" htmlFor={`label-${f.key}`}>
                  Nombre del campo {i + 1}
                </label>
                <input
                  id={`label-${f.key}`}
                  className={s.labelInput}
                  autoFocus={f.key === newKey}
                  onFocus={(e) => f.key === newKey && e.target.select()}
                  value={f.label}
                  maxLength={60}
                  onChange={(e) => update(f.key, { label: e.target.value })}
                />
                <label className="visually-hidden" htmlFor={`type-${f.key}`}>
                  Tipo de dato
                </label>
                <select
                  id={`type-${f.key}`}
                  className={s.typeSelect}
                  value={f.type}
                  disabled={Boolean(f.role)}
                  onChange={(e) => update(f.key, { type: e.target.value as FieldType })}
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={s.remove}
                  onClick={() => onFields(fields.filter((x) => x.key !== f.key))}
                  disabled={fields.length === 1}
                  aria-label={`Quitar «${f.label}»`}
                >
                  <svg viewBox="0 0 16 16" aria-hidden>
                    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {f.role ? (
                <p className={s.roleNote}>{ROLE_NOTE[f.role]}</p>
              ) : (
                <input
                  className={s.hint}
                  value={f.question ?? ""}
                  maxLength={200}
                  placeholder="Pista opcional: qué buscar, p. ej. «el número de mesa»"
                  aria-label={`Pista para «${f.label}»`}
                  onChange={(e) => update(f.key, { question: e.target.value || undefined })}
                />
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className={s.actions}>
        <button type="button" className={s.add} onClick={add} disabled={fields.length >= 20}>
          Agregar campo
        </button>
        <button type="button" className={s.done} onClick={onDone}>
          Listo
        </button>
      </div>
    </div>
  );
}
