# Editorial Quiz Redesign

## Goal

Refine the LP Tijolo quiz into a premium editorial experience with clearer
conversion cues, using the public Ownerinc identity as the neutral foundation
and restrained references to the Owntime and Nest visual worlds.

## Direction

- Use a solid ivory opening surface instead of a hero image.
- Use graphite for primary text and bronze for accents and active states.
- Keep the Ownerinc mark and Novelin typography as the main identity cues.
- Use official result imagery as a soft, readable background only on the result
  stage.
- Present choices as spacious editorial rows with thin separators, not cards.
- Use underlined text links for primary calls to action, with clear hover,
  focus, and pressed states.
- Use a short fade transition between questions, disabled when reduced motion is
  requested.

## Experience

The intro makes the neutral mediation explicit and keeps one clear action. The
quiz stage prioritizes the question, preserves the fixed eight-question order,
and makes the selected answer visible through border, surface, and text changes
without relying on color alone. The result stage keeps the editorial framing,
adds a low-contrast official image layer, and presents contact as the next
action rather than as an aggressive sales panel.

The current lead capture flow, stable response keys, server-side validation,
rate limiting, webhook envelope, and 202 acceptance contract remain unchanged.

## Responsive and Accessibility Requirements

- Mobile remains the source layout at 320px, 390px, and 463px widths.
- Desktop uses a two-column editorial composition at 768px and above.
- Text remains readable without horizontal overflow or clipped controls.
- Interactive controls keep a minimum 44px hit area.
- Focus indicators remain visible on the ivory and result surfaces.
- Every meaningful image keeps an accessible alternative or remains decorative.
- Reduced motion removes question fades and nonessential entrance animation.

## Verification

- UI contract tests assert the light editorial tokens, absence of the old dark
  surface assumptions, and the preserved semantic forms.
- Existing domain and server tests remain unchanged except where the visual
  contract requires a selector update.
- Chromium smoke checks cover intro, every question, result, and lead form at
  mobile and desktop viewports.
