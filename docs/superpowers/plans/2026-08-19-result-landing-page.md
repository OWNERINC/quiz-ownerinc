# Result Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the result stage into a compact three-block landing page with dynamic property value copy, official imagery, benefits, and inline lead capture.

**Architecture:** Keep the quiz state, stable question ids, `client-submission.js`, server validation, webhook envelope, and rate limits unchanged. Expand the existing result DOM and `RESULTS` data in place, then use localized CSS for a scrollable result page and a small scroll-to-form interaction.

**Tech Stack:** Static HTML, CSS, vanilla ES modules, Node.js test runner, Playwright smoke checks.

## Global Constraints

- Preserve the existing webhook payload, server-side classification, rate limiting, and 202 acceptance contract.
- Use only the existing official result images and official logos.
- Keep Ownerinc as the neutral brand mediator and use property-specific copy only for the calculated result.
- Do not add invented testimonials, downloads, urgency timers, scarcity, or unsupported numbers.
- Mobile-first at 320px, 390px, and 463px; desktop composition at 768px and 1366px.
- Keep visible labels, keyboard focus, reduced motion, and 44px touch targets.

---

### Task 1: Build the result landing structure

**Files:**
- Modify: `public/index.html:69-129`
- Test: `tests/ui-contract.test.mjs:36-120`

**Interfaces:**
- Consumes: existing result ids, lead form ids, `data-config` hook, and result asset paths.
- Produces: hero, concept, trust, benefits, and registration blocks while preserving all existing ids.

- [ ] **Step 1: Add the three result blocks**

Keep `#result`, `#result-title`, `#result-logo`, `#result-wordmark`, `#result-copy`,
`#result-link`, `#show-lead-form`, `#restart-result`, and `#lead-form`. Add
`#result-subtitle`, `#result-benefits`, `#result-trust`, and a `result__registration`
wrapper. Move the existing lead form inside the result section so the form is
part of the landing page, without changing its field ids or names.

- [ ] **Step 2: Update visible conversion copy**

Change the primary result CTA text to `Falar com atendente`. Change the lead
submit button text to `Enviar meus dados` only where it already exists; do not
change its async status labels. Keep the existing neutral disclaimer and
official-property link.

- [ ] **Step 3: Add contract assertions**

Assert the new subtitle, benefits list, trust marker, registration wrapper, CTA
text, and all existing semantic form fields. Assert that unsupported social proof
and urgency elements are absent.

- [ ] **Step 4: Run focused UI tests**

Run: `node --test tests/ui-contract.test.mjs`

Expected: all UI contract tests pass.

- [ ] **Step 5: Commit**

```sh
git add public/index.html tests/ui-contract.test.mjs
git commit -m "feat(quiz): structure result landing page"
```

### Task 2: Add dynamic offer content and form navigation

**Files:**
- Modify: `public/app.js:3-18,89-118,190-245`
- Test: `tests/ui-contract.test.mjs:48-88`

**Interfaces:**
- Consumes: `RESULTS`, `state.result`, existing lead form submit flow, and new result ids.
- Produces: safe per-result subtitle and benefits rendering plus CTA scroll behavior.

- [ ] **Step 1: Extend the result catalog**

Add `subtitle` and exactly three `benefits` strings to each `RESULTS` entry.
Use approved, non-financial language: Owntime emphasizes time, family,
nature, space, and hospitality; Nest emphasizes mountain refuge, sensory
comfort, wellness, organic architecture, and convenience.

- [ ] **Step 2: Render dynamic result content safely**

Add DOM references for `#result-subtitle` and `#result-benefits`. In
`showResult`, set the subtitle and replace the list contents with text nodes or
`li` elements created from the static catalog. Do not inject user input into
HTML.

- [ ] **Step 3: Scroll the hero CTA to registration**

When `#show-lead-form` is clicked, unhide the form, scroll it into view with
`behavior: "smooth"`, and focus `#lead-title`. Preserve the existing config
gate, submission payload, error handling, success state, and restart reset.

