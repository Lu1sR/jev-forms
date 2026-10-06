// Pure helpers for the email handler, kept free of Worker APIs so `node --test` covers them.

// Gestor accepts these; anything else (SRI XML, zip, .eml) is skipped.
const PDF = /\.pdf$/i;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/tiff", "image/webp"]);
// Inline images below this size are almost always signature logos or tracking pixels.
const MIN_IMAGE_BYTES = 30 * 1024;

// "a@x.com, @proveedor.ec" -> ["a@x.com", "@proveedor.ec"]
export function parseAllowList(raw) {
  return (raw || "")
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Lowercase and drop "+tag", so Gmail auto-forwards (luis+caf_=...@gmail.com) match luis@gmail.com.
export function normalizeAddress(addr) {
  const a = (addr || "").trim().toLowerCase();
  const at = a.lastIndexOf("@");
  if (at < 1) return a;
  return a.slice(0, at).replace(/\+.*$/, "") + a.slice(at);
}

// Entries are full addresses or "@domain" (exact domain, not subdomains).
export function isAllowed(addresses, allowList) {
  return addresses.some((addr) => {
    const a = normalizeAddress(addr);
    if (!a.includes("@")) return false;
    const domain = a.slice(a.lastIndexOf("@"));
    return allowList.includes(a) || allowList.includes(domain);
  });
}

function byteLength(content) {
  return content?.byteLength ?? content?.length ?? 0;
}

// PDFs always; images only when sent as real attachments and big enough to be a photo.
export function pickAttachments(attachments) {
  return (attachments || []).filter((att) => {
    const type = (att.mimeType || "").toLowerCase();
    if (type === "application/pdf" || PDF.test(att.filename || "")) return true;
    if (!IMAGE_TYPES.has(type)) return false;
    if (att.related || att.disposition === "inline") return false;
    return byteLength(att.content) >= MIN_IMAGE_BYTES;
  });
}

// Gestor names documents after the file; give unnamed parts a usable name.
export function fileName(att, index) {
  if (att.filename) return att.filename;
  const ext = (att.mimeType || "").toLowerCase() === "application/pdf" ? "pdf" : (att.mimeType || "").split("/")[1] || "bin";
  return `adjunto-${index + 1}.${ext}`;
}

// ROUTES maps each receiving address to the Gestor tag ids it adds, e.g.
// {"facturas@luis-dev.com": "12", "facturas-luis@luis-dev.com": "13"}.
// Returns null for an address that is not routed (the message is rejected).
export function tagsForRecipient(routesJson, to) {
  let routes;
  try {
    routes = JSON.parse(routesJson || "{}");
  } catch {
    throw new Error("ROUTES is not valid JSON");
  }
  const want = normalizeAddress(to);
  for (const [addr, tags] of Object.entries(routes)) {
    if (normalizeAddress(addr) === want) {
      return String(tags).split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return null;
}
