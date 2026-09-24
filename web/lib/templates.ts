import type { FieldType, FormField, FormTemplate, Role } from "./types";

// Fields with a role get the engine's default question and its cross-checks
// (access key for RUC/number/date, subtotal + IVA = total for amounts).

export const TEMPLATES: FormTemplate[] = [
  {
    id: "sorteo",
    title: "Sorteo por compras",
    blurb: "Registrar una compra para participar en una promoción.",
    fields: [
      { key: "ruc_emisor", label: "RUC del negocio", type: "ruc", role: "ruc_emisor" },
      {
        key: "razon_social",
        label: "Negocio",
        type: "text",
        question:
          "la razón social de la empresa que vende (si no aparece, el nombre del negocio), no el nombre del cliente",
      },
      { key: "numero_factura", label: "Nº de factura", type: "invoice_number", role: "numero_factura" },
      { key: "fecha_emision", label: "Fecha", type: "date", role: "fecha_emision" },
      { key: "subtotal", label: "Subtotal", type: "money", role: "subtotal" },
      { key: "iva", label: "IVA", type: "money", role: "iva" },
      { key: "total", label: "Total", type: "money", role: "total" },
    ],
    samples: [{ file: "/samples/factura-supermercado.pdf", label: "Factura de supermercado", kind: "PDF" }],
  },
  {
    id: "restaurante",
    title: "Consumo en restaurante",
    blurb: "Pasar una precuenta o factura de restaurante a un registro.",
    fields: [
      {
        key: "local",
        label: "Restaurante",
        type: "text",
        question: "el nombre del restaurante o negocio",
      },
      { key: "ruc_local", label: "RUC", type: "ruc", role: "ruc_emisor" },
      { key: "fecha", label: "Fecha", type: "date", role: "fecha_emision" },
      { key: "mesa", label: "Mesa", type: "text", question: "el número o nombre de la mesa" },
      { key: "mesero", label: "Atendió", type: "text", question: "el nombre del mesero o cajero" },
      { key: "subtotal", label: "Subtotal", type: "money", role: "subtotal" },
      { key: "iva", label: "IVA", type: "money", role: "iva" },
      { key: "total", label: "Total a pagar", type: "money", role: "total" },
    ],
    samples: [
      { file: "/samples/precuenta-restaurante.jpg", label: "Precuenta de restaurante", kind: "foto" },
      { file: "/samples/precuenta-inclinada.jpg", label: "Precuenta, foto inclinada", kind: "foto" },
    ],
  },
  {
    id: "reembolso",
    title: "Reembolso de gastos",
    blurb: "Pedir la devolución de un gasto de trabajo.",
    fields: [
      {
        key: "proveedor",
        label: "Proveedor",
        type: "text",
        question: "el nombre del negocio que vendió, no el del cliente",
      },
      { key: "ruc_proveedor", label: "RUC del proveedor", type: "ruc", role: "ruc_emisor" },
      { key: "numero", label: "Nº de factura", type: "invoice_number", role: "numero_factura" },
      { key: "fecha", label: "Fecha", type: "date", role: "fecha_emision" },
      {
        key: "concepto",
        label: "Qué se compró",
        type: "text",
        question: "el primer producto o servicio comprado",
      },
      { key: "total", label: "Monto", type: "money", role: "total" },
    ],
    samples: [{ file: "/samples/factura-hotel.pdf", label: "Factura de hotel", kind: "PDF" }],
  },
];

/** How each type reads a value, in the visitor's terms. */
export const TYPE_INFO: Record<FieldType, { label: string; example: string }> = {
  text: { label: "Texto", example: "un nombre" },
  money: { label: "Monto", example: "$ 12,50" },
  date: { label: "Fecha", example: "16/09/2026" },
  ruc: { label: "RUC", example: "13 dígitos" },
  invoice_number: { label: "Nº de factura", example: "001-001-000000123" },
};

