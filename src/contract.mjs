const AFFINITY_KEYS = Object.freeze(["acomodacao", "atmosfera", "convivencia", "localizacao", "experiencia"]);
const PROFILE_KEYS = Object.freeze(["companhia", "momento", "viagem"]);

const AFFINITY_VALUES = new Set(["owntime", "nest"]);
const PROFILE_VALUES = Object.freeze({
  companhia: new Set(["proprio-ritmo", "casal", "familia", "geracoes"]),
  momento: new Set(["desacelerar", "descobertas-a-dois", "memorias-em-familia", "pessoas-queridas"]),
  viagem: new Set(["liberdade", "planejamento-a-dois", "conforto-familiar", "reunir-pessoas"])
});

const PROPERTY_BY_RESULT = Object.freeze({
  owntime: "OWN_TIME_HOME_CLUB_GRAMADO",
  nest: "NEST_MOUNTAIN_LODGE"
});

const CAMPAIGN_KEYS = Object.freeze(["source", "medium", "campaign", "content", "term"]);
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164 = /^\+[1-9]\d{9,14}$/;

export const CONTRACT = Object.freeze({
  schemaVersion: "ownerinc.quiz.submission.v1",
  quizVersion: "ownerinc.quiz.affinity.v1",
  flowId: "ownerinc.quiz.lead_capture.v1",
  formId: "ownerinc.quiz.contact_form.v1"
});

function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(record, expected, code) {
  if (!isRecord(record)) fail(code);
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(code);
}

function requireString(value, code, { min = 1, max = 256 } = {}) {
  if (typeof value !== "string") fail(code);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) fail(code);
  return normalized;
}

function requireIsoDate(value, code) {
  const normalized = requireString(value, code, { max: 40 });
  if (!Number.isFinite(Date.parse(normalized))) fail(code);
  return new Date(normalized).toISOString();
}

function validateAnswers(answers) {
  assertExactKeys(answers, ["affinity", "profile"], "ANSWERS_SHAPE_INVALID");
  assertExactKeys(answers.affinity, AFFINITY_KEYS, "ANSWER_KEYS_INVALID");
  assertExactKeys(answers.profile, PROFILE_KEYS, "ANSWER_KEYS_INVALID");

  for (const key of AFFINITY_KEYS) {
    if (!AFFINITY_VALUES.has(answers.affinity[key])) fail("ANSWER_VALUE_INVALID");
  }
  for (const key of PROFILE_KEYS) {
    if (!PROFILE_VALUES[key].has(answers.profile[key])) fail("ANSWER_VALUE_INVALID");
  }
  return structuredClone(answers);
}

function validateCampaign(campaign) {
  assertExactKeys(campaign, CAMPAIGN_KEYS, "CAMPAIGN_SHAPE_INVALID");
  return Object.fromEntries(CAMPAIGN_KEYS.map((key) => {
    const value = campaign[key];
    if (value === null || value === "") return [key, null];
    return [key, requireString(value, "CAMPAIGN_VALUE_INVALID", { max: 160 })];
  }));
}

export function classifyAffinity(affinityAnswers) {
  assertExactKeys(affinityAnswers, AFFINITY_KEYS, "ANSWER_KEYS_INVALID");
  for (const value of Object.values(affinityAnswers)) {
    if (!AFFINITY_VALUES.has(value)) fail("ANSWER_VALUE_INVALID");
  }
  const owntime = Object.values(affinityAnswers).filter((value) => value === "owntime").length;
  const nest = AFFINITY_KEYS.length - owntime;
  const resultKey = owntime > nest ? "owntime" : "nest";
  return {
    result_key: resultKey,
    property_code: PROPERTY_BY_RESULT[resultKey],
    scores: { owntime, nest }
  };
}

export function validateClientSubmission(input) {
  assertExactKeys(input, ["submission_id", "occurred_at", "contact", "consent", "answers", "result_key", "campaign"], "SUBMISSION_SHAPE_INVALID");
  const submissionId = requireString(input.submission_id, "SUBMISSION_ID_INVALID", { max: 36 });
  if (!UUID_V4.test(submissionId)) fail("SUBMISSION_ID_INVALID");

  assertExactKeys(input.contact, ["name", "whatsapp", "email"], "CONTACT_SHAPE_INVALID");
  const contact = {
    name: requireString(input.contact.name, "CONTACT_NAME_INVALID", { min: 2, max: 120 }).replace(/\s+/g, " "),
    whatsapp: requireString(input.contact.whatsapp, "CONTACT_WHATSAPP_INVALID", { max: 16 }),
    email: requireString(input.contact.email, "CONTACT_EMAIL_INVALID", { max: 254 }).toLowerCase()
  };
  if (!E164.test(contact.whatsapp)) fail("CONTACT_WHATSAPP_INVALID");
  if (!EMAIL.test(contact.email)) fail("CONTACT_EMAIL_INVALID");

  assertExactKeys(input.consent, ["granted"], "CONSENT_SHAPE_INVALID");
  if (input.consent.granted !== true) fail("CONSENT_REQUIRED");

  const answers = validateAnswers(input.answers);
  const classification = classifyAffinity(answers.affinity);
  if (input.result_key !== classification.result_key) fail("RESULT_MISMATCH");

  return {
    submission_id: submissionId,
    occurred_at: requireIsoDate(input.occurred_at, "OCCURRED_AT_INVALID"),
    contact,
    consent: { granted: true },
    answers,
    result_key: classification.result_key,
    campaign: validateCampaign(input.campaign)
  };
}

export function buildWebhookEnvelope(input, context) {
  const submission = validateClientSubmission(input);
  if (!isRecord(context)) fail("SERVER_CONTEXT_INVALID");
  const classification = classifyAffinity(submission.answers.affinity);
  const consentTextVersion = requireString(context.consentTextVersion, "CONSENT_TEXT_VERSION_REQUIRED", { max: 120 });
  const policyReference = requireString(context.policyReference, "POLICY_REFERENCE_REQUIRED", { max: 160 });
  const requestId = requireString(context.requestId, "REQUEST_ID_REQUIRED", { max: 160 });
  const environment = requireString(context.environment, "ENVIRONMENT_REQUIRED", { max: 40 });

  return {
    schema_version: CONTRACT.schemaVersion,
    quiz_version: CONTRACT.quizVersion,
    flow_id: CONTRACT.flowId,
    form_id: CONTRACT.formId,
    submission_id: submission.submission_id,
    occurred_at: submission.occurred_at,
    property_code: classification.property_code,
    empreendimento: {
      code: classification.property_code,
      key: classification.result_key
    },
    source: {
      system: "ownerinc_quiz",
      channel: "web",
      origin: "landing_page",
      campaign: submission.campaign
    },
    contact: submission.contact,
    answers: submission.answers,
    result: classification,
    consent: {
      granted: true,
      captured_at: submission.occurred_at,
      capture_method: "explicit_checkbox",
      text_version: consentTextVersion,
      policy_reference: policyReference
    },
    idempotency: {
      key: submission.submission_id,
      scope: CONTRACT.flowId
    },
    metadata: {
      request_id: requestId,
      received_at: requireIsoDate(context.receivedAt, "RECEIVED_AT_INVALID"),
      environment,
      transport: "server_side"
    }
  };
}

export const QUESTION_KEYS = Object.freeze({ affinity: AFFINITY_KEYS, profile: PROFILE_KEYS });
