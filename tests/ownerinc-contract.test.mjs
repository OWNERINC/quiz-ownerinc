import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTRACT,
  buildWebhookEnvelope,
  classifyAffinity,
  validateClientSubmission
} from "../src/contract.mjs";
import { createSubmissionAttempt, toClientSubmission } from "../public/client-submission.js";

const validSubmission = Object.freeze({
  submission_id: "123e4567-e89b-42d3-a456-426614174000",
  occurred_at: "2026-08-10T15:00:00.000Z",
  contact: {
    name: "Lead Sintetico",
    whatsapp: "+5551999990000",
    email: "lead@example.invalid"
  },
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
  campaign: {
    source: "instagram",
    medium: "social",
    campaign: "synthetic-campaign",
    content: "creative-a",
    term: null
  }
});

function cloneSubmission() {
  return structuredClone(validSubmission);
}

const serverContext = Object.freeze({
  consentTextVersion: "synthetic-consent-v1",
  policyReference: "ownerinc-privacy-policy",
  requestId: "request-synthetic-001",
  receivedAt: "2026-08-10T15:00:01.000Z",
  environment: "test"
});

test("classifica o empreendimento pelas chaves estaveis, sem depender do texto visivel", () => {
  assert.deepEqual(classifyAffinity(cloneSubmission().answers.affinity), {
    result_key: "owntime",
    property_code: "OWN_TIME_HOME_CLUB_GRAMADO",
    scores: { owntime: 4, nest: 1 }
  });
});
test("rejeita chaves, valores, resultado e consentimento divergentes", () => {
  const missingKey = cloneSubmission();
  delete missingKey.answers.affinity.acomodacao;
  assert.throws(() => validateClientSubmission(missingKey), /ANSWER_KEYS_INVALID/);

  const visibleText = cloneSubmission();
  visibleText.answers.profile.companhia = "texto-visivel-da-opcao";
  assert.throws(() => validateClientSubmission(visibleText), /ANSWER_VALUE_INVALID/);

  const wrongResult = cloneSubmission();
  wrongResult.result_key = "nest";
  assert.throws(() => validateClientSubmission(wrongResult), /RESULT_MISMATCH/);

  const noConsent = cloneSubmission();
  noConsent.consent.granted = false;
  assert.throws(() => validateClientSubmission(noConsent), /CONSENT_REQUIRED/);
});

test("gera envelope versionado, multiempreendimento e idempotente", () => {
  const envelope = buildWebhookEnvelope(cloneSubmission(), serverContext);
  assert.equal(envelope.schema_version, CONTRACT.schemaVersion);
  assert.equal(envelope.quiz_version, CONTRACT.quizVersion);
  assert.equal(envelope.flow_id, CONTRACT.flowId);
  assert.equal(envelope.form_id, CONTRACT.formId);
  assert.equal(envelope.property_code, "OWN_TIME_HOME_CLUB_GRAMADO");
  assert.deepEqual(envelope.empreendimento, {
    code: "OWN_TIME_HOME_CLUB_GRAMADO",
    key: "owntime"
  });
  assert.equal(envelope.idempotency.key, validSubmission.submission_id);
  assert.equal(envelope.consent.capture_method, "explicit_checkbox");
  assert.equal(envelope.consent.text_version, "synthetic-consent-v1");
  assert.equal(envelope.metadata.ip_address, undefined);
  assert.equal(envelope.metadata.user_agent, undefined);
  assert.doesNotMatch(JSON.stringify(envelope), /Quando imagina|A amplitude|Qual atmosfera/);
});

test("cliente cria uma tentativa idempotente e converte respostas para objetos keyed", () => {
  const attempt = createSubmissionAttempt({
    randomUUID: () => validSubmission.submission_id,
    now: () => new Date(validSubmission.occurred_at)
  });
  const payload = toClientSubmission({
    attempt,
    contact: { name: " Lead Sintetico ", whatsapp: "(51) 99999-0000", email: "LEAD@EXAMPLE.INVALID" },
    consentGranted: true,
    responses: { ...validSubmission.answers.affinity, ...validSubmission.answers.profile },
    resultKey: "owntime",
    campaign: { source: "instagram" }
  });
  assert.equal(payload.submission_id, validSubmission.submission_id);
  assert.equal(payload.contact.whatsapp, "+5551999990000");
  assert.deepEqual(payload.answers, validSubmission.answers);
  assert.deepEqual(payload.campaign, {
    source: "instagram", medium: null, campaign: null, content: null, term: null
  });
});
