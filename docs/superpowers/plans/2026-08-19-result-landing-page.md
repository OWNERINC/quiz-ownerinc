# Result Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the result journey as exactly three mobile-first, document-scrolling screens with official property galleries and the existing lead capture contract.

**Architecture:** Keep quiz classification, result data safety, lead form identifiers, client submission module, server handler, rate limiter, and 202 behavior unchanged. Replace the nested result scroller with three normal-flow result screens. Render static gallery URLs through DOM nodes and permit only the two official hosts in both CSPs.

**Tech Stack:** Static HTML, vanilla ES modules, CSS, Node.js test runner, optional Playwright smoke checks, existing Vercel project.

## Global Constraints

- Exactly three result screens: hero + benefits, product + gallery + trust, CTA + visible lead form.
- Each result screen uses `min-height: 100dvh`; `#result` has `height: auto` and `overflow: visible`.
- Keep approved subtitle, concept, and benefit copy as the editorial base; each result has exactly three benefits.
- Use the existing local official logos and hero images.
- Use only the six supplied official gallery URLs, selected from static result data.
- Never use user HTML for gallery rendering; use DOM nodes and `textContent`.
- Preserve stable classification, field ids/names, webhook, rate limiter, submission module, and HTTP 202 behavior.
- CSP `img-src` allows only `'self' data: https://owntime.com.br https://nestgramado.com.br`.
- No new dependency, fake testimonial, urgency, scarcity, counter, financial claim, or real lead.

---

### Task 1: Update static result structure and contract assertions

**Files:**
- Modify: `public/index.html`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: existing result ids and form markup.
- Produces: three result screens with the existing lead form visible in screen 3.

- [ ] **Step 1: Make the result markup exactly three screens**

Keep `#result`, `#result-title`, `#result-logo`, `#result-wordmark`, `#result-subtitle`, `#result-copy`, `#result-benefits`, `#result-trust`, `#show-lead-form`, `#result-link`, `#restart-result`, and every lead form id/name. Put the result title, subtitle, benefits, and hero CTA only in `.result-screen--hero`; put concept, gallery mount, trust copy, product link, and restart only in `.result-screen--product`; put the existing `#lead-form` visibly inside `.result-screen--lead` with no `hidden` attribute. Keep `#success` outside the result screens.

- [ ] **Step 2: Add the gallery mount**

Add `<div id="result-gallery" class="result__gallery" aria-label="Fotos oficiais do empreendimento"></div>` in the product screen. Do not add image HTML containing URLs; JavaScript will create the static image nodes.

- [ ] **Step 3: Add assertions before implementation changes**

Assert that `#result` contains exactly three `.result-screen` elements, the lead form is in the third screen and not hidden, the gallery mount exists, the CTA text is present, and the existing form fields, consent, status, and success markup remain.

- [ ] **Step 4: Run the focused contract test**

Run: `node --test tests/ui-contract.test.mjs`

Expected: the new assertions fail only for the not-yet-implemented structure.

### Task 2: Add static gallery data and safe rendering

**Files:**
- Modify: `public/app.js`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: `RESULTS[state.result]` and existing result rendering.
- Produces: result-specific description and three DOM-created gallery images.

- [ ] **Step 1: Extend each result entry**

Add a concise `concept` string and exactly three `gallery` URL strings using the URLs from the request. Keep the current approved `subtitle`, `copy`, and `benefits` text unchanged.

- [ ] **Step 2: Render the gallery without HTML injection**

Query `#result-gallery`. In `showResult`, clear it with `replaceChildren()`, then for each static URL create an `<figure>`, `<img>`, and `<figcaption>` with `src`, `alt`, and caption set as properties or `textContent`; append the nodes. Set `resultCopy.textContent = content.concept` or retain the existing approved copy as the product description. Do not use `innerHTML` for gallery content.

- [ ] **Step 3: Make the hero CTA scroll the normal document**

