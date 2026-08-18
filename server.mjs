import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleLeadRequest, leadConfigFromEnv } from "./src/lead-handler.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(directory, "public");
const maxBodySize = 64 * 1024;
const contentSecurityPolicy = "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'";
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".otf": "font/otf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

function setSecurityHeaders(response) {
  response.setHeader("Content-Security-Policy", contentSecurityPolicy);
  response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=()");
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

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodySize) throw new RangeError("Request too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function isAllowedOrigin(request, publicOrigin) {
  if (!request.headers.origin) return true;
  try {
    const protocol = request.socket.encrypted ? "https:" : "http:";
    const localOrigin = new URL(`${protocol}//${request.headers.host}`);
    const expectedOrigin = publicOrigin || localOrigin.origin;
    if (!publicOrigin && !["localhost", "127.0.0.1", "::1"].includes(localOrigin.hostname)) return false;
    return new URL(request.headers.origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

async function resolvePublicPath(urlPath, root = publicRoot) {
  let relative;
  try {
    relative = urlPath === "/" ? "index.html" : decodeURIComponent(urlPath.slice(1));
  } catch {
    return null;
  }
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(`${root}${path.sep}`)) return null;
  const [canonicalRoot, canonicalFile] = await Promise.all([fs.realpath(root), fs.realpath(resolved)]);
  return canonicalFile.startsWith(`${canonicalRoot}${path.sep}`) ? canonicalFile : null;
}

function validatePublicConfig(config) {
  try {
    for (const value of Object.values(config)) {
      if (typeof value !== "string" || new URL(value).protocol !== "https:") throw new Error();
    }
  } catch {
    throw new TypeError("Configuração pública inválida.");
  }
}

function normalizePublicOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if ((!isLocal && url.protocol !== "https:") ||
        (isLocal && url.protocol !== "http:" && url.protocol !== "https:") ||
        url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
    return url.origin;
  } catch {
    throw new TypeError("PUBLIC_ORIGIN inválida.");
  }
}

function positiveInteger(value, fallback, name, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const normalized = value === undefined || value === null || value === "" ? fallback : Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < min || normalized > max) {
    throw new TypeError(`${name} inválido.`);
  }
  return normalized;
}

function clientRateLimitKey(request, trustProxyHops) {
  if (trustProxyHops > 0) {
    const forwarded = String(request.headers["x-forwarded-for"] || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const trustedIndex = forwarded.length - trustProxyHops;
    if (trustedIndex >= 0 && forwarded[trustedIndex].length <= 64) return forwarded[trustedIndex];
  }
  return String(request.socket?.remoteAddress || "unknown").slice(0, 64);
}

export function createLeadRateLimiter({ maxRequests, windowMs, trustProxyHops, now }) {
  const buckets = new Map();
  return (request) => {
    const timestamp = now().getTime();
    const key = clientRateLimitKey(request, trustProxyHops);
    const current = buckets.get(key);
    if (!current || timestamp - current.startedAt >= windowMs) {
      buckets.set(key, { startedAt: timestamp, count: 1 });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    current.count += 1;
    if (current.count <= maxRequests) return { allowed: true, retryAfterSeconds: 0 };
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (timestamp - current.startedAt)) / 1000))
    };
  };
}

export function normalizeRateLimitConfig({ maxRequests = 8, windowMs = 60_000, trustProxyHops = 0 } = {}) {
  return {
    maxRequests: positiveInteger(maxRequests, 8, "OWNERINC_QUIZ_RATE_LIMIT_MAX", { max: 1_000 }),
    windowMs: positiveInteger(windowMs, 60_000, "OWNERINC_QUIZ_RATE_LIMIT_WINDOW_MS", { min: 1_000, max: 3_600_000 }),
    trustProxyHops: positiveInteger(trustProxyHops, 0, "OWNERINC_QUIZ_TRUST_PROXY_HOPS", { min: 0, max: 5 })
  };
}

export function rateLimitConfigFromEnv(env = process.env) {
  return normalizeRateLimitConfig({
    maxRequests: env.OWNERINC_QUIZ_RATE_LIMIT_MAX || 8,
    windowMs: env.OWNERINC_QUIZ_RATE_LIMIT_WINDOW_MS || 60_000,
    trustProxyHops: env.OWNERINC_QUIZ_TRUST_PROXY_HOPS || 0
  });
}

function nodeHeaders(request) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

