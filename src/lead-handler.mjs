import { randomUUID } from "node:crypto";
import { buildWebhookEnvelope } from "./contract.mjs";

const MAX_BODY_BYTES = 64 * 1024;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export function leadConfigFromEnv(env = process.env) {
  return {
    webhookEnabled: env.OWNERINC_QUIZ_WEBHOOK_ENABLED === "true",
    webhookUrl: env.OWNERINC_QUIZ_WEBHOOK_URL || "",
    consentTextVersion: env.OWNERINC_QUIZ_CONSENT_TEXT_VERSION || "",
    policyReference: env.OWNERINC_QUIZ_POLICY_REFERENCE || "",
    environment: env.OWNERINC_QUIZ_ENVIRONMENT || "production",
    publicOrigin: env.PUBLIC_ORIGIN || ""
  };
}

function validHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function validHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      url.pathname === "/" && !url.search && !url.hash ? url.origin : null;
  } catch {
    return null;
  }
}

function safeValidationCode(error) {
  const known = new Set([
    "SUBMISSION_SHAPE_INVALID", "SUBMISSION_ID_INVALID", "OCCURRED_AT_INVALID",
    "CONTACT_SHAPE_INVALID", "CONTACT_NAME_INVALID", "CONTACT_WHATSAPP_INVALID", "CONTACT_EMAIL_INVALID",
    "CONSENT_SHAPE_INVALID", "CONSENT_REQUIRED", "ANSWERS_SHAPE_INVALID", "ANSWER_KEYS_INVALID",
    "ANSWER_VALUE_INVALID", "RESULT_MISMATCH", "CAMPAIGN_SHAPE_INVALID", "CAMPAIGN_VALUE_INVALID"
  ]);
  return known.has(error?.code) ? error.code : "SUBMISSION_INVALID";
}

export async function handleLeadRequest(request, {
  config = leadConfigFromEnv(),
  fetchImpl = fetch,
  now = () => new Date(),
  createRequestId = randomUUID
} = {}) {
  if (request.method !== "POST") return jsonResponse(405, { status: "REJECTED", code: "METHOD_NOT_ALLOWED" });
  if (config.webhookEnabled !== true) return jsonResponse(503, { status: "DISABLED", code: "QUIZ_WEBHOOK_DISABLED" });

  const webhookUrl = validHttpsUrl(config.webhookUrl);
  if (!webhookUrl || !config.consentTextVersion || !config.policyReference) {
    return jsonResponse(503, { status: "DISABLED", code: "QUIZ_WEBHOOK_CONFIG_INCOMPLETE" });
  }

  if (config.publicOrigin) {
    const expectedOrigin = validHttpsOrigin(config.publicOrigin);
    let requestOrigin;
    try {
      requestOrigin = new URL(request.headers.get("origin") || "").origin;
    } catch {
      requestOrigin = null;
    }
    if (!expectedOrigin) {
      return jsonResponse(503, { status: "DISABLED", code: "QUIZ_WEBHOOK_CONFIG_INCOMPLETE" });
    }
    if (requestOrigin !== expectedOrigin) {
      return jsonResponse(400, { status: "REJECTED", code: "ORIGIN_NOT_ALLOWED" });
    }
  }

  const contentType = (request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return jsonResponse(415, { status: "REJECTED", code: "CONTENT_TYPE_JSON_REQUIRED" });
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return jsonResponse(413, { status: "REJECTED", code: "PAYLOAD_TOO_LARGE" });
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return jsonResponse(422, { status: "REJECTED", code: "JSON_OBJECT_REQUIRED" });
  }

  const requestId = (request.headers.get("x-request-id") || createRequestId()).slice(0, 160);
  let envelope;
  try {
    envelope = buildWebhookEnvelope(input, {
      consentTextVersion: config.consentTextVersion,
      policyReference: config.policyReference,
      requestId,
      receivedAt: now().toISOString(),
      environment: config.environment || "production"
    });
  } catch (error) {
    return jsonResponse(422, { status: "REJECTED", code: safeValidationCode(error) });
  }

  try {
    const upstream = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Request-Id": requestId,
        "Idempotency-Key": envelope.submission_id
      },
      body: JSON.stringify(envelope),
      redirect: "error",
      signal: AbortSignal.timeout(8000)
    });
    if (upstream.status !== 202) {
      return jsonResponse(502, { status: "RETRYABLE_ERROR", code: "CAPTURE_UPSTREAM_REJECTED" });
    }
  } catch {
    return jsonResponse(502, { status: "RETRYABLE_ERROR", code: "CAPTURE_UPSTREAM_UNAVAILABLE" });
  }

  return jsonResponse(202, {
    status: "ACCEPTED_CAPTURE_ONLY",
    submission_id: envelope.submission_id
  });
}
