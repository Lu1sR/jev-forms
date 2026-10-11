// Email Worker: facturas@<domain> -> Gestor (paperless-ngx) API.
// Cloudflare Email Routing hands each message here; PDFs and photos go to
// /api/documents/post_document/. Anything that does not end up in Gestor (unknown
// sender, no attachments, Gestor down...) is forwarded whole to FALLBACK_EMAIL, so no
// message is ever lost; the X-Gestor-Motivo header says why.
//
// Each receiving address gets its own Gestor tag (ROUTES); a Gestor workflow per tag
// decides owner and sharing, e.g. household bills shared with the family group and
// personal ones private.
//
// Vars (wrangler.toml): GESTOR_URL, ROUTES
// Secrets (wrangler secret put): GESTOR_TOKEN, ALLOWED_SENDERS, FALLBACK_EMAIL

import PostalMime from "postal-mime";
import { fileName, headerSafe, isAllowed, parseAllowList, pickAttachments, tagsForRecipient } from "./logic.js";

const RETRY_DELAYS_MS = [0, 3_000, 10_000];

export default {
  async email(message, env) {
    const allowList = parseAllowList(env.ALLOWED_SENDERS);
    if (allowList.length === 0) {
      console.error("ALLOWED_SENDERS is empty; nothing goes to Gestor");
      return divert(message, env, "buzon no configurado (ALLOWED_SENDERS vacio)", "Buzón no configurado");
    }

    // An address without tags would land unshared and invisible to the family; keep it out of Gestor.
    const tags = tagsForRecipient(env.ROUTES, message.to);
    if (!tags || tags.length === 0) {
      return divert(message, env, "direccion sin etiquetas en ROUTES", "Dirección no configurada");
    }

    const email = await PostalMime.parse(message.raw);

    // Envelope sender covers family forwards; header From covers providers sending
    // through mailing services whose envelope is a bounce address.
    const senders = [message.from, email.from?.address, email.sender?.address].filter(Boolean);
    if (!isAllowed(senders, allowList)) {
      console.log(`unknown sender ${senders.map(domainOf).join(",")}`);
      return divert(message, env, "remitente no autorizado", "Remitente no autorizado para este buzón");
    }

    const files = pickAttachments(email.attachments);
    if (files.length === 0) {
      return divert(
        message,
        env,
        "sin PDF ni fotos adjuntas",
        "El correo no trae PDF ni fotos adjuntas; reenvíe la factura como adjunto",
      );
    }

    const failures = [];
    for (const [i, att] of files.entries()) {
      try {
        await uploadWithRetry(env, att, fileName(att, i), tags);
      } catch (err) {
        failures.push(`${fileName(att, i)}: ${err.message}`);
      }
    }
    console.log(`uploaded ${files.length - failures.length}/${files.length} from ${domainOf(senders[0])}`);
    if (failures.length === 0) return;

    console.error(`upload failed: ${failures.join(" | ")}`);
    return divert(
      message,
      env,
      `error al subir a Gestor: ${failures.join(" | ")}`,
      "Gestor no está disponible; intente de nuevo más tarde",
    );
  },
};

// Forwards the whole message to FALLBACK_EMAIL. Only without a fallback does the sender
// get a bounce, so a missing secret never drops mail silently.
async function divert(message, env, reason, rejectText) {
  if (!env.FALLBACK_EMAIL) {
    message.setReject(rejectText);
    return;
  }
  console.log(`forwarded to fallback: ${reason.slice(0, 200)}`);
  const headers = new Headers({ "X-Gestor-Motivo": headerSafe(reason) });
  await message.forward(env.FALLBACK_EMAIL, headers);
}

async function uploadWithRetry(env, att, name, tags) {
  let lastError;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      return await upload(env, att, name, tags);
    } catch (err) {
      lastError = err;
      // 4xx other than 429 will not fix itself (bad token, missing permission, bad file).
      if (err.status && err.status < 500 && err.status !== 429) break;
    }
  }
  throw lastError;
}

async function upload(env, att, name, tags) {
  const form = new FormData();
  form.append("document", new Blob([att.content], { type: att.mimeType || "application/octet-stream" }), name);
  for (const id of tags) form.append("tags", id);

  const res = await fetch(`${env.GESTOR_URL.replace(/\/+$/, "")}/api/documents/post_document/`, {
    method: "POST",
    headers: { Authorization: `Token ${env.GESTOR_TOKEN}`, Accept: "application/json" },
    body: form,
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
}

// Logs keep only the domain, not the family's full addresses.
function domainOf(addr) {
  const a = addr || "";
  return a.includes("@") ? a.slice(a.lastIndexOf("@") + 1) : "?";
}
