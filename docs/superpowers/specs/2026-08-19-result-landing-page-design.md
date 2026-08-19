# Result Landing Page

## Goal

Turn the quiz result into a compact, mobile-first landing page that presents
the recommended Ownerinc property, explains its value, and captures a lead in
the same journey without changing the existing webhook contract.

## Structure

The result is divided into three vertical blocks:

1. **Hero:** official property image behind a readable veil, emotional value
   title, concise subtitle, and `Falar com atendente` CTA.
2. **Concept:** objective explanation, three property-specific benefit bullets,
   institutional trust markers, and the official property link.
3. **Registration:** the existing name, WhatsApp, email, consent and status
   fields, with the existing server-side submission flow.

On desktop, the hero/concept content and form use an asymmetric two-column
composition where space allows. On mobile, the blocks stack vertically and the
CTA scrolls to the registration block. The page may use up to three viewport
heights but does not add unnecessary sections.

## Content and Trust

Owntime and Nest receive separate titles, subtitles, descriptions, and benefit
bullets using only approved brand direction. Trust content stays institutional:
Ownerinc / Gramado, shared ownership, official property link, and the existing
neutral product disclaimer. No invented testimonials, download counts,
urgency timers, scarcity claims, or unsupported performance numbers are added.

## Data and Accessibility

The result continues to be calculated server-side and the existing stable
response payload, webhook, rate limits, and 202 acceptance behavior are
unchanged. The form remains a semantic form with visible labels, inline error
states, focus transfer, and keyboard access. The hero image remains decorative
when the result wordmark and text carry the meaning.
