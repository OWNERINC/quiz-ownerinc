import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createServer } from "../server.mjs";

const validInput = Object.freeze({
  submission_id: "123e4567-e89b-42d3-a456-426614174000",
  occurred_at: "2026-08-10T15:00:00.000Z",
  contact: { name: "Lead Sintetico", whatsapp: "+5551999990000", email: "lead@example.invalid" },
  consent: { granted: true },
  answers: {
    affinity: {
      acomodacao: "owntime",
      atmosfera: "owntime",
      convivencia: "owntime",
      localizacao: "nest",
      experiencia: "owntime"
    },
    profile: {
      companhia: "casal",
      momento: "descobertas-a-dois",
      viagem: "planejamento-a-dois"
    }
  },
  result_key: "owntime",
  campaign: { source: "instagram", medium: "social", campaign: "synthetic", content: null, term: null }
});

const validNestInput = Object.freeze({
  ...structuredClone(validInput),
  submission_id: "123e4567-e89b-42d3-a456-426614174001",
  answers: {
    ...structuredClone(validInput.answers),
    affinity: {
      acomodacao: "nest",
      atmosfera: "nest",
      convivencia: "nest",
      localizacao: "owntime",
      experiencia: "owntime"
    }
  },
  result_key: "nest"
});

const publicConfig = {
  privacyPolicyUrl: "https://ownerinc.com.br/politica-de-privacidade/",
  owntimeUrl: "https://owntime.com.br/",
  nestUrl: "https://nestgramado.com.br/"
};

const publicOptions = {
  ...publicConfig,
  publicOrigin: null,
  webhookEnabled: false,
  webhookUrl: "",
  consentTextVersion: "",
  policyReference: "",
  environment: "test",
  fetchImplementation: async () => { throw new Error("network must remain off"); }
};

function enabledOptions(overrides = {}) {
  return {
    ...publicOptions,
    webhookEnabled: true,
    webhookUrl: "https://webhook.example.invalid/capture",
    consentTextVersion: "synthetic-consent-v1",
    policyReference: "ownerinc-privacy-policy",
    ...overrides
  };
}

async function withServer(options, callback) {
  const server = createServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function postLead(baseUrl, body, headers = {}) {
  return fetch(`${baseUrl}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

test("rejects missing or invalid public configuration", () => {
  assert.throws(
    () => createServer({ ...publicOptions, privacyPolicyUrl: "" }),
    new TypeError("Configuração pública inválida.")
  );
  assert.throws(
    () => createServer({ ...publicOptions, nestUrl: "http://nestgramado.com.br/" }),
    new TypeError("Configuração pública inválida.")
  );
});

test("exposes only public configuration", async () => {
  await withServer(enabledOptions({
    webhookUrl: "https://private-endpoint.example.invalid/capture"
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/config`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), publicConfig);
    assert.doesNotMatch(await (await fetch(`${baseUrl}/api/config`)).text(), /private-endpoint/);
  });
});

test("reports health and keeps webhook disabled with zero downstream calls", async () => {
  let calls = 0;
  await withServer({
    ...publicOptions,
    fetchImplementation: async () => { calls += 1; throw new Error("must not run"); }
  }, async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.deepEqual(await health.json(), { status: "ok", webhook: "disabled" });
    const response = await postLead(baseUrl, validInput);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: "DISABLED", code: "QUIZ_WEBHOOK_DISABLED" });
  });
  assert.equal(calls, 0);
});

test("uses configured HTTPS public origin behind TLS termination", async () => {
  await withServer(enabledOptions({
    publicOrigin: "https://quiz.ownerinc.com.br",
    fetchImplementation: async () => new Response(null, { status: 202 })
  }), async (baseUrl) => {
    const response = await postLead(baseUrl, validInput, {
      Origin: "https://quiz.ownerinc.com.br",
      "X-Forwarded-Proto": "http"
    });
    assert.equal(response.status, 202);
  });
});

test("rejects public-origin mismatches and does not trust forwarded headers", async () => {
  await withServer({ ...publicOptions, publicOrigin: "https://quiz.ownerinc.com.br" }, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput, { Origin: "https://foreign.example" })).status, 400);
  });
  await withServer(publicOptions, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput, {
      Origin: baseUrl.replace("http:", "https:"),
      "X-Forwarded-Proto": "https"
    })).status, 400);
  });
});

test("accepts only HTTPS public origins outside local development", () => {
  assert.throws(
    () => createServer({ ...publicOptions, publicOrigin: "http://quiz.ownerinc.com.br" }),
    new TypeError("PUBLIC_ORIGIN inválida.")
  );
  assert.doesNotThrow(() => createServer({ ...publicOptions, publicOrigin: "http://localhost:4182" }));
});

test("rate limits lead posts by the client address appended by the trusted proxy", async () => {
  let upstreamCalls = 0;
  await withServer(enabledOptions({
    rateLimitMax: 2,
    rateLimitWindowMs: 60_000,
    trustProxyHops: 1,
    fetchImplementation: async () => {
      upstreamCalls += 1;
      return new Response(null, { status: 202 });
    }
  }), async (baseUrl) => {
    const proxyHeaders = { "X-Forwarded-For": "198.51.100.88, 203.0.113.10" };
    assert.equal((await postLead(baseUrl, validInput, proxyHeaders)).status, 202);
    assert.equal((await postLead(baseUrl, validNestInput, proxyHeaders)).status, 202);
    const limited = await postLead(baseUrl, validInput, proxyHeaders);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("retry-after"), "60");
    assert.deepEqual(await limited.json(), { status: "REJECTED", code: "RATE_LIMITED" });

    assert.equal((await postLead(baseUrl, validInput, {
      "X-Forwarded-For": "198.51.100.88, 203.0.113.11"
    })).status, 202);
  });
  assert.equal(upstreamCalls, 3);
});

