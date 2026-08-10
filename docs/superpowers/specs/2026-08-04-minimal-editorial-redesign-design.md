# Minimal Editorial Redesign

## Goal

Refine LP Tijolo into a quieter Ownerinc editorial experience by removing
decorative excess and simplifying typography without changing content, journey,
classification, lead handling, or fixed-viewport behavior.

## Typography

Novelin Regular and Bold become the only interface fonts. Signaturia is removed
from the stylesheet and assets. The emphasized word in the opening headline
keeps semantic emphasis but inherits Novelin rather than becoming a script
wordmark.

Type scales become more restrained. Headings retain clear editorial hierarchy
without dominating the viewport, body copy remains readable, and uppercase
tracking is limited to short functional labels.

## Visual System

The existing charcoal, off-white, and bronze family remains. Bronze is reserved
for progress, selection, focus, and the principal action rather than decoration.

The redesign removes:

- concentric background circles;
- split decorative background fields;
- circular button-mark borders;
- duplicated radio indicators;
- large inset shadows and ornamental overlays;
- excessive letter spacing and oversized display type.

Surfaces stay flat. Hairline separators, native radio controls, direct labels,
and simple text-plus-arrow actions provide structure. The result keeps its image
and uses one restrained solid veil without scroll parallax.

## Layout And Behavior

The current fixed dynamic-viewport layout, short-height scrolling fallback,
safe-area padding, 48-pixel controls, visible focus, reduced-motion handling,
and semantic forms remain intact.

No copy, question, result, form field, API route, webhook rule, or deployment
behavior changes.

## Verification

- Static tests confirm Novelin is the only declared font and decorative patterns
  are absent.
- Existing product, server, and fixed-viewport contracts continue to pass.
- Chromium checks intro, all questions, result, form, and success at 320x568,
  390x844, 768x1024, and 1366x768 without clipped flow content.
- The short-height accessibility fallback continues to scroll.
- The deployed page and `/api/config` return HTTP 200.

## Non-Goals

- No new font dependency or substitute brand font.
- No Owntime- or Nest-specific typography inside the neutral quiz shell.
- No visual rebrand, new logo, or new color code.
- No new component abstraction or JavaScript layout controller.
