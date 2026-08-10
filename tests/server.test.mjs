import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer, validateLead } from "../server.mjs";

const publicRoot = fileURLToPath(new URL("../public/", import.meta.url));

const validInput = {
  name: "  Maria   da Silva  ",
  whatsapp: "(51) 99999-9999",
  email: "MARIA@example.com",
  consent: true,
  answers: ["owntime", "owntime", "owntime", "nest", "nest"],
  profile: {
    companhia: "familia",
    momento: "memorias-em-familia",
    viagem: "conforto-familiar"
  },
  result: "nest",
  utm: { source: "instagram", ignored: "drop" }
};
const validNestInput = {
  ...validInput,
  answers: ["nest", "nest", "nest", "owntime", "owntime"]
};

const publicConfig = {
  privacyPolicyUrl: "https://ownerinc.com.br/politica-de-privacidade/",
  owntimeUrl: "https://owntime.com.br/",
  nestUrl: "https://nestgramado.com.br/"
};
const publicOptions = {
  ...publicConfig,
  publicOrigin: null,
  nestWebhookUrl: null,
  nestWebhookToken: null,
  owntimeWebhookUrl: null,
  owntimeWebhookToken: null,
  fetchImplementation: fetch
};

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

test("normalizes a valid lead and recalculates its result", () => {
  assert.deepEqual(validateLead(validInput), {
    value: {
      name: "Maria da Silva",
      whatsapp: "+5551999999999",
      email: "maria@example.com",
      answers: validInput.answers,
      profile: validInput.profile,
      result: "owntime",
      scores: { owntime: 3, nest: 2 },
      utm: { source: "instagram" }
    }
  });
});

test("rejects invalid identity, consent and answers", () => {
  assert.match(validateLead({ ...validInput, name: "x" }).error, /nome/i);
  assert.match(validateLead({ ...validInput, name: "x".repeat(121) }).error, /nome/i);
  assert.match(validateLead({ ...validInput, whatsapp: "123" }).error, /WhatsApp/i);
  assert.match(validateLead({ ...validInput, email: "invalid" }).error, /e-mail/i);
  assert.match(validateLead({ ...validInput, email: `${"x".repeat(250)}@x.com` }).error, /e-mail/i);
  assert.match(validateLead({ ...validInput, consent: false }).error, /contato/i);
  assert.match(validateLead({ ...validInput, answers: ["owntime"] }).error, /respostas/i);
  assert.match(validateLead(null).error, /nome/i);
});

test("validates the separate profile answers", () => {
  assert.equal(validateLead({ ...validInput, profile: undefined }).error, "Perfil inválido.");
  assert.equal(validateLead({ ...validInput, profile: { ...validInput.profile, momento: "unknown" } }).error, "Perfil inválido.");
  assert.equal(validateLead({ ...validInput, profile: { ...validInput.profile, extra: "drop" } }).error, "Perfil inválido.");
});

test("rejects country-prefixed phone input outside the local-phone boundary", () => {
  assert.match(validateLead({ ...validInput, whatsapp: "+55 51 3333-4444" }).error, /WhatsApp/i);
  assert.match(validateLead({ ...validInput, whatsapp: "+55 51 99999-9999" }).error, /WhatsApp/i);
});