test("rejects invalid rate-limit and proxy settings at startup", () => {
  assert.throws(() => createServer({ ...publicOptions, rateLimitMax: 0 }), /RATE_LIMIT_MAX inválido/);
  assert.throws(() => createServer({ ...publicOptions, rateLimitWindowMs: 999 }), /RATE_LIMIT_WINDOW_MS inválido/);
  assert.throws(() => createServer({ ...publicOptions, trustProxyHops: 6 }), /TRUST_PROXY_HOPS inválido/);
});

test("routes both results to one generic server-side webhook with stable property codes", async () => {
  const forwarded = [];
  await withServer(enabledOptions({
    now: () => new Date("2026-08-10T15:00:01.000Z"),
    fetchImplementation: async (url, options) => {
      forwarded.push({ url, ...options, body: JSON.parse(options.body) });
      return new Response(null, { status: 202 });
    }
  }), async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 202);
    assert.equal((await postLead(baseUrl, validNestInput)).status, 202);
  });

  assert.deepEqual(forwarded.map(({ url, body }) => ({
    url,
    property: body.property_code,
    result: body.result.result_key
  })), [
    { url: "https://webhook.example.invalid/capture", property: "OWN_TIME_HOME_CLUB_GRAMADO", result: "owntime" },
    { url: "https://webhook.example.invalid/capture", property: "NEST_MOUNTAIN_LODGE", result: "nest" }
  ]);
  for (const request of forwarded) {
    assert.equal(request.method, "POST");
    assert.equal(request.headers["Content-Type"], "application/json");
    assert.equal(request.headers["Idempotency-Key"], request.body.submission_id);
    assert.equal("Authorization" in request.headers, false);
    assert.equal(request.body.source.system, "ownerinc_quiz");
    assert.equal(request.body.consent.text_version, "synthetic-consent-v1");
    assert.equal(request.signal instanceof AbortSignal, true);
  }
});

test("fails closed when configuration or upstream acceptance is incomplete", async () => {
  let calls = 0;
  await withServer(enabledOptions({
    consentTextVersion: "",
    fetchImplementation: async () => { calls += 1; }
  }), async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 503);
  });
  assert.equal(calls, 0);

  await withServer(enabledOptions({
    fetchImplementation: async () => new Response(null, { status: 200 })
  }), async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 502);
  });
  await withServer(enabledOptions({
    fetchImplementation: async () => { throw new DOMException("Timeout", "TimeoutError"); }
  }), async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 502);
  });
});

test("rejects invalid lead requests at the HTTP boundary", async () => {
  await withServer(enabledOptions({
    fetchImplementation: async () => new Response(null, { status: 202 })
  }), async (baseUrl) => {
    assert.equal((await postLead(baseUrl, `{"padding":"${"x".repeat(65_536)}"}`)).status, 413);
    assert.equal((await postLead(baseUrl, validInput, { "Content-Type": "text/plain" })).status, 415);
    assert.equal((await postLead(baseUrl, validInput, { "Content-Type": "application/jsonp" })).status, 415);
    assert.equal((await postLead(baseUrl, validInput, { Origin: "https://foreign.example" })).status, 400);
    assert.equal((await postLead(baseUrl, validInput, { Origin: baseUrl.replace("http:", "https:") })).status, 400);
    assert.equal((await postLead(baseUrl, "{")).status, 422);
    assert.equal((await postLead(baseUrl, { ...structuredClone(validInput), consent: { granted: false } })).status, 422);
    assert.equal((await fetch(`${baseUrl}/api/leads`, { method: "PUT" })).status, 405);
  });
});

test("does not serve a public symlink whose target is outside public", async () => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "ownerinc-quiz-"));
  const temporaryPublicRoot = path.join(temporaryDirectory, "public");
  const outsideFile = path.join(temporaryDirectory, "private.txt");
  const link = path.join(temporaryPublicRoot, "outside");
  await fs.mkdir(temporaryPublicRoot);
  await fs.writeFile(outsideFile, "private");

  try {
    try {
      await fs.symlink(temporaryDirectory, link, "dir");
    } catch (error) {
      if (error.code === "EPERM" && process.platform === "win32") return;
      throw error;
    }
    await withServer({ ...publicOptions, publicDirectory: temporaryPublicRoot }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/outside/private.txt`);
      assert.equal(response.status, 404);
      assert.notEqual(await response.text(), "private");
    });
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("serves public files with restrictive security headers", async () => {
  await withServer(publicOptions, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/quiz.js`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/javascript/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.match(response.headers.get("content-security-policy"), /connect-src 'self'/);
    assert.match(response.headers.get("content-security-policy"), /img-src 'self' data: https:\/\/owntime\.com\.br https:\/\/nestgramado\.com\.br/);
    assert.match(await response.text(), /export const QUESTIONS/);
    assert.equal((await fetch(`${baseUrl}/missing.txt`)).status, 404);
  });
});

test("serves the active font formats with their MIME types", async () => {
  await withServer(publicOptions, async (baseUrl) => {
    const otf = await fetch(`${baseUrl}/assets/fonts/novelin-regular.otf`);
    const bold = await fetch(`${baseUrl}/assets/fonts/novelin-bold.otf`);
    assert.equal(otf.headers.get("content-type"), "font/otf");
    assert.equal(bold.headers.get("content-type"), "font/otf");
  });
});
