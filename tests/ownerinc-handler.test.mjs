import assert from "node:assert/strict";
import test from "node:test";

import { handleLeadRequest } from "../src/lead-handler.mjs";

const validSubmission = Object.freeze({
  submission_id: "123e4567-e89b-42d3-a456-426614174000",
  occurred_at: "2026-08-10T15:00:00.000Z",
  contact: { name: "Lead Sintetico", whatsapp: "+5551999990000", email: "lead@example.invalid" },
  consent: { granted: true },
  answers: {
    affinity: {
      acomodacao: "owntime", atmosfera: "owntime", convivencia: "owntime", localizacao: "nest", experiencia: "owntime"
    },
    profile: { companhia: "casal", momento: "descobertas-a-dois", viagem: "planejamento-a-dois" }
  },
  result_key: "owntime",
  campaign: { source: "instagram", medium: "social", campaign: "synthetic", content: null, term: null }
});

function requestFor(body = validSubmission, headers = {}) {
  return new Request("https://quiz.test.invalid/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "request-synthetic-001", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

function enabledConfig(overrides = {}) {
  return {
    webhookEnabled: true,
    webhookUrl: "https://webhook.example.invalid/capture",
    consentTextVersion: "synthetic-consent-v1",
    policyReference: "ownerinc-privacy-policy",
    environment: "test",
    ...overrides
  };
}

test("feature flag OFF retorna 503 e faz zero fetch", async () => {
  let calls = 0;
  const response = await handleLeadRequest(requestFor(), {
    config: { webhookEnabled: false },
    fetchImpl: async () => { calls += 1; throw new Error("must not run"); }
  });
  assert.equal(response.status, 503);
  assert.equal(calls, 0);
  assert.deepEqual(await response.json(), { status: "DISABLED", code: "QUIZ_WEBHOOK_DISABLED" });
});

test("configuracao incompleta falha fechado e faz zero fetch", async () => {
  for (const overrides of [{ webhookUrl: "" }, { consentTextVersion: "" }, { policyReference: "" }]) {
    let calls = 0;
    const response = await handleLeadRequest(requestFor(), {
      config: enabledConfig(overrides),
      fetchImpl: async () => { calls += 1; }
    });
    assert.equal(response.status, 503);
    assert.equal(calls, 0);
  }
});

test("origem publica configurada e obrigatoria no handler compartilhado", async () => {
  let calls = 0;
  const config = enabledConfig({ publicOrigin: "https://quiz.ownerinc.com.br" });
  for (const origin of [undefined, "https://foreign.example"]) {
    const response = await handleLeadRequest(requestFor(validSubmission, origin ? { origin } : {}), {
      config,
      fetchImpl: async () => { calls += 1; }
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { status: "REJECTED", code: "ORIGIN_NOT_ALLOWED" });
  }
  assert.equal(calls, 0);
});

test("encaminha uma vez server-side para o endpoint generico e exige 202", async () => {
  const calls = [];
  const response = await handleLeadRequest(requestFor(), {
    config: enabledConfig(),
    now: () => new Date("2026-08-10T15:00:01.000Z"),
    fetchImpl: async (...args) => {
      calls.push(args);
      return new Response(null, { status: 202 });
    }
  });
  assert.equal(response.status, 202);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://webhook.example.invalid/capture");
  assert.equal(calls[0][1].headers["Idempotency-Key"], validSubmission.submission_id);
  assert.equal(JSON.parse(calls[0][1].body).property_code, "OWN_TIME_HOME_CLUB_GRAMADO");

  const rejected = await handleLeadRequest(requestFor(), {
    config: enabledConfig(),
    fetchImpl: async () => new Response(null, { status: 200 })
  });
  assert.equal(rejected.status, 502);
});

test("nao vaza endpoint nem resposta upstream em erro", async () => {
  const response = await handleLeadRequest(requestFor(), {
    config: enabledConfig(),
    fetchImpl: async () => new Response("upstream details", { status: 500 })
  });
  const serialized = JSON.stringify(await response.json());
  assert.equal(response.status, 502);
  assert.doesNotMatch(serialized, /webhook\.example\.invalid|upstream details/);
});
