// Contact and demo addresses. NEXT_PUBLIC_* values are baked in at build time
// (landing/Dockerfile passes them as build args).

export const FORMULARIOS_URL =
  process.env.NEXT_PUBLIC_FORMULARIOS_URL || "https://formularios.docutecec.com";
export const GESTOR_URL = process.env.NEXT_PUBLIC_GESTOR_URL || "https://gestor.docutecec.com";
export const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL || "contacto@docutecec.com";

// Digits only, with country code: 5939XXXXXXXX.
const WHATSAPP = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");

export const DEFAULT_MESSAGE =
  "Hola, vengo de docutecec.com y quiero saber más sobre Formularios y Gestor.";

/** WhatsApp chat with a prefilled message; falls back to email when no number is set. */
export function contactHref(message: string = DEFAULT_MESSAGE): string {
  if (WHATSAPP) return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
  return `mailto:${SALES_EMAIL}?subject=${encodeURIComponent("Cotización docutecec")}&body=${encodeURIComponent(message)}`;
}

export const HAS_WHATSAPP = WHATSAPP.length > 0;

export function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
