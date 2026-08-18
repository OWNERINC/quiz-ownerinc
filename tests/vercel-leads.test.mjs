import assert from "node:assert/strict";
import test from "node:test";
import { createLeadRateLimitedHandler } from "../api/leads.mjs";
import { rateLimitConfigFromEnv, createLeadRateLimiter } from "../server.mjs";

function responseRecorder() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    status(value) { this.statusCode = value; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    send(value) { this.body = value; }
  };
}

function request(address = "198.51.100.88") {
  return {
    method: "POST",
    url: "/api/leads",
    headers: {
      host: "lptijolo.vercel.app",
      origin: "https://lptijolo.vercel.app",
      "x-forwarded-for": `${address}, 203.0.113.10`
    },
    body: "{}",
    socket: { remoteAddress: "203.0.113.10" }
  };
}

test("Vercel adapter honors configured rate limits before forwarding", async () => {
  let forwarded = 0;
  let timestamp = 0;
  const handler = createLeadRateLimitedHandler({
    rateLimiter: createLeadRateLimiter({
      ...rateLimitConfigFromEnv({
        OWNERINC_QUIZ_RATE_LIMIT_MAX: "2",
        OWNERINC_QUIZ_RATE_LIMIT_WINDOW_MS: "60000",
        OWNERINC_QUIZ_TRUST_PROXY_HOPS: "1"
      }),
      now: () => new Date(timestamp)
    }),
    handleRequest: async () => {
      forwarded += 1;
      return new Response(JSON.stringify({ status: "ACCEPTED_CAPTURE_ONLY" }), {
        status: 202,
        headers: { "content-type": "application/json" }
      });
    }
  });

  const first = responseRecorder();
  await handler(request(), first);
  const second = responseRecorder();
  await handler(request(), second);
  const third = responseRecorder();
  await handler(request(), third);

  assert.equal(first.statusCode, 202);
  assert.equal(second.statusCode, 202);
  assert.equal(third.statusCode, 429);
  assert.equal(third.headers["retry-after"], "60");
  assert.deepEqual(JSON.parse(third.body), { status: "REJECTED", code: "RATE_LIMITED" });
  assert.equal(forwarded, 2);

  timestamp = 60_000;
  const afterWindow = responseRecorder();
  await handler(request(), afterWindow);
  assert.equal(afterWindow.statusCode, 202);
  assert.equal(forwarded, 3);
});
