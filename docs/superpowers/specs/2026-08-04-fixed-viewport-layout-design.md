# Fixed Viewport Layout

## Goal

Keep every LP Tijolo journey stage fully visible within the available viewport
without page scrolling during normal use across common phone, tablet, and
desktop sizes.

## Layout

The document uses the dynamic viewport height. Intro, quiz, result, lead form,
and success each occupy exactly one available viewport and hide page overflow
during normal use.

Content adapts through CSS only:

- spacing responds to both viewport width and height;
- type scales down within existing readable limits;
- quiz rows share the remaining vertical space while preserving touch targets;
- result copy and actions remain visible together;
- the lead form uses a compact responsive grid rather than adding another step;
- safe-area insets remain part of stage padding.

The DOM, journey state, content, and API behavior do not change.

## Accessibility Fallback

When the effective CSS viewport becomes extremely short because of browser
zoom, an open software keyboard, or a similarly constrained environment, the
document restores vertical scrolling. This fallback takes priority over the
fixed-screen presentation so fields, errors, consent, and actions cannot become
unreachable.

Focus visibility, minimum interactive heights, reduced-motion behavior, and
semantic forms remain unchanged.

## Verification

The fixed presentation is checked at these viewport sizes:

- 320 by 568 pixels;
- 390 by 844 pixels;
- 768 by 1024 pixels;
- 1366 by 768 pixels.

At each normal viewport, intro, every quiz question, result, form, and success
have no document-level vertical overflow. A short-height viewport verifies that
the accessibility fallback restores scrolling. Existing UI contract and server
tests continue to pass.

## Non-Goals

- No visual rebrand or copy change.
- No JavaScript viewport controller.
- No whole-page transform or browser zoom manipulation.
- No additional form step.
