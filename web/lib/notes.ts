import type { Answer, FieldResult, FormField } from "./types";

// The engine's validation notes are written for developers ("Valor tomado de la
// línea vecina L37", "85.15", "2018-05-14"). The visitor gets one plain sentence
// per field, with amounts and dates written the way the rest of the page shows them.

const HIDDEN = ["Valor tomado de la línea vecina", "Secuencial completado"];

export function money(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n)
    ? `$ ${n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : String(value);
}

export function date(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

/** Engine note -> local formats: ISO dates to dd/mm/aaaa, amounts to "$ 1.234,56". */
function localize(note: string): string {
  return note
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y, m, d) => `${d}/${m}/${y}`)
    .replace(/(?<![\d-])(\d+\.\d{2})(?![\d-])/g, (_, n) => money(n));
}

interface Context {
  field: FormField;
  result: FieldResult | undefined;
  answer: Answer;
  /** Label of the form's total, to point subtotal and IVA at the one sum sentence. */
  totalLabel?: string;
}

export function reason({ field, result, answer, totalLabel }: Context): string {
  if (answer.status === "corrected") return "Corregido por ti.";
  if (answer.status === "empty" || !result) return "";
  const notes = result.validation_notes.filter((n) => !HIDDEN.some((h) => n.startsWith(h)));

  if (answer.status === "green") {
    if (result.source === "clave_acceso") return "Tomado de la clave de acceso de la factura.";
    if (notes.some((n) => n.startsWith("Coincide con la clave"))) return "Coincide con la clave de acceso.";
    if (notes.some((n) => n.startsWith("Confirmado por la suma") || n.startsWith("Subtotal + IVA")))
      return "Cuadra con la suma del total.";
    return "Leído con seguridad.";
  }

  // yellow
  const nocuadra = notes.find((n) => n.startsWith("No cuadra"));
  if (nocuadra) {
    if (field.role !== "total" && totalLabel) return `La suma no cuadra: revísala en «${totalLabel}».`;
    return localize(nocuadra.replace("No cuadra:", "La suma no cuadra:")) + ".";
  }
  const hard = notes.find(
    (n) => !n.startsWith("Coincide") && !n.startsWith("Confirmado") && !n.startsWith("Dígito verificador"),
  );
  if (hard === "La línea elegida no contiene un valor válido") return "Encontramos la línea pero no un valor claro.";
  if (hard) return localize(hard.endsWith(".") ? hard : hard + ".");
  return "No estamos seguros de esta lectura: confírmala.";
}

export const STATUS_LABEL: Record<Answer["status"], string> = {
  green: "Listo",
  yellow: "Revisa",
  empty: "No aparece",
  corrected: "Corregido",
};