/** Data the engine recognizes and double-checks; offered as types in the editor. */
export const ROLE_INFO: Record<Role, { label: string; type: FieldType }> = {
  ruc_emisor: { label: "RUC del vendedor", type: "ruc" },
  numero_factura: { label: "Nº de factura", type: "invoice_number" },
  fecha_emision: { label: "Fecha de emisión", type: "date" },
  subtotal: { label: "Subtotal", type: "money" },
  iva: { label: "IVA", type: "money" },
  total: { label: "Total a pagar", type: "money" },
  descuento: { label: "Descuento", type: "money" },
  servicio: { label: "Servicio / propina", type: "money" },
  ice: { label: "ICE", type: "money" },
};

/** What the engine checks for fields with a role. */
export const ROLE_CHECK: Partial<Record<Role, string>> = {
  ruc_emisor: "Se compara con la clave de acceso de la factura.",
  numero_factura: "Se compara con la clave de acceso de la factura.",
  fecha_emision: "Se compara con la clave de acceso de la factura.",
  subtotal: "Entra en la suma: subtotal + IVA = total.",
  iva: "Entra en la suma: subtotal + IVA = total.",
  total: "Se comprueba con la suma del subtotal y el IVA.",
  descuento: "Entra en la suma del total.",
  servicio: "Entra en la suma del total.",
  ice: "Entra en la suma del total.",
};

// ------------------------------------------------------- temporary form ---
// "Crear el mío": a form the visitor builds for their own tests. It lives only
// in this browser (localStorage), so no account or server storage is needed.

export const CUSTOM_ID = "custom";
const CUSTOM_KEY = "jev-forms:custom-form";

export interface CustomForm {
  title: string;
  fields: FormField[];
}

export const EMPTY_CUSTOM: CustomForm = {
  title: "Mi formulario",
  fields: [
    { key: "negocio", label: "Negocio", type: "text", question: "el nombre del negocio que vende" },
    { key: "total", label: "Total a pagar", type: "money", role: "total" },
  ],
};

export function loadCustom(): CustomForm {
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    const parsed = raw ? (JSON.parse(raw) as CustomForm) : null;
    if (parsed && Array.isArray(parsed.fields) && parsed.fields.length) return parsed;
  } catch {}
  return EMPTY_CUSTOM;
}

export function saveCustom(form: CustomForm | null) {
  try {
    if (form) window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(form));
    else window.localStorage.removeItem(CUSTOM_KEY);
  } catch {}
}

const TEMPLATE_KEY = "jev-forms:template";

/** The form the visitor last chose, so a reload keeps it. */
export function loadTemplateId(): string | null {
  try {
    const id = window.localStorage.getItem(TEMPLATE_KEY);
    return id && (id === CUSTOM_ID || TEMPLATES.some((t) => t.id === id)) ? id : null;
  } catch {
    return null;
  }
}

export function saveTemplateId(id: string) {
  try {
    window.localStorage.setItem(TEMPLATE_KEY, id);
  } catch {}
}

/** Every sample once: a custom form can be tried on any of them. */
export const ALL_SAMPLES = TEMPLATES.flatMap((t) => t.samples).filter(
  (x, i, all) => all.findIndex((y) => y.file === x.file) === i,
);

export function keyFromLabel(label: string, taken: Set<string>): string {
  const base =
    label
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^(\d)/, "c_$1")
      .slice(0, 40) || "campo";
  let key = base;
  for (let i = 2; taken.has(key); i++) key = `${base}_${i}`;
  return key;
}

/** The visitor writes what to look for ("el nombre del mesero"); the matcher
 *  gets it as a question about lines. A full question they typed goes as is. */
function engineQuestion(what: string | undefined): string | undefined {
  const t = what?.trim().replace(/[.?]+$/, "");
  if (!t) return undefined;
  if (t.startsWith("¿")) return `${t}?`;
  return `¿Qué línea contiene ${t}?`;
}

/** The engine's form JSON: roles and questions only when set. */
export function toEngineForm(title: string, fields: FormField[]) {
  return {
    title,
    fields: fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      ...(f.role ? { role: f.role } : {}),
      ...(engineQuestion(f.question) ? { question: engineQuestion(f.question) } : {}),
    })),
  };
}
