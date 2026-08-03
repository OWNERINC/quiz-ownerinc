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
  result: "nest",
  utm: { source: "instagram", ignored: "drop" }
};

const publicOptions = {
  privacyPolicyUrl: "https://ownerinc.com.br/politica-de-privacidade/",
  owntimeUrl: "https://owntime.com.br/",
  nestUrl: "https://nestgramado.com.br/"
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
  assert.throws(() => createServer(), new TypeError("Configuracao publica invalida."));
  assert.throws(
    () => createServer({ ...publicOptions, nestUrl: "http://nestgramado.com.br/" }),
    new TypeError("Configuracao publica invalida.")
  );
});

test("exposes only public configuration", async () => {
  await withServer({ ...publicOptions, webhookUrl: "https://secret.example/", webhookToken: "secret" }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/config`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), publicOptions);
  });
});

test("forwards the recalculated lead and optional bearer token", async () => {
  let forwarded;
  const fetchImplementation = async (url, options) => {
    forwarded = { url, ...options, body: JSON.parse(options.body) };
    return { ok: true };
  };

  await withServer({ ...publicOptions, webhookUrl: "https://example.com/lead", webhookToken: "secret", fetchImplementation }, async (baseUrl) => {
    const response = await postLead(baseUrl, validInput);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true });
  });

  assert.equal(forwarded.url, "https://example.com/lead");
  assert.equal(forwarded.method, "POST");
  assert.equal(forwarded.headers.Authorization, "Bearer secret");
  assert.equal(forwarded.headers["Content-Type"], "application/json");
  assert.equal(forwarded.headers["X-Idempotency-Key"], forwarded.body.submissionId);
  assert.equal(forwarded.body.result, "owntime");
  assert.equal(forwarded.body.source, "lp-tijolo");
  assert.deepEqual(forwarded.body.consent, { contact: true, acceptedAt: forwarded.body.submittedAt });
  assert.equal(forwarded.signal instanceof AbortSignal, true);
});

test("omits authorization when the webhook token is absent", async () => {
  let headers;
  await withServer({
    ...publicOptions,
    webhookUrl: "https://example.com/lead",
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
  await withServer(publicOptions, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 503);
  });
  await withServer({ ...publicOptions, webhookUrl: "https://example.com/lead", fetchImplementation: async () => ({ ok: false }) }, async (baseUrl) => {
    assert.equal((await postLead(baseUrl, validInput)).status, 502);
  });
  await withServer({ ...publicOptions, webhookUrl: "https://example.com/lead", fetchImplementation: async () => { throw new DOMException("Timeout", "TimeoutError"); } }, async (baseUrl) => {
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