test("keeps only recognized string UTM values", () => {
  const { value } = validateLead({
    ...validInput,
    utm: { source: " instagram ", medium: 123, campaign: "quiz", prototype: "drop" }
  });
  assert.deepEqual(value.utm, { source: "instagram", campaign: "quiz" });
});

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
  await withServer({
    ...publicOptions,
    nestWebhookUrl: "https://nest-secret.example/",
    nestWebhookToken: "nest-secret",
    owntimeWebhookUrl: "https://owntime-secret.example/",
    owntimeWebhookToken: "owntime-secret"
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/config`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), publicConfig);
  });
});

test("uses configured HTTPS public origin behind TLS termination", async () => {
  await withServer({
    ...publicOptions,
    publicOrigin: "https://quiz.ownerinc.com.br",
    owntimeWebhookUrl: "https://owntime.example/lead",
    fetchImplementation: async () => ({ ok: true })
  }, async (baseUrl) => {
    const response = await postLead(baseUrl, validInput, {
      Origin: "https://quiz.ownerinc.com.br",
      "X-Forwarded-Proto": "http"
    });
    assert.equal(response.status, 201);
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

test("routes each recalculated result to its own webhook and bearer token", async () => {
  const forwarded = [];
  const fetchImplementation = async (url, options) => {
    forwarded.push({ url, ...options, body: JSON.parse(options.body) });
    return { ok: true };
  };

  await withServer({
    ...publicOptions,
    nestWebhookUrl: "https://nest.example/lead",
    nestWebhookToken: "nest-secret",
    owntimeWebhookUrl: "https://owntime.example/lead",
    owntimeWebhookToken: "owntime-secret",
    fetchImplementation
  }, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 201);
    assert.equal((await postLead(baseUrl, validNestInput)).status, 201);
  });

  assert.deepEqual(forwarded.map(({ url, headers, body }) => ({
    url,
    authorization: headers.Authorization,
    result: body.result
  })), [
    { url: "https://owntime.example/lead", authorization: "Bearer owntime-secret", result: "owntime" },
    { url: "https://nest.example/lead", authorization: "Bearer nest-secret", result: "nest" }
  ]);
  for (const request of forwarded) {
    assert.equal(request.method, "POST");
    assert.equal(request.headers["Content-Type"], "application/json");
    assert.equal(request.headers["X-Idempotency-Key"], request.body.submissionId);
    assert.equal(request.body.source, "lp-tijolo");
    assert.deepEqual(request.body.profile, validInput.profile);
    assert.deepEqual(request.body.consent, { contact: true, acceptedAt: request.body.submittedAt });
    assert.equal(request.signal instanceof AbortSignal, true);
  }
});

test("omits authorization when the webhook token is absent", async () => {
  let headers;
  await withServer({
    ...publicOptions,
    owntimeWebhookUrl: "https://owntime.example/lead",
    fetchImplementation: async (_url, options) => {
      headers = options.headers;
      return { ok: true };
    }
  }, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 201);
  });
  assert.equal("Authorization" in headers, false);
});

test("does not confirm a lead without a successful webhook", async () => {
  let wrongWebhookCalls = 0;
  await withServer(publicOptions, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 503);
  });
  await withServer({
    ...publicOptions,
    nestWebhookUrl: "https://nest.example/lead",
    fetchImplementation: async () => {
      wrongWebhookCalls += 1;
      return { ok: true };
    }
  }, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 503);
  });
  await withServer({
    ...publicOptions,
    owntimeWebhookUrl: "https://owntime.example/lead",
    fetchImplementation: async () => {
      wrongWebhookCalls += 1;
      return { ok: true };
    }
  }, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validNestInput)).status, 503);
  });
  assert.equal(wrongWebhookCalls, 0);
  await withServer({ ...publicOptions, owntimeWebhookUrl: "https://owntime.example/lead", fetchImplementation: async () => ({ ok: false }) }, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 502);
  });
  await withServer({ ...publicOptions, owntimeWebhookUrl: "https://owntime.example/lead", fetchImplementation: async () => { throw new DOMException("Timeout", "TimeoutError"); } }, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 502);
  });
});

test("rejects invalid lead requests at the HTTP boundary", async () => {
  await withServer(publicOptions, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, `{"padding":"${"x".repeat(16_384)}"}`)).status, 400);
    assert.equal((await postLead(baseUrl, validInput, { "Content-Type": "text/plain" })).status, 400);
    assert.equal((await postLead(baseUrl, validInput, { "Content-Type": "application/jsonp" })).status, 400);
    assert.equal((await postLead(baseUrl, validInput, { Origin: "https://foreign.example" })).status, 400);
    assert.equal((await postLead(baseUrl, validInput, { Origin: baseUrl.replace("http:", "https:") })).status, 400);
    assert.equal((await postLead(baseUrl, "{")).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/leads`, { method: "PUT" })).status, 405);
  });
});

test("does not serve a public symlink whose target is outside public", async () => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "lp-tijolo-"));
  const outsideFile = path.join(temporaryDirectory, "private.txt");
  const link = path.join(publicRoot, `outside-${process.pid}`);
  await fs.writeFile(outsideFile, "private");

  try {
    await fs.symlink(temporaryDirectory, link, "junction");
    await withServer(publicOptions, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/${path.basename(link)}/private.txt`);
      assert.equal(response.status, 404);
      assert.notEqual(await response.text(), "private");
    });
  } finally {
    await fs.rm(link, { recursive: true, force: true });
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("serves public files with restrictive security headers", async () => {
  await withServer(publicOptions, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/quiz.js`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/javascript/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("content-security-policy"), "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; script-src 'self'; style-src 'self'");
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
