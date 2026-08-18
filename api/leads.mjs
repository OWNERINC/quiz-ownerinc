import { handleLeadRequest } from "../src/lead-handler.mjs";
import { createLeadRateLimiter, rateLimitConfigFromEnv } from "../server.mjs";

const defaultRateLimiter = createLeadRateLimiter({
  ...rateLimitConfigFromEnv(),
  now: () => new Date()
});

function nodeRequestToWebRequest(request) {
  const protocol = request.headers?.["x-forwarded-proto"] || "https";
  const host = request.headers?.host || "quiz.invalid";
  const body = request.body === undefined
    ? undefined
    : typeof request.body === "string"
      ? request.body
      : JSON.stringify(request.body);
  return new Request(`${protocol}://${host}${request.url || "/api/leads"}`, {
    method: request.method,
    headers: request.headers,
    ...(body === undefined ? {} : { body })
  });
}

export function createLeadRateLimitedHandler({ rateLimiter = defaultRateLimiter, handleRequest = handleLeadRequest } = {}) {
  return async function handler(request, response) {
    if (request.method === "POST") {
      const rateLimit = rateLimiter(request);
      if (!rateLimit.allowed) {
        response.status(429);
        response.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.send(JSON.stringify({ status: "REJECTED", code: "RATE_LIMITED" }));
        return;
      }
    }
    const webResponse = await handleRequest(nodeRequestToWebRequest(request));
    response.status(webResponse.status);
    for (const [name, value] of webResponse.headers) response.setHeader(name, value);
    response.send(await webResponse.text());
  };
}

export default createLeadRateLimitedHandler();