Replace `scrollResultTo` and all `result.scrollTop`/`result.scrollTo` use with `leadScreen.scrollIntoView({ block: "start", behavior: getScrollBehavior() })`. Keep focus transfer to `leadTitle`, the reduced-motion behavior, and form visibility. The form must already be visible in the third screen; the CTA may only scroll and focus.

- [ ] **Step 4: Add data and safety assertions**

Assert two `gallery` arrays with three HTTPS URLs, all six exact official URLs, static DOM creation via `createElement`, `textContent`, and absence of `innerHTML`/`insertAdjacentHTML`. Assert no nested result scroll APIs remain.

- [ ] **Step 5: Run focused client tests**

Run: `node --test tests/quiz.test.mjs tests/ui-contract.test.mjs tests/ownerinc-handler.test.mjs`

Expected: all pass after the markup and client changes are complete.

### Task 3: Style the three screens and CSP

**Files:**
- Modify: `public/styles.css`
- Modify: `server.mjs`
- Modify: `vercel.json`
- Modify: `tests/ui-contract.test.mjs`
- Modify: `tests/server.test.mjs` or the existing CSP contract test file

**Interfaces:**
- Consumes: `.result-screen--hero`, `.result-screen--product`, `.result-screen--lead`, gallery nodes, and existing form controls.
- Produces: mobile-first normal document layout and desktop composition at `min-width: 48rem`.

- [ ] **Step 1: Remove the nested result scroller**

Override result layout to `height: auto`, `min-height: 0`, `overflow: visible`, and use normal document flow. Set each `.result-screen` to `min-height: 100dvh`; keep horizontal clipping only where needed without establishing a vertical scroll container.

- [ ] **Step 2: Style mobile screens**

Use the official hero background only in screen 1, preserve logo fallback, show exactly three benefits, make the product screen contain concise copy plus a three-image grid, and make screen 3 show the existing form without requiring a reveal state. Use safe-area padding and preserve 44px controls.

- [ ] **Step 3: Add desktop composition**

At `min-width: 48rem`, use an asymmetric grid for hero content and product gallery, with the form as a readable third screen rather than a nested panel. Avoid extra result screens or decorative counters.

- [ ] **Step 4: Add strict CSP hosts**

Change both CSP values so `img-src` is exactly `'self' data: https://owntime.com.br https://nestgramado.com.br` in addition to the existing directives. Do not permit wildcard hosts.

- [ ] **Step 5: Update style and CSP assertions**

Assert result document overflow, three `100dvh` screens, gallery layout, reduced-motion rules, both CSP hosts, and absence of old nested scroller declarations.

- [ ] **Step 6: Run focused tests**

Run: `node --test tests/ui-contract.test.mjs tests/server.test.mjs tests/vercel-leads.test.mjs`

Expected: all pass.

### Task 4: Full verification, smoke, commit, push, and deploy

**Files:**
- Verify: all modified files and the linked Vercel project

**Interfaces:**
- Consumes: completed three-screen result page and unchanged capture path.
- Produces: committed and pushed release, deployed URL, and smoke evidence without a real lead.

- [ ] **Step 1: Run project checks**

Run: `npm run verify` and the focused test commands. Do not post to `/api/leads` with a real contact; synthetic intercepted responses may return 503 and 202 only.

- [ ] **Step 2: Run Playwright smoke**

At `390x844` and `1366x768`, run both deterministic result paths, assert exactly three result screens, gallery images, CTA/form visibility, synthetic lead responses, no horizontal/vertical overflow beyond the normal document, no console errors, and reduced-motion behavior. Inspect both Owntime and Nest.

- [ ] **Step 3: Inspect diff and commit**

Run `git diff --check`, `git status --short`, then commit only intended files with `git commit -m "feat(quiz): redesign result into three screens"`.

- [ ] **Step 4: Push and deploy**

Push the current branch to `quiz-ownerinc/main` without rewriting history. Deploy the linked Vercel project using its existing project configuration and record the resulting deployment and production URLs.

- [ ] **Step 5: Smoke production**

Repeat the read-only result/gallery/form checks against the deployed URL. Never submit a real lead. Report commit, test commands/results, deployment URLs, and any remaining concern.
