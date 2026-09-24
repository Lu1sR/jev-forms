// Proxy to the engine, which is only reachable on the private network.
// The browser never talks to the engine directly.

const ENGINE_URL = process.env.ENGINE_URL ?? "http://localhost:8000";
const TIMEOUT_MS = 60_000;

export const maxDuration = 60;

function fail(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return fail(400, "No recibimos el archivo. Intenta subirlo otra vez.");
  }
  const file = incoming.get("file");
  const form = incoming.get("form");
  if (!(file instanceof File) || typeof form !== "string") {
    return fail(400, "Falta el archivo o el formulario.");
  }

  const body = new FormData();
  body.set("file", file, file.name || "documento");
  body.set("form", form);
  body.set("previews", "true");

  let res: Response;
  try {
    res = await fetch(`${ENGINE_URL}/extract`, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return fail(
      503,
      timedOut
        ? "La lectura tardó demasiado. Prueba con una foto más nítida o intenta otra vez."
        : "No pudimos conectar con el lector. Intenta de nuevo en un momento.",
    );
  }

  if (res.ok) {
    return new Response(res.body, { headers: { "content-type": "application/json" } });
  }

  let detail = "";
  try {
    detail = String((await res.json()).detail ?? "");
  } catch {}
  switch (res.status) {
    case 413:
      return fail(413, "El archivo es muy pesado (máximo 15 MB). Prueba con una foto más liviana.");
    case 415:
      return fail(415, "No podemos leer ese archivo. Sube una foto (JPG, PNG, HEIC) o un PDF.");
    case 400:
      return fail(400, detail ? `Revisa los campos del formulario: ${detail}` : "El formulario tiene un error.");
    default:
      return fail(502, "El lector tuvo un problema con este documento. Intenta otra vez o prueba con otro.");
  }
}
