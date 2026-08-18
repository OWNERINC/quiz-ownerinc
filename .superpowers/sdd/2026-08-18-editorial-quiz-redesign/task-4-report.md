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
