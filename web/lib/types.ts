// Mirrors the engine's POST /extract response (engine/README.md).

export type FieldType = "text" | "money" | "date" | "ruc" | "invoice_number";
export type Status = "green" | "yellow" | "empty";

export type Role =
  | "ruc_emisor"
  | "numero_factura"
  | "fecha_emision"
  | "subtotal"
  | "iva"
  | "total"
  | "descuento"
  | "servicio"
  | "ice";

/** A field as the visitor edits it; sent to the engine as the form definition. */
export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  role?: Role;
  /** What to look for, in plain words ("el nombre del mesero"). */
  question?: string;
}

export interface Sample {
  file: string;
  label: string;
  kind: "PDF" | "foto";
}

export interface FormTemplate {
  id: string;
  title: string;
  blurb: string;
  fields: FormField[];
  /** Example documents that fit this form. */
  samples: Sample[];
}

export interface Line {
  id: string;
  text: string;
  bbox: [number, number, number, number];
  page: number;
  row: number;
  confidence: number;
  /** Line as printed on a tilted photo: centre x, centre y, width, height (page units), angle in degrees. */
  rect?: [number, number, number, number, number] | null;
}

export interface FieldResult {
  key: string;
  label: string;
  value: string | null;
  raw_line_id: string | null;
  probability: number | null;
  value_line_id: string | null;
  status: Status;
  validation_notes: string[];
  source: "matcher" | "clave_acceso";
}

export interface ExtractResponse {
  form: { id: string; title: string };
  document: {
    type: "pdf_text" | "pdf_scanned" | "image";
    pages: number;
    dimensions: { width: number; height: number }[];
    previews?: string[];
  };
  lines: Line[];
  fields: FieldResult[];
  checks: {
    clave_acceso: { value: string; valid: boolean; line_id: string | null; ambiente: string } | null;
    totals: { ok: boolean | null; note: string };
    hidden_fields: FieldResult[];
  };
  matcher: string;
  timings: { read_ms: number; match_ms: number; validate_ms: number; total_ms: number };
}

/** What the visitor ends up with after reading and correcting. */
export interface Answer {
  value: string | null;
  status: Status | "corrected";
  lineId: string | null;
}
