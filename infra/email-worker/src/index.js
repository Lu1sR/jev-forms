// Email Worker: facturas@<domain> -> Gestor (paperless-ngx) API.
// Cloudflare Email Routing hands each message here; PDFs and photos go to
// /api/documents/post_document/. If Gestor cannot take them, the whole message is
// forwarded to FALLBACK_EMAIL so nothing is lost.
//
// Each receiving address gets its own Gestor tag (ROUTES); a Gestor workflow per tag
// decides owner and sharing, e.g. household bills shared with the family group and
// personal ones private.
//
// Vars (wrangler.toml): GESTOR_URL, ROUTES
// Secrets (wrangler secret put): GESTOR_TOKEN, ALLOWED_SENDERS, FALLBACK_EMAIL

import PostalMime from "postal-mime";
import { fileName, isAllowed, parseAllowList, pickAttachments, tagsForRecipient } from "./logic.js";

const RETRY_DELAYS_MS = [0, 3_000, 10_000];

export default {
  async email(message, env) {
    const allowList = parseAllowList(env.ALLOWED_SENDERS);
    if (allowList.length === 0) {
      console.error("ALLOWED_SENDERS is empty; rejecting everything");
      message.setReject("Buzón no configurado");
      return;
    }

    // An address without tags would land unshared and invisible to the family; refuse it.
    const tags = tagsForRecipient(env.ROUTES, message.to);
    if (!tags || tags.length === 0) {
      message.setReject("Dirección no configurada");
      return;
    }

    const email = await PostalMime.parse(message.raw);

    // Envelope sender covers family forwards; header From covers providers sending
    // through mailing services whose envelope is a bounce address.
    const senders = [message.from, email.from?.address, email.sender?.address].filter(Boolean);
    if (!isAllowed(senders, allowList)) {
      console.log(`rejected sender ${senders.map(domainOf).join(",")}`);
      message.setReject("Remitente no autorizado para este buzón");
      return;
    }

    const files = pickAttachments(email.attachments);
    if (files.length === 0) {
      message.setReject("El correo no trae PDF ni fotos adjuntas; reenvíe la factura como adjunto");
      return;
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
    if (!env.FALLBACK_EMAIL) {
      message.setReject("Gestor no está disponible; intente de nuevo más tarde");
      return;
    }
    const headers = new Headers({ "X-Gestor-Error": failures.join(" | ").slice(0, 900) });
    await message.forward(env.FALLBACK_EMAIL, headers);
  },
};

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