- [ ] **Step 4: Add dynamic lead heading**

Set the form heading or supporting text from the selected result using static
catalog content, while retaining a safe fallback and the existing consent copy.

- [ ] **Step 5: Run tests**

Run: `node --test tests/quiz.test.mjs tests/ui-contract.test.mjs tests/ownerinc-handler.test.mjs`

Expected: all selected tests pass.

- [ ] **Step 6: Commit**

```sh
git add public/app.js tests/ui-contract.test.mjs
git commit -m "feat(quiz): personalize result offer content"
```

### Task 3: Style the three-block result landing page

**Files:**
- Modify: `public/styles.css:91-100,414-730,760-930`
- Test: `tests/ui-contract.test.mjs:89-160`

**Interfaces:**
- Consumes: result block classes and dynamic content ids from Tasks 1-2, existing official hero variables, and existing form controls.
- Produces: mobile-first hero, concept, trust and registration layouts with desktop side-by-side form treatment.

- [ ] **Step 1: Make the result stage scrollable**

Override the fixed-height/hidden overflow rules for `.result` and its inner
blocks. Keep intro and quiz viewport behavior unchanged. Ensure the document
can scroll when result or registration is visible, with safe-area padding.

- [ ] **Step 2: Style the hero**

Use the existing official image as a cover background behind a veil. Give the
hero a readable title, subtitle, and high-contrast `Falar com atendente` CTA.
Keep image meaning decorative and preserve the official result logo fallback.

- [ ] **Step 3: Style concept and benefits**

Use a light raised surface, short line lengths, bronze dividers, and a list with
visible bullets. Make the trust block quieter than the value copy. Do not add
cards-inside-cards or decorative counters.

- [ ] **Step 4: Style registration**

Make the form a clear conversion panel. On mobile it follows the concept block;
on desktop it aligns beside the content where space permits. Keep field labels,
error messages, consent, and disabled/loading states accessible and at least
44px tall for interactive controls.

- [ ] **Step 5: Add responsive and reduced-motion rules**

Verify 320px, 390px, 463px, 768px, and 1366px. Keep the result under roughly
three viewport heights on common mobile screens without clipping fields. Use
opacity/transform only for transitions and preserve the existing reduced-motion
override.

- [ ] **Step 6: Update UI contract checks**

Assert scrollable result rules, hero cover behavior, benefits styling, form panel
layout, and no unsupported social-proof/urgency components.

- [ ] **Step 7: Run focused tests**

Run: `node --test tests/ui-contract.test.mjs`

Expected: all UI contract tests pass.

- [ ] **Step 8: Commit**

```sh
git add public/styles.css tests/ui-contract.test.mjs
git commit -m "style(quiz): turn result into landing page"
```

### Task 4: Verify, deploy, and publish

**Files:**
- Test: `tests/*.test.mjs`
- Verify: `https://lptijolo.vercel.app`

**Interfaces:**
- Consumes: completed result landing page and unchanged capture path.
- Produces: published, smoke-tested result landing page with no real lead sent.

- [ ] **Step 1: Run the full tests**

Run: `npm test`

Expected: all tests pass, except the known Windows temporary symlink `EPERM`
limitation if the environment still lacks symlink capability.

- [ ] **Step 2: Smoke-test the full result flow**

At `320x568`, `390x844`, `463x968`, `768x1024`, and `1366x768`, complete the
quiz and verify hero, subtitle, image, three benefits, trust block, CTA scroll,
all form fields, validation error, success state, back navigation, no overflow,
and no console errors. Use synthetic 503/202 responses; never send a real lead.

- [ ] **Step 3: Push and deploy**

Push the project-root branch to `quiz-ownerinc/main`, deploy the linked Vercel
project, and confirm the alias remains `https://lptijolo.vercel.app`.

- [ ] **Step 4: Smoke-test production**

Repeat the result landing checks against the live alias and confirm
`/api/config` and `/client-submission.js` remain available.
