"use client";

import { useState } from "react";
import { CUSTOM_ID, ROLE_CHECK, ROLE_INFO, TEMPLATES, TYPE_INFO, keyFromLabel } from "@/lib/templates";
import type { FieldType, FormField, Role } from "@/lib/types";
import { Check } from "./Marks";
import s from "./FormEditor.module.css";

interface Props {
  templateId: string;
  title: string;
  fields: FormField[];
  onTemplate: (id: string) => void;
  onTitle: (title: string) => void;
  onFields: (fields: FormField[]) => void;
  onClearCustom: () => void;
  onDone: () => void;
}

/** One select for both: a plain type ("type:money") or a recognized, checked datum ("role:total"). */
function kindOf(f: FormField) {
  return f.role ? `role:${f.role}` : `type:${f.type}`;
}

export function FormEditor({ templateId, title, fields, onTemplate, onTitle, onFields, onClearCustom, onDone }: Props) {
  // A just-added field gets focus with its placeholder name selected.
  const [newKey, setNewKey] = useState<string | null>(null);
  const custom = templateId === CUSTOM_ID;
  const usedRoles = new Set(fields.map((f) => f.role).filter(Boolean));

  const update = (key: string, patch: Partial<FormField>) =>
    onFields(fields.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  const setKind = (f: FormField, value: string) => {
    const [kind, v] = value.split(":");
    if (kind === "role") {
      const role = v as Role;
      update(f.key, { role, type: ROLE_INFO[role].type, question: undefined });
    } else {
      update(f.key, { role: undefined, type: v as FieldType });
    }
  };

  const add = () => {
    const key = keyFromLabel("dato", new Set(fields.map((f) => f.key)));
    onFields([...fields, { key, label: "Dato nuevo", type: "text" }]);
    setNewKey(key);
  };

  return (
    <div className={s.editor}>
      <div className={s.head}>
        <h2 className={s.title}>Formulario</h2>
        <p className={s.lede}>Elige qué datos quieres sacar del documento. Empieza con una plantilla o arma el tuyo.</p>
      </div>

      <fieldset className={s.templates}>
        <legend className="visually-hidden">Plantilla</legend>
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
            <span className={s.templateCount}>{t.fields.length} datos</span>
          </label>
        ))}
        <label className={`${s.template} ${s.templateCustom}`} data-on={custom || undefined}>
          <input
            type="radio"
            name="template"
            value={CUSTOM_ID}
            checked={custom}
            onChange={() => onTemplate(CUSTOM_ID)}
            className="visually-hidden"
          />
          <span className={s.templateTitle}>Crear el mío</span>
          <span className={s.templateBlurb}>Un formulario temporal para tus pruebas.</span>
          <span className={s.templateCount}>Se guarda solo en este navegador</span>
        </label>
      </fieldset>

      {custom ? (
        <div className={s.customBar}>
          <label className={s.smallLabel} htmlFor="form-title">
            Nombre del formulario
          </label>
          <div className={s.customRow}>
            <input
              id="form-title"
              className={s.titleInput}
              value={title}
              maxLength={60}
              onChange={(e) => onTitle(e.target.value)}
            />
            <button type="button" className={s.link} onClick={onClearCustom}>
              Borrar y empezar de nuevo
            </button>
          </div>
        </div>
      ) : null}

      <div className={s.intro}>
        <h3 className={s.heading}>Datos a llenar</h3>
        <p className={s.introText}>
          Cada fila es un dato que buscamos en el documento. El tipo dice cómo leerlo. Los datos marcados con{" "}
          <Check className={s.inlineMark} /> los reconocemos y además los comprobamos solos.
        </p>
      </div>

      <div className={s.table} role="list">
        <div className={s.thead} aria-hidden>
          <span />
          <span>Nombre</span>
          <span>Tipo</span>
          <span>Qué buscar</span>
          <span />
        </div>
        {fields.map((f, i) => (
          <div key={f.key} className={s.row} role="listitem">
            <span className={s.n} aria-hidden>
              {i + 1}
            </span>

            <div className={s.cell}>
              <label className={s.cellLabel} htmlFor={`label-${f.key}`}>
                Nombre
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
            </div>

            <div className={s.cell}>
              <label className={s.cellLabel} htmlFor={`kind-${f.key}`}>
                Tipo
              </label>
              <select
                id={`kind-${f.key}`}
                className={s.typeSelect}
                value={kindOf(f)}
                data-checked={f.role ? true : undefined}
                onChange={(e) => setKind(f, e.target.value)}
              >
                <optgroup label="Se comprueban solos">
                  {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
                    <option key={r} value={`role:${r}`} disabled={usedRoles.has(r) && f.role !== r}>
                      ✓ {ROLE_INFO[r].label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Otro dato">
                  {Object.entries(TYPE_INFO).map(([v, t]) => (
                    <option key={v} value={`type:${v}`}>
                      {t.label} — p. ej. {t.example}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className={s.cell}>
              <label className={s.cellLabel} htmlFor={`q-${f.key}`}>
                Qué buscar
              </label>
              {f.role ? (
                <p className={s.auto}>
                  <Check className={s.autoMark} />
                  {ROLE_CHECK[f.role] ?? "Lo buscamos automáticamente."}
                </p>
              ) : (
                <>
                  <input
                    id={`q-${f.key}`}
                    className={s.hint}
                    value={f.question ?? ""}
                    maxLength={200}
                    placeholder={`Opcional. Vacío: buscamos «${f.label || "el dato"}»`}
                    onChange={(e) => update(f.key, { question: e.target.value || undefined })}
                  />
                </>
              )}
            </div>

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
        ))}
      </div>

      <p className={s.help}>
        «Qué buscar» es opcional: escríbelo en palabras normales (p. ej. «el nombre del mesero o cajero») cuando el nombre
        del dato pueda confundirse con otro del documento.
      </p>

      <div className={s.actions}>
        <button type="button" className={s.add} onClick={add} disabled={fields.length >= 20}>
          Agregar dato
        </button>
        <button type="button" className={s.done} onClick={onDone}>
          Listo, subir documento
        </button>
      </div>
    </div>
  );
}
