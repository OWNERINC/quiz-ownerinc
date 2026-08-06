# Result Webhooks And Vercel Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route validated leads to separate Nest and Owntime webhooks and publish the existing LP as a Vercel preview.

**Architecture:** `server.mjs` remains the only endpoint implementation and chooses credentials from its recalculated result. Two tiny Vercel functions forward native requests to that server, while explicit rewrites expose the existing `public` files at their current root URLs.

**Tech Stack:** Node.js 20+, native Node HTTP server and tests, Vercel Functions.

## Global Constraints

- Webhook selection is server-side and uses the recalculated result.
- Nest and Owntime use separate URL and token environment variables.
- No generic webhook fallback remains.
- No secrets are committed.
- The first deployment is a preview, not production.

---

### Task 1: Route Leads By Recalculated Result

**Files:**
- Modify: `server.mjs`
- Modify: `tests/server.test.mjs`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: `validateLead(input)` returning `value.result` as `nest` or `owntime`.
- Produces: `createServer({ nestWebhookUrl, nestWebhookToken, owntimeWebhookUrl, owntimeWebhookToken })`.

- [ ] **Step 1: Replace generic test options with result-specific options**

Use `nestWebhookUrl`, `nestWebhookToken`, `owntimeWebhookUrl`, and
`owntimeWebhookToken`; set all four to `null` in `publicOptions`.

- [ ] **Step 2: Add failing routing assertions**

Submit the existing Owntime-majority input and assert only the Owntime URL and
Bearer token are used. Submit a Nest-majority answer set and assert only the
Nest URL and Bearer token are used. Keep the missing-destination `503` case.

- [ ] **Step 3: Run the server tests and confirm failure**

Run: `node --test tests/server.test.mjs`

Expected: the new option names are not yet consumed.

- [ ] **Step 4: Implement minimal routing**

Read defaults from:

```js
nestWebhookUrl = process.env.NEST_WEBHOOK_URL
nestWebhookToken = process.env.NEST_WEBHOOK_TOKEN
owntimeWebhookUrl = process.env.OWNTIME_WEBHOOK_URL
owntimeWebhookToken = process.env.OWNTIME_WEBHOOK_TOKEN
```

After `validateLead`, choose the matching pair from `lead.value.result`, then
reuse the existing forwarding logic unchanged.

- [ ] **Step 5: Update environment documentation**

Replace `LEAD_WEBHOOK_URL` and `LEAD_WEBHOOK_TOKEN` in `.env.example` and
`README.md` with the four exact variable names above.

- [ ] **Step 6: Verify the project**

Run: `npm run verify`

Expected: all LP Tijolo tests pass.

### Task 2: Add Vercel Adapters And Publish Preview

**Files:**
- Create: `api/config.mjs`
- Create: `api/leads.mjs`
- Create: `vercel.json`

**Interfaces:**
- Consumes: `createServer()` from `server.mjs` and existing environment variables.
- Produces: Vercel endpoints `/api/config`, `/api/leads`, and root static paths.

- [ ] **Step 1: Add minimal function adapters**

Each function contains:

```js
import { createServer } from "../server.mjs";

const server = createServer();

export default function handler(request, response) {
  server.emit("request", request, response);
}
```

- [ ] **Step 2: Add explicit static rewrites**

Create `vercel.json` rewrites for `/`, `/styles.css`, `/app.js`, `/quiz.js`,
and `/assets/:path*` into the matching paths below `/public`. Configure both
functions with `maxDuration: 10` and retain the server's security headers.

- [ ] **Step 3: Verify locally**

Run: `npm run verify`

Expected: all tests pass with the new adapter files present.

- [ ] **Step 4: Publish a preview with public environment values**

Run `vercel deploy --yes` with preview environment values for
`PRIVACY_POLICY_URL`, `OWNTIME_URL`, and `NEST_URL`. Do not pass webhook secrets.

- [ ] **Step 5: Smoke-test the deployment**

Request the returned preview URL and `/api/config`.

Expected: the page returns `200`; configuration returns the three public HTTPS
URLs; a valid lead returns `503` until its matching webhook is configured.
