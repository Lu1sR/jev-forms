import type { FieldType, FormField, FormTemplate } from "./types";

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
          "¿Qué línea contiene la razón social de la empresa EMISORA (quien vende)? Si no aparece, el nombre del negocio. No el nombre del cliente.",
      },
      { key: "numero_factura", label: "Nº de factura", type: "invoice_number", role: "numero_factura" },
      { key: "fecha_emision", label: "Fecha", type: "date", role: "fecha_emision" },
      { key: "subtotal", label: "Subtotal", type: "money", role: "subtotal" },
      { key: "iva", label: "IVA", type: "money", role: "iva" },
      { key: "total", label: "Total", type: "money", role: "total" },
    ],
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
        question: "¿Qué línea contiene el nombre del restaurante o negocio?",
      },
      { key: "ruc_local", label: "RUC", type: "ruc", role: "ruc_emisor" },
      { key: "fecha", label: "Fecha", type: "date", role: "fecha_emision" },
      { key: "mesa", label: "Mesa", type: "text", question: "¿Qué línea contiene el número o nombre de la mesa?" },
      { key: "mesero", label: "Atendió", type: "text", question: "¿Qué línea contiene el nombre del mesero o cajero?" },
      { key: "subtotal", label: "Subtotal", type: "money", role: "subtotal" },
      { key: "iva", label: "IVA", type: "money", role: "iva" },
      { key: "total", label: "Total a pagar", type: "money", role: "total" },
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
        question: "¿Qué línea contiene el nombre del negocio que vendió (no el del cliente)?",
      },
      { key: "ruc_proveedor", label: "RUC del proveedor", type: "ruc", role: "ruc_emisor" },
      { key: "numero", label: "Nº de factura", type: "invoice_number", role: "numero_factura" },
      { key: "fecha", label: "Fecha", type: "date", role: "fecha_emision" },
      {
        key: "concepto",
        label: "Qué se compró",
        type: "text",
        question: "¿Qué línea describe el primer producto o servicio comprado?",
      },
      { key: "total", label: "Monto", type: "money", role: "total" },
    ],
  },
];

export const TYPE_LABELS: Record<FieldType, string> = {
  text: "Texto",
  money: "Monto",
  date: "Fecha",
  ruc: "RUC",
  invoice_number: "Nº de factura",
};

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

/** The engine's form JSON: roles and questions only when set. */
export function toEngineForm(title: string, fields: FormField[]) {
  return {
    title,
    fields: fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      ...(f.role ? { role: f.role } : {}),
      ...(f.question ? { question: f.question } : {}),
    })),
  };
}
