"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { shrinkForUpload } from "@/lib/image";
import { STATUS_LABEL, date, money, reason } from "@/lib/notes";
import { valueFromLine } from "@/lib/parse";
import {
  ALL_SAMPLES,
  CUSTOM_ID,
  EMPTY_CUSTOM,
  TEMPLATES,
  loadCustom,
  loadTemplateId,
  saveCustom,
  saveTemplateId,
  toEngineForm,
} from "@/lib/templates";
import type { Answer, ExtractResponse, FieldResult, FormField, Line } from "@/lib/types";
import { FormEditor } from "./FormEditor";
import { StatusMark } from "./Marks";
import { Sheet, type Mark } from "./Sheet";
import s from "./Demo.module.css";

const CONTACT_URL = process.env.NEXT_PUBLIC_CONTACT_URL;
// mailto: links open the mail app; only web links get a new tab.
const CONTACT_TARGET = CONTACT_URL?.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {};


type Phase = "idle" | "reading" | "done" | "error";

function formatValue(field: FormField, value: string | null): string {
  if (value == null) return "";
  if (field.type === "money") return money(value);
  if (field.type === "date") return date(value);
  return value;
}

const PHONE = "(max-width: 900px)";
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Demo() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [fields, setFields] = useState<FormField[]>(TEMPLATES[0].fields);
  const [editingForm, setEditingForm] = useState(false);
  const [customTitle, setCustomTitle] = useState(EMPTY_CUSTOM.title);

  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState("");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [landed, setLanded] = useState<Set<string>>(new Set());

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ value: string; lineId: string | null }>({ value: "", lineId: null });
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isPhone = useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );

  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const marginRef = useRef<HTMLElement>(null);
  const isCustom = templateId === CUSTOM_ID;
  const formTitle = isCustom
    ? customTitle.trim() || "Mi formulario"
    : (TEMPLATES.find((t) => t.id === templateId)?.title ?? "Formulario");
  const samples = isCustom ? ALL_SAMPLES : (TEMPLATES.find((t) => t.id === templateId)?.samples ?? []);

  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    saveTemplateId(id);
    if (id === CUSTOM_ID) {
      const c = loadCustom();
      setCustomTitle(c.title);
      setFields(c.fields);
    } else {
      setFields(TEMPLATES.find((x) => x.id === id)!.fields);
    }
  };
  // Restore the last chosen form after hydration (the server can't see localStorage).
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const id = loadTemplateId();
    if (!id || id === TEMPLATES[0].id) return;
    const c = id === CUSTOM_ID ? loadCustom() : null;
    startTransition(() => {
      setTemplateId(id);
      if (c) {
        setCustomTitle(c.title);
        setFields(c.fields);
      } else {
        setFields(TEMPLATES.find((x) => x.id === id)!.fields);
      }
    });
  }, []);

  const editFields = (next: FormField[]) => {
    setFields(next);
    if (isCustom) saveCustom({ title: customTitle, fields: next });
  };
  const editTitle = (title: string) => {
    setCustomTitle(title);
    saveCustom({ title, fields });
  };
  const clearCustom = () => {
    saveCustom(null);
    setCustomTitle(EMPTY_CUSTOM.title);
    setFields(EMPTY_CUSTOM.fields);
  };
  // The fields the current result was read with (the editor may change `fields` later).
  const [readFields, setReadFields] = useState<FormField[]>(fields);

  useEffect(() => () => void (localPreview && URL.revokeObjectURL(localPreview)), [localPreview]);

  const resultByKey = useMemo(
    () => new Map<string, FieldResult>((result?.fields ?? []).map((f) => [f.key, f])),
    [result],
  );
  const shownFields = phase === "done" ? readFields : fields;
  const totalLabel = readFields.find((f) => f.role === "total")?.label;

  const read = useCallback(
    async (raw: File) => {
      setEditingForm(false);
      setCorrecting(null);
      setShowJson(false);
      setSheetOpen(false);
      setResult(null);
      setAnswers({});
      setLanded(new Set());
      setError("");
      setFileName(raw.name);
      setLocalPreview(raw.type.startsWith("image/") && !/hei[cf]/i.test(raw.type) ? URL.createObjectURL(raw) : null);
      setPhase("reading");
      setReadFields(fields);
      sheetRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

      try {
        const file = await shrinkForUpload(raw);
        const body = new FormData();
        body.set("file", file);
        body.set("form", JSON.stringify(toEngineForm(formTitle, fields)));
        const res = await fetch("/api/extract", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "No pudimos leer el documento.");
        const data = json as ExtractResponse;
        const next: Record<string, Answer> = {};
        for (const f of data.fields) {
          next[f.key] = { value: f.value, status: f.status, lineId: f.value_line_id ?? f.raw_line_id };
        }
        setResult(data);
        setAnswers(next);
        setPhase("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pudimos leer el documento.");
        setPhase("error");
      }
    },
    [fields, formTitle],
  );

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void read(f);
  };

  const trySample = async (path: string) => {
    const res = await fetch(path);
    const blob = await res.blob();
    void read(new File([blob], path.split("/").pop() ?? "ejemplo", { type: blob.type }));
  };

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setAnswers({});
    setLocalPreview(null);
    setCorrecting(null);
    setShowJson(false);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
    if (cameraInput.current) cameraInput.current.value = "";
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  // Signature: each value travels from its highlighted line into its note.
  useEffect(() => {
    if (phase !== "done" || !result) return;
    const timers: number[] = [];
    const reduce = prefersReducedMotion();
    const keys = readFields.map((f) => f.key);
    keys.forEach((key, i) => {
      const land = () => setLanded((prev) => new Set(prev).add(key));
      const delay = 380 + i * 110;
      timers.push(
        window.setTimeout(() => {
          const from = sheetRef.current?.querySelector<HTMLElement>(`[data-key="${key}"]`);
          const to = marginRef.current?.querySelector<HTMLElement>(`[data-value="${key}"]`);
          const text = to?.textContent;
          if (reduce || !from || !to || !text) return land();
          const a = from.getBoundingClientRect();
          const b = to.getBoundingClientRect();
          const inView = (r: DOMRect) => r.bottom > 0 && r.top < window.innerHeight;
          if (!inView(a) || !inView(b)) return land();
          const ghost = document.createElement("span");
          ghost.className = s.ghost;
          ghost.textContent = text;
          ghost.style.left = `${b.left}px`;
          ghost.style.top = `${b.top}px`;
          document.body.appendChild(ghost);
          const dx = a.left - b.left;
          const dy = a.top + a.height / 2 - (b.top + b.height / 2);
          const anim = ghost.animate(
            [
              { transform: `translate(${dx}px, ${dy}px) scale(0.7)`, opacity: 0.2 },
              { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 18}px) scale(0.92)`, opacity: 1, offset: 0.55 },
              { transform: "translate(0, 0) scale(1)", opacity: 1 },
            ],
            { duration: 620, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
          );
          anim.onfinish = () => {
            land();
            ghost.remove();
          };
        }, delay),
      );
    });
    return () => {
      timers.forEach(clearTimeout);
      document.querySelectorAll(`.${s.ghost}`).forEach((g) => g.remove());
    };
  }, [phase, result, readFields]);

  const marks: Mark[] = useMemo(
    () =>
      phase === "done"
        ? readFields.flatMap((f, i) => {
            const a = answers[f.key];
            return a?.lineId && a.value != null
              ? [{ key: f.key, n: i + 1, label: f.label, lineId: a.lineId, status: a.status }]
              : [];
          })
        : [],
    [answers, phase, readFields],
  );

  const pages = useMemo(() => {
    const previews = result?.document.previews;
    if (previews?.length) return previews.map((p) => `data:image/jpeg;base64,${p}`);
    return localPreview ? [localPreview] : [];
  }, [result, localPreview]);

  const startCorrect = (key: string) => {
    const a = answers[key];
    setCorrecting(key);
    setDraft({ value: a?.value ?? "", lineId: a?.lineId ?? null });
    if (isPhone) setSheetOpen(true);
  };

  const pickLine = (line: Line) => {
    if (!correcting) return;
    const f = readFields.find((x) => x.key === correcting);
    if (!f) return;
    setDraft({ value: valueFromLine(f.type, line.text), lineId: line.id });
    const input = marginRef.current?.querySelector<HTMLInputElement>(`[data-draft="${correcting}"]`);
    input?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    input?.focus();
  };

  const saveCorrection = () => {
    if (!correcting) return;
    const value = draft.value.trim();
    setAnswers((prev) => ({
      ...prev,
      [correcting]: { value: value || null, status: value ? "corrected" : "empty", lineId: value ? draft.lineId : null },
    }));
    setLanded((prev) => new Set(prev).add(correcting));
    setCorrecting(null);
  };

  const counts = useMemo(() => {
    const c = { green: 0, yellow: 0, empty: 0, corrected: 0 };
    for (const f of readFields) {
      const a = answers[f.key];
      if (a) c[a.status]++;
    }
    return c;
  }, [answers, readFields]);

  const exportData = useMemo(() => {
    if (!result) return null;
    const campos: Record<string, { etiqueta: string; valor: string | null; estado: string }> = {};
    for (const f of readFields) {
      const a = answers[f.key];
      campos[f.key] = { etiqueta: f.label, valor: a?.value ?? null, estado: a ? STATUS_LABEL[a.status] : "" };
    }
    const { document: doc, lines: _lines, ...rest } = result;
    void _lines;
    return {
      formulario: formTitle,
      campos,
      respuesta_del_lector: { ...rest, document: { ...doc, previews: undefined } },
    };
  }, [answers, result, formTitle, readFields]);

  const jsonText = exportData ? JSON.stringify(exportData, null, 2) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setShowJson(true);
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([jsonText], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.\w+$/, "") || "comprobante"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasSheet = phase !== "idle" && (pages.length > 0 || phase !== "error");

  return (
    <div className={s.desk} data-phase={phase}>
      <header className={s.top}>
        <button type="button" className={s.wordmark} onClick={reset} aria-label="jev-forms, volver al inicio">
          jev<span className={s.wordmarkDot}>·</span>forms
        </button>
        {CONTACT_URL ? (
          <a className={s.topLink} href={CONTACT_URL} {...CONTACT_TARGET}>
            Me interesa
          </a>
        ) : null}
      </header>

      <main className={s.grid}>
        <section
          ref={sheetRef}
          className={s.sheetCol}
          data-open={sheetOpen || undefined}
          aria-label="Documento"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileInput}
            type="file"
            accept="image/*,.heic,.heif,application/pdf"
            className="visually-hidden"
            tabIndex={-1}
            onChange={(e) => onFiles(e.target.files)}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="visually-hidden"
            tabIndex={-1}
            onChange={(e) => onFiles(e.target.files)}
          />

          {editingForm && !hasSheet ? (
            <div className={s.editorSheet}>
              <FormEditor
                templateId={templateId}
                title={customTitle}
                fields={fields}
                onTemplate={chooseTemplate}
                onTitle={editTitle}
                onFields={editFields}
                onClearCustom={clearCustom}
                onDone={() => {
                  setEditingForm(false);
                  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
                }}
              />
            </div>
          ) : !hasSheet ? (
            <div className={s.blank} data-dragging={dragging || undefined}>
              <div className={s.blankInner}>
                <h1 className={s.title}>
                  Tu comprobante, <span className={s.titleMark}>revisado</span>.
                </h1>
                <p className={s.lede}>
                  Sube una foto o PDF de una factura, nota de venta o precuenta. Marcamos cada dato: qué está listo, qué
                  conviene revisar y qué no aparece.
                </p>
                {phase === "error" ? (
                  <p className={s.error} role="alert">
                    {error}
                  </p>
                ) : null}
                <div className={s.actions}>
                  <button type="button" className={`${s.primary} ${s.cameraOnly}`} onClick={() => cameraInput.current?.click()}>
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.4-2h6.2l1.4 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    Tomar foto
                  </button>
                  <button type="button" className={s.secondary} onClick={() => fileInput.current?.click()}>
                    Elegir archivo
                  </button>
                  <span className={s.dropHint}>o suéltalo sobre esta hoja</span>
                </div>
                <div className={s.samples}>
                  <p className={s.samplesLabel}>
                    ¿No tienes uno a mano? Prueba con un ejemplo para «{formTitle}»:
                  </p>
                  <ul>
                    {samples.map((x) => (
                      <li key={x.file}>
                        <button type="button" className={s.sample} onClick={() => void trySample(x.file)}>
                          <span className={s.sampleName}>{x.label}</span> <span className={s.sampleKind}>{x.kind}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <>
              {phase === "reading" && !pages.length ? (
                <div className={s.blank}>
                  <div className={s.blankInner}>
                    <p className={s.fileName}>{fileName}</p>
                  </div>
                </div>
              ) : (
                <Sheet
                  pages={pages}
                  dimensions={result?.document.dimensions}
                  compact={isPhone && phase === "done" && !sheetOpen}
                  lines={result?.lines ?? []}
                  marks={marks}
                  activeKey={activeKey}
                  picking={Boolean(correcting)}
                  reading={phase === "reading"}
                  onPickLine={pickLine}
                  onHover={setActiveKey}
                />
              )}
              {phase === "reading" ? (
                <p className={s.reading} role="status">
                  <span className={s.readingStroke} aria-hidden />
                  Leyendo el documento…
                </p>
              ) : null}
              {phase === "error" ? (
                <div className={s.errorBox} role="alert">
                  <p>{error}</p>
                  <button type="button" className={s.secondary} onClick={reset}>
                    Probar con otro
                  </button>
                </div>
              ) : null}
              {phase === "done" ? (
                <button type="button" className={s.expand} onClick={() => setSheetOpen((v) => !v)}>
                  {sheetOpen ? "Ver menos del documento" : "Ver el documento completo"}
                </button>
              ) : null}
            </>
          )}
        </section>

        <aside ref={marginRef} className={s.margin} aria-label="Formulario">
          {(
            <>
              <div className={s.marginHead}>
                <h2 className={s.marginTitle}>{formTitle}</h2>
                {editingForm ? (
                  <span className={s.previewTag}>Vista previa</span>
                ) : phase !== "reading" ? (
                  <button
                    type="button"
                    className={s.link}
                    onClick={() => {
                      if (phase === "done") reset();
                      setEditingForm(true);
                      sheetRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
                    }}
                  >
                    {phase === "done" ? "Usar otro formulario" : "Editar formulario"}
                  </button>
                ) : null}
              </div>

              {phase === "done" ? (
                <p className={s.tally}>
                  {/* Ink and marks only for counts that are more than zero: red means work to do. */}
                  <span className={counts.green + counts.corrected ? s.tallyOk : undefined}>
                    {counts.green + counts.corrected ? <StatusMark status="green" className={s.tallyMark} /> : null}
                    {counts.green + counts.corrected} {counts.green + counts.corrected === 1 ? "listo" : "listos"}
                  </span>
                  <span className={counts.yellow ? s.tallyWarn : undefined}>
                    {counts.yellow ? <StatusMark status="yellow" className={s.tallyMark} /> : null}
                    {counts.yellow} por revisar
                  </span>
                  <span className={counts.empty ? s.tallyAbsent : undefined}>
                    {counts.empty ? <StatusMark status="empty" className={s.tallyMark} /> : null}
                    {counts.empty} no {counts.empty === 1 ? "aparece" : "aparecen"}
                  </span>
                </p>
              ) : (
                <p className={s.marginLede}>
                  {phase === "reading"
                    ? "Buscando cada dato en el documento…"
                    : `Estos ${fields.length} datos se llenarán al leer tu documento.`}
                </p>
              )}

              <ol className={s.notes}>
                {shownFields.map((f, i) => {
                  const a = answers[f.key];
                  const status = phase === "done" && a ? a.status : null;
                  const isCorrecting = correcting === f.key;
                  const pending = phase === "done" && !landed.has(f.key);
                  return (
                    <li
                      key={f.key}
                      className={s.note}
                      data-status={status ?? undefined}
                      data-active={activeKey === f.key || undefined}
                      onMouseEnter={() => setActiveKey(f.key)}
                      onMouseLeave={() => setActiveKey(null)}
                      onFocus={() => setActiveKey(f.key)}
                      onBlur={() => setActiveKey(null)}
                    >
                      <span className={s.noteN} aria-hidden>
                        {i + 1}
                      </span>
                      <div className={s.noteBody}>
                        <div className={s.noteHead}>
                          <span className={s.noteLabel}>{f.label}</span>
                          {status ? (
                            <span className={s.noteStatus} data-pending={pending || undefined}>
                              <StatusMark status={status} className={s.noteMark} />
                              {STATUS_LABEL[status]}
                            </span>
                          ) : null}
                        </div>

                        {isCorrecting ? (
                          <div className={s.correct}>
                            <label className="visually-hidden" htmlFor={`draft-${f.key}`}>
                              Valor correcto de {f.label}
                            </label>
                            <input
                              id={`draft-${f.key}`}
                              data-draft={f.key}
                              className={s.draft}
                              value={draft.value}
                              autoFocus
                              onChange={(e) => setDraft({ value: e.target.value, lineId: null })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveCorrection();
                                if (e.key === "Escape") setCorrecting(null);
                              }}
                            />
                            <p className={s.pickHint}>Escríbelo o toca la línea correcta en el documento.</p>
                            <div className={s.correctActions}>
                              <button type="button" className={s.save} onClick={saveCorrection}>
                                Guardar
                              </button>
                              <button type="button" className={s.link} onClick={() => setCorrecting(null)}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : status ? (
                          <>
                            {status === "empty" ? (
                              <p className={s.noteReason}>
                                <button type="button" className={s.link} onClick={() => startCorrect(f.key)}>
                                  Agregar a mano
                                </button>
                              </p>
                            ) : (
                              <>
                                <p className={s.noteValue} data-value={f.key} data-pending={pending || undefined} data-type={f.type}>
                                  {formatValue(f, a?.value ?? null)}
                                </p>
                                <p className={s.noteReason} data-pending={pending || undefined}>
                                  {reason({ field: f, result: resultByKey.get(f.key), answer: a!, totalLabel })}{" "}
                                  <button type="button" className={s.link} onClick={() => startCorrect(f.key)}>
                                    Corregir
                                  </button>
                                </p>
                              </>
                            )}
                          </>
                        ) : (
                          <p className={s.noteBlank} data-reading={phase === "reading" || undefined} aria-hidden />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {phase === "done" ? (
                <div className={s.after}>
                  <div className={s.afterActions}>
                    <button type="button" className={s.primary} onClick={reset}>
                      Probar otro documento
                    </button>
                    <button type="button" className={s.secondary} onClick={() => setShowJson((v) => !v)} aria-expanded={showJson}>
                      {showJson ? "Ocultar datos" : "Ver datos (JSON)"}
                    </button>
                  </div>
                  {showJson ? (
                    <div className={s.json}>
                      <div className={s.jsonBar}>
                        <button type="button" className={s.link} onClick={copy}>
                          {copied ? "Copiado" : "Copiar"}
                        </button>
                        <button type="button" className={s.link} onClick={download}>
                          Descargar .json
                        </button>
                      </div>
                      <pre className={s.jsonPre}>{jsonText}</pre>
                    </div>
                  ) : null}
                  {CONTACT_URL ? (
                    <p className={s.contact}>
                      ¿Te serviría para tu negocio?{" "}
                      <a href={CONTACT_URL} {...CONTACT_TARGET}>
                        Escríbenos
                      </a>
                      .
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </aside>
      </main>

      {correcting ? (
        <p className={s.pickBanner} role="status">
          Toca en el documento la línea con «{readFields.find((f) => f.key === correcting)?.label}».
        </p>
      ) : null}
    </div>
  );
}
