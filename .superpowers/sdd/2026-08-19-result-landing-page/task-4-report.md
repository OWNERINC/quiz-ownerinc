# Task 4 Verification Report

## Status

PASS. Task 4 verification, push, deployment, and production smoke testing are
complete. No real lead was sent and no Vercel project or secret was created.

## Push And Deploy

- Project: `C:\Ownerinc\.tmp-quiz-redesign`
- Branch pushed: `quiz-ownerinc-redesign-plan` at `f5d8e8c`
- Remote target: `quiz-ownerinc/main`
- Push result: successful
- Vercel project: existing linked project `lp_tijolo`
- Deployment inspection: `https://vercel.com/testesccc/lp_tijolo/BfpEseZ1mXpFoYizH49N8ejtZx1M`
- Deployment URL: `https://lptijolo-lrv74v2m9-testesccc.vercel.app`
- Preserved production alias: `https://lptijolo.vercel.app`
- Vercel result: `Ready`; alias confirmation was reported by the CLI

The only product change found during verification was a real 768px horizontal
overflow after opening the registration form. The fix allows the desktop grid,
result grid items, and long form headings/consent text to shrink or wrap. The
corresponding source contract assertions were added.

Changed files in the deployed commit:

- `public/styles.css`
- `tests/ui-contract.test.mjs`

## Test Suite

Command:

```text
npm test
```

Result on the final code:

- 44 tests discovered
- 43 passed
- 1 failed because Windows denied creation of the temporary symlink with
  `EPERM`
- The failing test is `does not serve a public symlink whose target is outside public`
  in `tests/server.test.mjs:265`
- The failure occurs in the test setup at `tests/server.test.mjs:274`, before the
  application assertion can run
- This is the known Windows temporary symlink limitation specified by Task 4

Focused regression command after the overflow fix:

```text
node --test tests/ui-contract.test.mjs
```

Result: 12 passed, 0 failed.

Whitespace validation:

```text
git diff --check HEAD~1 HEAD
```

Result: passed with no output.

## Playwright Smoke

The Chromium smoke harness ran against both the local server and the live
production alias. Each viewport completed the full flow twice: first to the
Nest result and then after reset to the Owntime result.

Viewports:

- `320x568`: local passed; production passed
- `390x844`: local passed; production passed
- `463x968`: local passed; production passed
- `768x1024`: local passed; production passed
- `1366x768`: local passed; production passed

Checks covered:

- All 8 questions, including the fixed question order
- Back navigation from question 2 to question 1
- Nest and Owntime result classification after repeated quiz runs
- Result hero title and dynamic subtitle
- Official result hero image
- Exactly 3 rendered benefits
- Ownerinc trust block
- `Falar com atendente` CTA
- CTA scroll to the registration form and registration heading visibility
- Name, WhatsApp, e-mail, and consent fields
- Native form validation with incomplete data
- Synthetic `503` response and visible recovery error
- Synthetic `202` response and success state
- Success reset and result reset paths
- No horizontal overflow on the document or nested result scroller
- Reduced-motion media emulation and disabled result transitions
- No application `console` errors or page errors

The smoke route-intercepted every `POST /api/leads` request. It returned a
synthetic `503` for the recovery check and a synthetic `202` for the success
check. No request reached a real webhook or lead receiver. Chromium emits its
own expected `Failed to load resource` console message for a deliberately
synthetic HTTP 503; that fixture-only message was excluded from the application
console-error assertion. No application logging or page error occurred.

## Production Endpoint Checks

Against `https://lptijolo.vercel.app`:

- `GET /api/config`: `200`
- `GET /client-submission.js`: `200`

The production smoke also consumed the deployed result landing page and passed
the same synthetic form flow without sending a real lead.

## Concerns

- `npm test` remains one test short of a clean pass only because this Windows
  environment cannot create the temporary symlink required by the path-traversal
  test. The known `EPERM` is environmental and does not indicate an application
  failure.
- Vercel emitted non-blocking warnings that the project has a custom `builds`
  configuration and that the Node engine range will follow future major Node
  releases. Deployment completed successfully.
- The temporary Playwright harness and its local-only dependency were removed
  after verification; the working tree contains only the committed report
  change after the report commit.
