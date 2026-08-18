# Editorial Quiz Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine LP Tijolo into a premium editorial quiz with an ivory Ownerinc-led visual system, subtle conversion cues, and a soft image-led result stage.

**Architecture:** Keep the existing semantic HTML stages, vanilla client state, stable question ids, and server-side capture contract. The redesign is localized to `public/index.html`, `public/styles.css`, and small transition behavior in `public/app.js`; official result assets already present in `public/assets/results` are reused without adding dependencies.

**Tech Stack:** Static HTML, CSS, vanilla ES modules, Node.js test runner, Playwright smoke checks.

## Global Constraints

- Preserve the fixed eight-question order and fixed shuffled option order.
- Preserve `client-submission.js`, the versioned webhook envelope, rate limiting, and 202 upstream acceptance behavior.
- Use Novelin and existing official Ownerinc/result assets; do not invent or alter logos.
- Keep the opening neutral between Owntime and Nest.
- Keep all interactive targets at least 44px and retain visible keyboard focus.
- Respect `prefers-reduced-motion`.
- Do not add a dependency or a component framework.

---

### Task 1: Lock the semantic stage markup

**Files:**
- Modify: `public/index.html:15-128`
- Test: `tests/ui-contract.test.mjs:13-64`

**Interfaces:**
- Consumes: existing `#intro`, `#quiz`, `#result`, `#lead-form`, and `#success` ids used by `public/app.js`.
- Produces: the same DOM API with design-specific classes and a neutral eight-question intro label.

- [ ] **Step 1: Update the intro metadata and CTA semantics**

Change the stale decorative edition text from `01 / 05` to `01 / 08`, add a
short neutral eyebrow above the intro heading, and keep the existing `#start`
button id. Give the start action the text-link CTA class while retaining a
native button for keyboard and form semantics.

- [ ] **Step 2: Add stable visual hooks without changing API ids**

Add classes for the intro copy, quiz meta, answer list, result copy, and result
actions only where the stylesheet needs a clear boundary. Do not rename any id
read by `app.js` or any `data-config` hook used to load public configuration.

- [ ] **Step 3: Update UI contract assertions**

Assert that the markup contains `01 / 08`, the neutral editorial eyebrow, the
existing semantic forms, the four reusable answer rows, and no stale `01 / 05`
text. Keep assertions for privacy, consent, result framing, and official assets.

- [ ] **Step 4: Run the focused UI tests**

Run: `node --test tests/ui-contract.test.mjs`

Expected: all UI contract tests pass.

- [ ] **Step 5: Commit the markup contract**

```sh
git add public/index.html tests/ui-contract.test.mjs
git commit -m "style(quiz): refine editorial stage markup"
```

### Task 2: Implement the ivory editorial visual system

**Files:**
- Modify: `public/styles.css:15-950`
- Modify: `public/app.js:70-86`
- Test: `tests/ui-contract.test.mjs:89-139`

**Interfaces:**
- Consumes: markup classes from Task 1, existing result CSS custom properties,
  and official result images.
- Produces: mobile-first ivory/grafite/bronze stages, editorial answer rows,
  readable result imagery, and responsive desktop composition.

- [ ] **Step 1: Replace the dark surface tokens**

Define semantic tokens for the approved visual direction:

```css
:root {
  --surface: #f4efe7;
  --surface-raised: #fbf8f3;
  --ink: #292622;
  --muted: #716a61;
  --bronze: #9b7a52;
  --line: rgb(41 38 34 / 18%);
  --focus: #6d4e2c;
  color-scheme: light;
}
```

Update body, skip link, focus, and shared text rules to use semantic tokens.
The exact values are implementation tokens, not claims of official MIV color
codes.

- [ ] **Step 2: Restyle intro and quiz layout**

Give the intro and quiz a solid ivory surface, use graphite body text, reserve
bronze for eyebrows, dividers, active states, and text-link emphasis, and keep
the Ownerinc logo readable with the available official asset. Make the question
stage a single-column mobile layout and a two-column editorial layout from
`48rem` upward.

- [ ] **Step 3: Replace answer cards with editorial rows**

