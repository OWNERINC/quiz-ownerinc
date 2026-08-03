import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAnswers } from "./public/quiz.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(directory, "public");
const maxBodySize = 16_384;
const allowedUtm = new Set(["source", "medium", "campaign", "content", "term"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const contentSecurityPolicy = "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; script-src 'self'; style-src 'self'";
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

function setSecurityHeaders(response) {
  response.setHeader("Content-Security-Policy", contentSecurityPolicy);
  response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodySize) throw new RangeError("Request too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function isAllowedOrigin(request) {
  if (!request.headers.origin) return true;
  try {
    const protocol = request.socket.encrypted ? "https:" : "http:";
    return new URL(request.headers.origin).origin === new URL(`${protocol}//${request.headers.host}`).origin;
  } catch {
    return false;
  }
}

async function resolvePublicPath(urlPath) {
  let relative;
  try {
    relative = urlPath === "/" ? "index.html" : decodeURIComponent(urlPath.slice(1));
  } catch {
    return null;
  }
  const resolved = path.resolve(publicRoot, relative);
  if (!resolved.startsWith(`${publicRoot}${path.sep}`)) return null;
  const [canonicalRoot, canonicalFile] = await Promise.all([fs.realpath(publicRoot), fs.realpath(resolved)]);
  return canonicalFile.startsWith(`${canonicalRoot}${path.sep}`) ? canonicalFile : null;
}

function cleanUtm(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key, item]) => allowedUtm.has(key) && typeof item === "string")
    .map(([key, item]) => [key, item.trim().slice(0, 100)]));
}

export function validateLead(input) {
  const name = typeof input?.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const digits = typeof input?.whatsapp === "string" ? input.whatsapp.replace(/\D/g, "") : "";

  if (name.length < 2 || name.length > 120) return { error: "Informe seu nome." };
  if (!/^\d{10,11}$/.test(digits)) return { error: "Informe um WhatsApp brasileiro com DDD." };
  if (email.length > 254 || !emailPattern.test(email)) return { error: "Informe um e-mail valido." };
  if (input?.consent !== true) return { error: "Autorize o contato para continuar." };

  let classification;
  try {
    classification = classifyAnswers(input?.answers);
  } catch {
    return { error: "Respostas invalidas." };
  }

  return {
    value: {
      name,
      whatsapp: `+55${digits}`,
      email,
      answers: input.answers,
      ...classification,
      utm: cleanUtm(input.utm)
    }
  };
}

function validatePublicConfig(config) {
  try {
    for (const value of Object.values(config)) {
      if (typeof value !== "string" || new URL(value).protocol !== "https:") throw new Error();
    }
  } catch {
    throw new TypeError("Configuracao publica invalida.");
  }
}

export function createServer({
  privacyPolicyUrl = process.env.PRIVACY_POLICY_URL,
  owntimeUrl = process.env.OWNTIME_URL,
  nestUrl = process.env.NEST_URL,
  webhookUrl = process.env.LEAD_WEBHOOK_URL,
  webhookToken = process.env.LEAD_WEBHOOK_TOKEN,
  fetchImplementation = fetch
} = {}) {
  const publicConfig = { privacyPolicyUrl, owntimeUrl, nestUrl };
  validatePublicConfig(publicConfig);

  return http.createServer(async (request, response) => {
    setSecurityHeaders(response);

    try {
      const url = new URL(request.url, "http://localhost");
      if (request.method === "POST" && url.pathname === "/api/leads") {
        const contentType = request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase();
        if (contentType !== "application/json" || !isAllowedOrigin(request)) {
          sendJson(response, 400, { error: "Solicitacao invalida." });
          return;
        }

        const lead = validateLead(await readJson(request));
        if (lead.error) {
          sendJson(response, 400, { error: lead.error });
          return;
        }
        if (!webhookUrl) {
          sendJson(response, 503, { error: "O atendimento ainda esta sendo conectado. Tente novamente em breve." });
          return;
        }

        const submittedAt = new Date().toISOString();
        const submissionId = randomUUID();
        const payload = {
          submissionId,
          source: "lp-tijolo",
          submittedAt,
          ...lead.value,
          consent: { contact: true, acceptedAt: submittedAt }
        };

        let webhookResponse;
        try {
          webhookResponse = await fetchImplementation(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Idempotency-Key": submissionId,
              ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {})
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10_000)
          });
        } catch {
          sendJson(response, 502, { error: "Nao conseguimos iniciar o atendimento. Tente novamente." });
          return;
        }

        if (!webhookResponse.ok) {
          sendJson(response, 502, { error: "Nao conseguimos iniciar o atendimento. Tente novamente." });
          return;
        }
        sendJson(response, 201, { ok: true });
        return;
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        response.setHeader("Allow", "GET, HEAD");
        sendJson(response, 405, { error: "Metodo nao permitido." });
        return;
      }

      if (url.pathname === "/api/config") {
        sendJson(response, 200, publicConfig);
        return;
      }

      const filePath = await resolvePublicPath(url.pathname);
      if (!filePath) {
        response.writeHead(404).end();
        return;
      }
      const data = await fs.readFile(filePath);
      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": url.pathname === "/" ? "no-store" : "public, max-age=3600"
      });
      response.end(request.method === "GET" ? data : undefined);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "EISDIR") {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      } else if (error instanceof RangeError || error instanceof SyntaxError) {
        sendJson(response, 400, { error: "Solicitacao invalida." });
      } else {
        sendJson(response, 500, { error: "Nao foi possivel concluir a solicitacao. Tente novamente." });
      }
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4182);
  createServer().listen(port, () => console.log(`LP Tijolo em http://localhost:${port}`));
}