async function forwardLead(request, response, leadConfig, fetchImplementation, now) {
  let body;
  try {
    body = await readBody(request);
  } catch {
    sendJson(response, 413, { status: "REJECTED", code: "PAYLOAD_TOO_LARGE" });
    return;
  }
  const webRequest = new Request(`http://quiz.internal${request.url}`, {
    method: request.method,
    headers: nodeHeaders(request),
    body
  });
  const webResponse = await handleLeadRequest(webRequest, {
    config: leadConfig,
    fetchImpl: fetchImplementation,
    now
  });
  response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
  response.end(await webResponse.text());
}

export function createServer({
  privacyPolicyUrl = process.env.OWNERINC_QUIZ_PRIVACY_POLICY_URL || process.env.PRIVACY_POLICY_URL,
  owntimeUrl = process.env.OWNERINC_QUIZ_OWNTIME_URL || process.env.OWNTIME_URL,
  nestUrl = process.env.OWNERINC_QUIZ_NEST_URL || process.env.NEST_URL,
  publicOrigin = process.env.PUBLIC_ORIGIN,
  webhookEnabled = process.env.OWNERINC_QUIZ_WEBHOOK_ENABLED === "true",
  webhookUrl = process.env.OWNERINC_QUIZ_WEBHOOK_URL,
  consentTextVersion = process.env.OWNERINC_QUIZ_CONSENT_TEXT_VERSION,
  policyReference = process.env.OWNERINC_QUIZ_POLICY_REFERENCE,
  environment = process.env.OWNERINC_QUIZ_ENVIRONMENT || "production",
  rateLimitMax = process.env.OWNERINC_QUIZ_RATE_LIMIT_MAX || 8,
  rateLimitWindowMs = process.env.OWNERINC_QUIZ_RATE_LIMIT_WINDOW_MS || 60_000,
  trustProxyHops = process.env.OWNERINC_QUIZ_TRUST_PROXY_HOPS || 0,
  publicDirectory = publicRoot,
  fetchImplementation = fetch,
  now = () => new Date()
} = {}) {
  const publicConfig = { privacyPolicyUrl, owntimeUrl, nestUrl };
  validatePublicConfig(publicConfig);
  const expectedOrigin = normalizePublicOrigin(publicOrigin);
  const normalizedRateLimit = normalizeRateLimitConfig({
    maxRequests: rateLimitMax,
    windowMs: rateLimitWindowMs,
    trustProxyHops
  });
  const staticRoot = path.resolve(publicDirectory);
  const checkLeadRateLimit = createLeadRateLimiter({
    ...normalizedRateLimit,
    now
  });
  const leadConfig = {
    ...leadConfigFromEnv({}),
    webhookEnabled,
    webhookUrl: webhookUrl || "",
    consentTextVersion: consentTextVersion || "",
    policyReference: policyReference || "",
    environment,
    publicOrigin: expectedOrigin || ""
  };

  return http.createServer(async (request, response) => {
    setSecurityHeaders(response);

    try {
      const url = new URL(request.url, "http://localhost");
      if (url.pathname === "/api/leads") {
        if (request.method !== "POST") {
          response.setHeader("Allow", "POST");
          sendJson(response, 405, { status: "REJECTED", code: "METHOD_NOT_ALLOWED" });
          return;
        }
        if (!isAllowedOrigin(request, expectedOrigin)) {
          sendJson(response, 400, { status: "REJECTED", code: "ORIGIN_NOT_ALLOWED" });
          return;
        }
        const rateLimit = checkLeadRateLimit(request);
        if (!rateLimit.allowed) {
          response.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
          sendJson(response, 429, { status: "REJECTED", code: "RATE_LIMITED" });
          return;
        }
        await forwardLead(request, response, leadConfig, fetchImplementation, now);
        return;
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        response.setHeader("Allow", "GET, HEAD");
        sendJson(response, 405, { error: "Método não permitido." });
        return;
      }

      if (url.pathname === "/api/config") {
        sendJson(response, 200, publicConfig);
        return;
      }
      if (url.pathname === "/api/health") {
        sendJson(response, 200, {
          status: "ok",
          webhook: leadConfig.webhookEnabled === true ? "enabled" : "disabled"
        });
        return;
      }

      const filePath = await resolvePublicPath(url.pathname, staticRoot);
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
      } else {
        sendJson(response, 500, { error: "Não foi possível concluir a solicitação. Tente novamente." });
      }
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4182);
  createServer().listen(port, "0.0.0.0", () => console.log(`Ownerinc Quiz em http://localhost:${port}`));
}
