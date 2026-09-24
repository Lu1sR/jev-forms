import type { FieldType } from "./types";

// When the visitor corrects a field by touching a line of the document, pull the
// value out of that line the same way the engine would, roughly. They can still
// edit the result by hand.

function money(text: string): string | null {
  const tokens = text.match(/\d[\d.,]*\d|\d/g);
  if (!tokens) return null;
  let t = tokens[tokens.length - 1];
  const lastSep = Math.max(t.lastIndexOf("."), t.lastIndexOf(","));
  if (lastSep !== -1 && t.length - lastSep - 1 === 2) {
    t = t.slice(0, lastSep).replace(/[.,]/g, "") + "." + t.slice(lastSep + 1);
  } else {
    t = t.replace(/[.,]/g, "");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

function date(text: string): string | null {
  const m = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : null;
}

function ruc(text: string): string | null {
  const m = text.replace(/[\s-]/g, "").match(/\d{13}|\d{10}/);
  return m ? m[0] : null;
}

function invoiceNumber(text: string): string | null {
  const m = text.match(/(\d{3})\s*-\s*(\d{3})\s*-\s*(\d{1,9})/);
  return m ? `${m[1]}-${m[2]}-${m[3].padStart(9, "0")}` : null;
}

function plain(text: string): string | null {
  const v = text.replace(/^[^:]{1,30}:\s*/, "").trim();
  return v || text.trim() || null;
}

const PARSERS: Record<FieldType, (t: string) => string | null> = {
  money,
  date,
  ruc,
  invoice_number: invoiceNumber,
  text: plain,
};

export function valueFromLine(type: FieldType, text: string): string {
  return PARSERS[type](text) ?? text.trim();
}
