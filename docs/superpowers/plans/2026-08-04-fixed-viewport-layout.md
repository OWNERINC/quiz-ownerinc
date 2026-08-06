# Fixed Viewport Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every normal journey stage inside one dynamic viewport without document scrolling while preserving an accessible short-height fallback.

**Architecture:** CSS owns viewport sizing and responsive compression; no JavaScript controller or DOM change is introduced. A static UI contract protects the fixed viewport and fallback rules, while a one-off browser check verifies real layout dimensions before redeployment.

**Tech Stack:** HTML, CSS, native Node tests, headless Chromium, Vercel.

## Global Constraints

- No copy, journey, API, or visual identity change.
- Normal viewports have no document-level vertical overflow.
- Extremely short effective viewports restore vertical scrolling.
- Touch targets, focus visibility, safe areas, and reduced motion remain intact.
- No new dependency or JavaScript viewport controller.

---

### Task 1: Fit Every Stage To The Dynamic Viewport

**Files:**
- Modify: `public/styles.css`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: existing `.intro`, `.quiz`, `.result`, `.lead-form`, and `.success` stages.
- Produces: fixed `100dvh` stages with a short-height scrolling fallback.

- [ ] **Step 1: Add a failing CSS contract**

Assert that the stylesheet contains document overflow control, exact dynamic
viewport sizing for all five stages, and a short-height rule that restores
vertical overflow.

- [ ] **Step 2: Run the UI contract and confirm failure**

Run: `node --test tests/ui-contract.test.mjs`

Expected: failure because the current stages use only `min-height: 100svh` and
the document remains scrollable.

- [ ] **Step 3: Implement the fixed viewport base**

Set `html`, `body`, and `main` to the available viewport boundary, hide document
overflow during normal use, and give all five stages `height: 100dvh` with
`min-height: 0` and internal overflow hidden.

- [ ] **Step 4: Compress layout responsively**

Use height-aware `clamp()` values for stage padding, intro spacing, quiz header,
progress, legend, answers, actions, result content, form gaps, inputs, consent,
and success. Preserve minimum 48-pixel interactive controls.

- [ ] **Step 5: Add the accessibility fallback**

At an effective height below the supported normal range, restore document
overflow and switch stage height back to `auto` with `min-height: 100dvh`.

- [ ] **Step 6: Run project verification**

Run: `npm run verify`

Expected: all 26 project tests pass.

- [ ] **Step 7: Check real browser overflow**

Use headless Chromium against the local server at 320x568, 390x844, 768x1024,
and 1366x768. For intro, quiz, result, form, and success, verify
`document.documentElement.scrollHeight === document.documentElement.clientHeight`.
At a shorter viewport, verify the page can scroll when content exceeds it.

- [ ] **Step 8: Redeploy and smoke-test**

Deploy to the existing production alias with the established public environment
variables, then verify `https://lptijolo.vercel.app` and `/api/config` return
HTTP 200.
