# Result Webhooks And Vercel Preview

## Goal

Publish LP Tijolo as a Vercel preview and route each validated lead to the
webhook belonging to its server-calculated affinity.

## Webhook Routing

The server continues to validate the submitted answers and calculate the
result itself. It selects one configuration pair from that result:

- `nest`: `NEST_WEBHOOK_URL` and `NEST_WEBHOOK_TOKEN`.
- `owntime`: `OWNTIME_WEBHOOK_URL` and `OWNTIME_WEBHOOK_TOKEN`.

The browser cannot select a webhook. Tokens remain server-only and are sent as
Bearer credentials only to their matching URL. The existing generic
`LEAD_WEBHOOK_URL` and `LEAD_WEBHOOK_TOKEN` variables are removed rather than
kept as a second routing path.

If the matching URL is absent, that submission returns the existing controlled
service-unavailable response. One configured destination does not enable the
other result.

## Vercel Adapter

The existing Node server remains the single implementation of configuration,
lead validation, headers, and webhook forwarding. Minimal Vercel functions for
`/api/config` and `/api/leads` forward requests to that server instead of
duplicating endpoint logic.

Vercel serves the existing `public` directory. Preview environment variables
contain only the three public HTTPS URLs; result webhook secrets can be added
later without another code change.

## Verification

- Unit tests prove Nest uses only Nest credentials.
- Unit tests prove Owntime uses only Owntime credentials.
- A missing matching webhook returns the controlled unavailable response.
- Existing validation, static serving, and UI contract tests continue to pass.
- The Vercel preview returns the landing page and valid `/api/config` JSON.
- Lead submission remains visibly unavailable until its matching webhook is
  configured.

## Non-Goals

- No production deployment or custom domain.
- No webhook credentials committed to Git.
- No fallback from one result to the other result's webhook.
- No CRM-specific payload variants.
