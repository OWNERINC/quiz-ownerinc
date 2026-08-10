# Profile Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three shuffled profile questions to LP Tijolo while keeping the five affinity questions as the sole Owntime/Nest classifier.

**Architecture:** Keep affinity and profile question catalogs separate. The client shuffles a combined set for presentation, stores responses by stable question id, sends affinity answers and a profile object separately, and the server validates both at the trust boundary.

**Tech Stack:** HTML, browser JavaScript, native Node test runner, Vercel serverless adapter.

## Global Constraints

- The five affinity questions remain the only inputs that determine Owntime or Nest.
- The eight-question order changes per new quiz or restart and stays stable during that attempt.
- Profile values are whitelisted server-side and never accepted as a result override.
- Existing lead validation, webhook routing, fixed viewport, focus, and mobile fallback remain intact.
- No dependencies or new client-side storage are added.

---

### Task 1: Add Question Catalogs And Shuffle Contract

**Files:**
- Modify: `public/quiz.js`
- Modify: `tests/quiz.test.mjs`

**Interfaces:**
- Consumes: existing five affinity questions and `classifyAnswers`.
- Produces: `AFFINITY_QUESTIONS`, `PROFILE_QUESTIONS`, combined `QUESTIONS`, and `shuffleQuestions(questions, random)`.

- [ ] **Step 1: Add the three profile question fixtures and shuffle tests**

Test exact profile ids `companhia`, `momento`, `viagem`, each with four allowed
options. Test that a deterministic shuffle preserves all eight ids exactly once.

- [ ] **Step 2: Separate the existing affinity catalog**

Export the current five-question array as `AFFINITY_QUESTIONS`; do not alter
its prompts, labels, values, or order.

- [ ] **Step 3: Add profile questions and combined catalog**

Export `PROFILE_QUESTIONS` with the approved copy and stable option values, then
export `QUESTIONS = [...AFFINITY_QUESTIONS, ...PROFILE_QUESTIONS]`.

- [ ] **Step 4: Implement Fisher-Yates shuffle**

Return a new array and accept an optional random function defaulting to
`Math.random`, so tests can supply a deterministic sequence.

- [ ] **Step 5: Keep classification scoped to affinity answers**

Make `classifyAnswers` validate exactly five `owntime`/`nest` values, independent
of the eight-question presentation catalog.

- [ ] **Step 6: Run quiz tests**

Run: `node --test tests/quiz.test.mjs`

Expected: existing classification cases and new profile/shuffle cases pass.

### Task 2: Present Eight Questions And Send Profile Data

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: `QUESTIONS`, `AFFINITY_QUESTIONS`, `PROFILE_QUESTIONS`, `shuffleQuestions`, and stable question ids.
- Produces: eight-question UI and lead payload `{ answers, profile, result }`.

- [ ] **Step 1: Keep progress as text only**

Keep the accessible `Pergunta X de 8` text and remove the decorative progress
track from the markup, client updates, and styles.

- [ ] **Step 2: Store responses by question id**

Initialize `state.questions = shuffleQuestions(QUESTIONS)` and
`state.responses = {}`. Render and restore radio state from the current
question's id, not its shuffled index.

- [ ] **Step 3: Rebuild the shuffle on restart**

Reset `state.questions` and `state.responses` in `restartQuiz`; do not let an
old response remain attached to a new question order.

- [ ] **Step 4: Classify only affinity responses**

Build the five-value array from `AFFINITY_QUESTIONS` ids before calling
`classifyAnswers`. Build `profile` from `PROFILE_QUESTIONS` ids and send it as a
separate payload property.

- [ ] **Step 5: Run UI and browser tests**

Run: `node --test tests/ui-contract.test.mjs`

Expected: semantic forms and eight-step progress pass.

### Task 3: Validate Profile Data At The Server Boundary

**Files:**
- Modify: `server.mjs`
- Modify: `tests/server.test.mjs`
- Modify: `docs/product/brief.md`

**Interfaces:**
- Consumes: lead request `{ answers: string[], profile: object }`.
- Produces: normalized lead value with validated `answers`, `profile`, and recalculated result.

- [ ] **Step 1: Add server tests for valid and invalid profile payloads**

Cover a valid profile, missing profile, unknown profile key/value, and a forged
`result` that must not affect the calculated result. Assert the normalized
profile is forwarded to the webhook.

- [ ] **Step 2: Add whitelisted profile validation**

Require exactly `companhia`, `momento`, and `viagem` with only the catalogued
values. Return the existing controlled invalid-request response for bad input.

- [ ] **Step 3: Keep webhook selection result-only**

Continue selecting Nest or Owntime credentials from the recalculated affinity
result; profile fields must not participate in that branch.

- [ ] **Step 4: Update product scope documentation**

Document eight questions total: five affinity questions and three profile
questions that qualify the lead without changing the affinity result.

- [ ] **Step 5: Run server tests**

Run: `node --test tests/server.test.mjs`

Expected: all routing, validation, and profile tests pass.

### Task 4: Verify And Redeploy

**Files:**
- Inspect: `public/quiz.js`, `public/app.js`, `server.mjs`, `public/index.html`

**Interfaces:**
- Consumes: the completed eight-question flow and validated payload.
- Produces: verified local and Vercel behavior.

- [ ] **Step 1: Run the complete project suite**

Run: `npm run verify`

Expected: all tests pass.

- [ ] **Step 2: Exercise all eight questions in Chromium**

At supported viewports, answer each shuffled question, confirm progress reaches
`8 de 8`, and inspect the result and form. Verify the outgoing request contains
five affinity answers plus the three profile values.

- [ ] **Step 3: Verify profile shuffle behavior**

Start the quiz twice and confirm both attempts contain all eight questions while
the second attempt may use a different order.

- [ ] **Step 4: Redeploy the existing Vercel alias**

Deploy `lptijolo.vercel.app` with current public environment variables and no
webhook secrets.

- [ ] **Step 5: Smoke-test the public page**

Confirm the page and `/api/config` return HTTP 200 and the lead endpoint still
returns the controlled unavailable response without configured webhooks.
