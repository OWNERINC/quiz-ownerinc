# Minimal Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify LP Tijolo's typography and visual language into a restrained Ownerinc editorial quiz without changing its content or behavior.

**Architecture:** Keep the existing HTML and JavaScript journey. Replace the current decorative CSS treatment with a smaller token-led system, remove Signaturia and its asset, then protect the visual contract with static tests and browser checks at the existing fixed-viewports.

**Tech Stack:** HTML, CSS, native Node test runner, headless Chromium, Vercel.

## Global Constraints

- Novelin Regular and Bold become the only interface fonts.
- Bronze is reserved for progress, selection, focus, and the principal action.
- No copy, question, result, form field, API route, webhook rule, or deployment behavior changes.
- The fixed dynamic-viewport layout and short-height scrolling fallback remain intact.
- Touch targets remain at least 48 pixels; focus, safe areas, and reduced motion remain intact.
- No new dependencies, JavaScript layout controller, substitute brand font, or new color code.

---

### Task 1: Lock The Minimal Visual Contract

**Files:**
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: `public/styles.css` and existing semantic UI selectors.
- Produces: static assertions that prevent Signaturia, decorative circles, circular button marks, and parallax from returning.

- [ ] **Step 1: Add assertions for the approved direction**

Assert that the stylesheet has exactly two `@font-face` blocks, contains Novelin
400 and 700, and does not contain `Signaturia`, `.intro::after`,
`.button__mark`, or result parallax transforms.

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/ui-contract.test.mjs`

Expected: the new assertions fail against the current visual system.

### Task 2: Apply The Minimal Editorial CSS

**Files:**
- Modify: `public/styles.css`
- Delete: `public/assets/fonts/signaturia-regular.ttf`

**Interfaces:**
- Consumes: existing DOM class names and the approved Ownerinc palette tokens.
- Produces: restrained flat editorial styling with unchanged layout and interactions.

- [ ] **Step 1: Remove the Signaturia face and decorative intro circle**

Delete the `@font-face` block and `.intro::after`; leave the official Ownerinc
logo and existing layout intact.

- [ ] **Step 2: Simplify typography and tokens**

Use Novelin for all elements, reduce display scale and tracking, keep body copy
at readable sizes, and use semantic tokens for surface, text, accent, line,
focus, and error colors.

- [ ] **Step 3: Simplify controls**

Remove the circular `.button__mark` treatment and generated radio glyphs. Keep
native radios, direct labels, 48-pixel button/link hit areas, visible selected
states, and visible focus rings.

- [ ] **Step 4: Flatten the composition**

Remove the intro split field, excessive inset shadows, ornamental result veil
effects, and result parallax transform. Keep the result image with one solid
readability veil.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/ui-contract.test.mjs`

Expected: all visual contract tests pass.

### Task 3: Verify And Redeploy

**Files:**
- Inspect: `public/index.html`, `public/app.js`, `public/styles.css`

**Interfaces:**
- Consumes: the unchanged journey and API implementation.
- Produces: a verified local and Vercel deployment.

- [ ] **Step 1: Run all project tests**

Run: `npm run verify`

Expected: all project tests pass.

- [ ] **Step 2: Run Chromium viewport checks**

At `320x568`, `390x844`, `768x1024`, and `1366x768`, inspect intro, all five
quiz screens, result, form, and success. Confirm no flow content exceeds its
stage and no document-level scroll occurs. At `320x500`, confirm the short
height fallback restores scrolling.

- [ ] **Step 3: Check assets and font usage**

Confirm no source or stylesheet references `signaturia-regular.ttf` or
`Signaturia`.

- [ ] **Step 4: Redeploy the existing Vercel alias**

Deploy `lptijolo.vercel.app` with the existing public environment variables and
without webhook secrets.

- [ ] **Step 5: Smoke-test the deployment**

Confirm the page and `/api/config` return HTTP 200 and the deployed stylesheet
contains the minimal font and fixed viewport rules.