Style `.answer-choice` as a full-width row with a thin divider, minimum 64px
height on mobile, and a 44px radio hit area. Update `renderQuestion` to toggle
an `.is-selected` class from the checked value, so selection is visible through
border, surface, weight, and text changes rather than color alone.

- [ ] **Step 4: Tune CTAs, form surfaces, and result background**

Make primary actions underlined text links with generous hit areas. Keep the
lead form readable as a raised ivory panel. Use the existing official result
hero custom properties with a restrained veil, `background-size: cover`, and a
content max-width that preserves 60-75 character desktop measure.

- [ ] **Step 5: Add responsive and reduced-motion rules**

Verify `320px`, `390px`, `463px`, `768px`, and `1366px` layouts. Keep safe-area
padding, avoid horizontal overflow, and wrap nonessential labels. Add a
`prefers-reduced-motion: reduce` rule that disables entrance and question
transitions.

- [ ] **Step 6: Update visual contract tests**

Assert the light semantic tokens, absence of the old dark-only assumptions,
editorial answer-row selectors, visible focus rules, result cover behavior, and
reduced-motion rule.

- [ ] **Step 7: Run focused tests**

Run: `node --test tests/ui-contract.test.mjs tests/quiz.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 8: Commit the visual system**

```sh
git add public/styles.css tests/ui-contract.test.mjs
git commit -m "style(quiz): apply ivory editorial visual system"
```

### Task 3: Add the short question transition

**Files:**
- Modify: `public/app.js:56-87,121-142`
- Modify: `public/styles.css:650-710`
- Test: `tests/ui-contract.test.mjs:48-87`

**Interfaces:**
- Consumes: existing `renderQuestion({ focus })` and stable question state.
- Produces: a 200ms interruptible fade on question replacement without changing
  submission payloads or focus behavior.

- [ ] **Step 1: Add a transition state hook**

Add a single `is-changing` class to the quiz question content before rendering
new text, then remove it on the next animation frame after the new content is
painted. Keep focus on `#question-prompt` after the update and do not delay the
submit action.

- [ ] **Step 2: Define the motion rule**

Use opacity and a small `translateY` only, with a 200ms ease-out transition. Do
not animate width, height, or layout-affecting properties.

- [ ] **Step 3: Add reduced-motion coverage**

Assert the stylesheet includes a reduced-motion override that removes the
transition and entrance animation.

- [ ] **Step 4: Run the focused tests**

Run: `node --test tests/ui-contract.test.mjs`

Expected: all UI contract tests pass.

- [ ] **Step 5: Commit the transition**

```sh
git add public/app.js public/styles.css tests/ui-contract.test.mjs
git commit -m "style(quiz): add restrained question transition"
```

### Task 4: Verify the complete journey and publish

**Files:**
- Test: `tests/*.test.mjs`
- Verify: deployed `https://lptijolo.vercel.app`

**Interfaces:**
- Consumes: all completed markup, CSS, and transition changes.
- Produces: a tested eight-question journey with preserved capture behavior.

- [ ] **Step 1: Run the full project checks**

Run: `npm run verify`

Expected: all tests pass. If the Windows symlink test is blocked by `EPERM`,
record it as an environment limitation and run the remaining tests directly.

- [ ] **Step 2: Smoke-test the journey in Chromium**

At `320x568`, `390x844`, `463x968`, and `1366x768`, verify the intro, all eight
questions, back navigation, result, lead form, validation error, and success
state. Confirm no horizontal overflow and no console errors.

- [ ] **Step 3: Verify accessibility states**

Keyboard through every answer and CTA, confirm visible focus, verify selected
answers are distinguishable without color alone, and run once with reduced
motion enabled.

- [ ] **Step 4: Push the project root to the Ownerinc repository**

From the project-root publication worktree, push the merged branch to `main`:

```sh
git push quiz-ownerinc HEAD:main
```

- [ ] **Step 5: Deploy only after the pushed build is verified**

Run the Vercel production deployment from the project root, then re-run the
Chromium smoke check against `https://lptijolo.vercel.app`.
