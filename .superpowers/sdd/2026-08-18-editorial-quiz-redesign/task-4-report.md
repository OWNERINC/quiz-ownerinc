# Task 4 Report: Verify the Complete Journey and Publish

Date: 2026-08-18
Worktree: `C:\Ownerinc\.tmp-quiz-redesign`
Branch: `quiz-ownerinc-redesign-plan`

## Status

Local implementation verification passed. The project was pushed to the
Ownerinc repository. Production deployment was not attempted because this
worktree is not linked to the existing Vercel project; the current production
URL is serving an older build and still needs an authorized deployment from a
linked project root.

## Project Checks

### Full check

Command:

```text
npm run verify
```

Result: 38 passed, 1 failed.

The only failure is the Windows symlink test:

```text
test at tests\server.test.mjs:265:1
does not serve a public symlink whose target is outside public
Error: EPERM: operation not permitted, symlink
```

This is the environment limitation described in the Task 4 brief. The
failure happens while creating the temporary symlink, before the application
code runs.

### Remaining tests

Commands:

```text
node --test --test-name-pattern="^(rejects missing|exposes only|reports health|uses configured|rejects public-origin|accepts only|rate limits|rejects invalid rate|routes both|fails closed|rejects invalid lead|serves public|serves active)" tests/server.test.mjs
node --test tests/deploy-contract.test.mjs tests/ownerinc-contract.test.mjs tests/ownerinc-handler.test.mjs tests/quiz.test.mjs tests/ui-contract.test.mjs
```

Results:

```text
server.test.mjs remaining tests: 12 passed, 0 failed
other project tests: 25 passed, 0 failed
```

`git diff --check` passed.

## Local Chromium Smoke

The local server was started with public URLs configured and
`OWNERINC_QUIZ_WEBHOOK_ENABLED=false`. A temporary Playwright Chromium spec
was used and removed after verification; it was not added to the project.

Command:

```text
npx --yes playwright@1.55.0 test task4-smoke.spec.mjs --reporter=line
```

Result:

```text
Running 6 tests using 1 worker
6 passed (16.1s)
```

Covered viewport matrix:

```text
320x568   passed
390x844   passed
463x968   passed
768px     passed as 768x1024
1366x768  passed
```

Journey coverage in each viewport:

- Intro and start CTA.
- All eight questions with selected-answer state.
- Back navigation from question 3 to question 2 with the previous answer preserved.
- Result stage and editorial result copy.
- Lead form reveal and focus transfer.
- Native invalid form state using a too-short name.
- Capture-disabled error state using a synthetic `503` response; no external lead was sent.
- Success state using a synthetic `202` response; no external lead was sent.
- No horizontal overflow.
- No console, page, or failed-request errors apart from the deliberately mocked responses, which were kept out of the browser network layer.
- Selected answers were distinguishable without color alone: selected label weight `700`, unselected label weight `400`.

Reduced-motion and keyboard run:

- Viewport `390x844` with Playwright `reducedMotion: "reduce"`.
- Keyboard reached the start CTA, question prompt, first answer, and continue CTA.
- Focus outline was visible on the start CTA.
- Computed question transition was `0s`; animation was `none`.
- Selected answer remained visibly marked after keyboard activation.
- No console or page errors.

## Push

Command:

```text
git push quiz-ownerinc HEAD:main
```

Output:

```text
To https://github.com/OWNERINC/quiz-ownerinc.git
   0a3cea8..cec8b67  HEAD -> main
```

Remote verification:

```text
cec8b67a83743ea4d1779ddcf8bf70cdf582ebdb refs/heads/main
```

URLs:

- Repository: https://github.com/OWNERINC/quiz-ownerinc
- Pushed commit: https://github.com/OWNERINC/quiz-ownerinc/commit/cec8b67a83743ea4d1779ddcf8bf70cdf582ebdb
- Production URL: https://lptijolo.vercel.app

The required verification report was then committed as
`7e5b176` (`docs(quiz): record editorial journey verification`) and pushed to
the same `main` branch. The final remote `main` therefore includes both the
redesign code and this report.

## Vercel Deployment

Deployment was not attempted. The worktree has neither `.vercel` nor
`.vercel/project.json`, and `vercel` is not installed in PATH. Per the brief,
no new Vercel project was created and no production secrets were changed.

The existing production URL was checked:

```text
GET https://lptijolo.vercel.app
status=200
title=Descubra sua afinidade em Gramado | Ownerinc
```

The production assets do not match the pushed redesign commit:

```text
html_intro_0108=False
css_surface=False
css_transition=False
js_selected_hook=False
```

The same exact Chromium smoke command against
`BASE_URL=https://lptijolo.vercel.app` produced 0 passed and 6 failed:

- Five viewport journeys stopped because the production build did not expose `.answer-choice.is-selected` after selection.
- The reduced-motion check found `transition: 1e-05s` instead of the current local override of `0s`.

This confirms the URL is an older deployment, not a failure in the pushed
worktree. A linked Vercel project and authorized production deployment are
required before repeating the production smoke check.

## Concerns

- `npm run verify` remains red only because Windows blocks the temporary symlink test with `EPERM` in this environment.
- Production is stale relative to `cec8b67`; it was not changed because the worktree is not linked to Vercel and creating a project was explicitly disallowed.
- No production deploy URL was generated in this task.

## Task 4 Resume: Deployment and Expanded Keyboard Verification

Date: 2026-08-18

### Vercel Link and Environment

Command:

