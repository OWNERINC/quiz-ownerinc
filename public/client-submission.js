const QUESTION_KEYS = Object.freeze({
  affinity: Object.freeze(["acomodacao", "atmosfera", "convivencia", "localizacao", "experiencia"]),
  profile: Object.freeze(["companhia", "momento", "viagem"])
});

export function createSubmissionAttempt({ randomUUID = () => crypto.randomUUID(), now = () => new Date() } = {}) {
  return Object.freeze({
    submission_id: randomUUID(),
    occurred_at: now().toISOString()
  });
}

export function normalizeWhatsapp(value) {
  const input = String(value ?? "").trim();
  const digits = input.replace(/\D/g, "");
  if (input.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return input;
}

function pickResponses(responses, keys) {
  return Object.fromEntries(keys.map((key) => [key, responses[key]]));
}

function normalizeCampaign(campaign = {}) {
  return Object.fromEntries(["source", "medium", "campaign", "content", "term"]
    .map((key) => [key, campaign[key] || null]));
}

export function toClientSubmission({ attempt, contact, consentGranted, responses, resultKey, campaign }) {
  if (!attempt || !responses) throw new TypeError("SUBMISSION_INPUT_INVALID");
  return {
    submission_id: attempt.submission_id,
    occurred_at: attempt.occurred_at,
    contact: {
      name: String(contact?.name ?? "").trim(),
      whatsapp: normalizeWhatsapp(contact?.whatsapp),
      email: String(contact?.email ?? "").trim().toLowerCase()
    },
    consent: { granted: consentGranted === true },
    answers: {
      affinity: pickResponses(responses, QUESTION_KEYS.affinity),
      profile: pickResponses(responses, QUESTION_KEYS.profile)
    },
    result_key: resultKey,
    campaign: normalizeCampaign(campaign)
  };
}
