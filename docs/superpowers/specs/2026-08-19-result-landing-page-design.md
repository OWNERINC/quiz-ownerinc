# Result Landing Page

## Goal

Turn the quiz result into a compact, mobile-first landing page that presents
the recommended Ownerinc property, explains its value, and captures a lead in
the same journey without changing the existing webhook contract.

## Structure

The result is divided into exactly three normal document-flow screens, each with
approximately one viewport height:

1. **Hero + benefits:** official property image behind a readable veil, official
   property logo/title, concise subtitle, exactly three property-specific
   benefits, a `01 / 03` marker, and the `Falar com atendente` CTA.
2. **Product + photos:** the approved concise concept description, three official
   static photographs for the selected property, institutional trust copy,
   official property link, and a `02 / 03` marker.
3. **CTA + registration:** the existing name, WhatsApp, email, consent, status,
   and submit fields visibly rendered in the third screen, plus a `03 / 03`
   marker. The hero CTA scrolls the normal document to this screen.

On desktop, the hero and product screen use asymmetric compositions where space
allows, while the registration remains the third full-width screen. On mobile,
the screens stack vertically. `#result` uses normal document flow with
`height: auto` and `overflow: visible`; it must not become a nested scroll
container.

## Content and Trust

Owntime and Nest receive separate titles, subtitles, descriptions, and benefit
bullets using only approved brand direction. Trust content stays institutional:
Ownerinc / Gramado, shared ownership, official property link, and the existing
neutral product disclaimer. Gallery sources are limited to the approved public
Owntime and Nest domains and are created as DOM nodes from static result data.
No invented testimonials, download counts, urgency timers, scarcity claims, or
unsupported performance numbers are added.

## Data and Accessibility

The result continues to be calculated server-side and the existing stable
response payload, webhook, rate limits, and 202 acceptance behavior are
unchanged. The form remains a semantic form with visible labels, inline error
states, focus transfer, and keyboard access. The hero image remains decorative
when the result wordmark and text carry the meaning.