```text
npx vercel link --project lp_tijolo --scope testesccc --yes
```

Output:

```text
Directory       C:\Ownerinc\.tmp-quiz-redesign
Searching for existing projects…
✓ Linked          testesccc/lp_tijolo
```

No project was created. Vercel generated local ignored link metadata and a
temporary `.env.local`; the temporary file was removed and no environment
material was committed.

Production environment inspection initially showed `PUBLIC_ORIGIN` already
present. The following missing variables were added only to the Production
environment with the user-provided values:

```text
OWNERINC_QUIZ_WEBHOOK_ENABLED=true
OWNERINC_QUIZ_WEBHOOK_URL=<configured production webhook URL>
OWNERINC_QUIZ_CONSENT_TEXT_VERSION=v1
OWNERINC_QUIZ_POLICY_REFERENCE=https://ownerinc.com.br/politica-de-privacidade/
OWNERINC_QUIZ_ENVIRONMENT=production
```

`PUBLIC_ORIGIN=https://lptijolo.vercel.app` was already present and was not
overwritten. Existing legacy URL and webhook variables were left untouched.
No token or unrelated secret was created.

### Deployment

Initial requested deployment:

```text
npx vercel deploy --prod --yes --scope testesccc
```

Initial deployment completed and aliased the public URL, but production smoke
found that `/client-submission.js` returned `404`, preventing `app.js` from
initializing. The missing rewrite was the only application change made during
this resume:

```text
{ "source": "/client-submission.js", "destination": "/public/client-submission.js" }
```

The fix was committed as `bc6703d` (`fix(quiz): route client submission module`)
and pushed to `quiz-ownerinc/main`:

```text
To https://github.com/OWNERINC/quiz-ownerinc.git
   0287f0f..bc6703d  HEAD -> main
```

The corrected production deployment used the same command:

```text
npx vercel deploy --prod --yes --scope testesccc
```

Output URLs:

- Inspect: https://vercel.com/testesccc/lp_tijolo/Gt5seQX3WQ4dJYAcZCayFGfWGqkW
- Deployment: https://lptijolo-fac6s5ww8-testesccc.vercel.app
- Preserved production alias: https://lptijolo.vercel.app

The deployment completed with `✓ Ready in 9s` and `▲ Aliased
https://lptijolo.vercel.app`. Vercel emitted non-blocking warnings that the
existing `builds` configuration overrides dashboard build settings and that
the `deploy` directory could be deployed separately; neither changed this
deployment.

### Production Endpoint Evidence

After the corrected deployment:

```text
GET https://lptijolo.vercel.app/api/config
status=200
body={"privacyPolicyUrl":"https://ownerinc.com.br/politica-de-privacidade/","owntimeUrl":"https://owntime.com.br/","nestUrl":"https://nestgramado.com.br/"}

GET https://lptijolo.vercel.app/client-submission.js
status=200
content-type=application/javascript; charset=utf-8

GET https://lptijolo.vercel.app
html_intro_0108=True
css_surface=True
css_transition=True
js_selected_hook=True
```

The optional `/api/health` route is not exposed by the Vercel rewrites and
returns `404 NOT_FOUND`; it is not used by the quiz client or the requested
journey.

### Expanded Production Chromium Verification

Command:

```text
BASE_URL=https://lptijolo.vercel.app playwright test task4-keyboard-smoke.spec.mjs --reporter=line
```

Result:

```text
Running 7 tests using 1 worker
7 passed (15.3s)
```

Responsive production journey:

```text
320x568   passed
390x844   passed
463x968   passed
768x1024  passed
1366x768  passed
```

Each viewport covered the intro, all eight questions, answer selection,
back-navigation, result, lead form, synthetic error response, synthetic
success response, no horizontal overflow, and no console/page/request errors.
The lead mock returned `503` on the first submission and `202` on the second;
no real lead request was sent.

Keyboard verification passed at `390x844` and covered:

- Intro start CTA and visible focus outline.
- Every visible answer radio across all eight questions. Each native radio group was reached by Tab, then remaining options were reached with ArrowDown, preserving actual keyboard semantics.
- Continue on every question and Back on question 2.
- Result contact button.
- Result destination link when visible.
- Result restart.
- Lead name, WhatsApp, e-mail, consent, submit, synthetic validation/error recovery, and retry.
- Success restart.
- No console, page, or failed-request errors.

Reduced-motion verification passed at `390x844`:

```text
computed transition=0s
computed animation=none
```

### Resume Concerns

- The production deployment is now complete at the preserved public alias and the corrected production smoke suite passes.
- `npm run verify` still reports the known Windows `EPERM` symlink limitation: 38 passed, 1 environment-blocked test. The remaining project tests pass directly.
- `/api/health` is not mapped in `vercel.json` and returns `404`; this is informational because it is not part of the quiz client flow.

Post-fix direct test outputs were:

```text
server.test.mjs excluding the symlink case: 13 passed, 0 failed
other project tests: 25 passed, 0 failed
```

## Task 4 Resume: Public Report Redaction

The real production webhook endpoint was removed from this tracked public
report and replaced with the neutral placeholder
`<configured production webhook URL>`. The functional Vercel environment
variable was not removed, changed, or re-deployed, and no token was exposed.

Redaction verification:

```text
tracked repository search for the real n8n endpoint: no matches
git diff --check: passed
```

The only remaining exposure concern is historical: earlier public commits may
still contain the endpoint in repository history. This fix intentionally does
not rewrite or force-push history.
