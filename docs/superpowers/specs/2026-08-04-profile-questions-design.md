# Profile Questions

## Goal

Add three neutral profile questions to the LP Tijolo quiz so the lead captures
who is responding, while the existing five affinity questions remain the only
inputs that determine Owntime or Nest.

## Question Flow

The quiz contains eight questions total. The five affinity questions and three
profile questions use a fixed editorially shuffled order. Each question's
options also use a fixed shuffled order, so the top and bottom positions do not
encode the enterprise.

The three profile questions are:

1. **Quando imagina uma pausa em Gramado, quem costuma estar com você?**
   - Comigo mesmo, no meu próprio ritmo.
   - Em casal, com tempo para nós dois.
   - Com filhos e família próxima.
   - Com diferentes gerações da família.
2. **O que você gostaria de cultivar nessa experiência?**
   - Tempo para desacelerar e me cuidar.
   - Conversas e descobertas a dois.
   - Memórias para construir em família.
   - Encontros para compartilhar com pessoas queridas.
3. **Como você costuma viver uma viagem?**
   - Prefiro liberdade para decidir cada dia.
   - Gosto de planejar momentos especiais a dois.
   - Organizo tudo pensando no conforto da família.
   - Valorizo um lugar que possa reunir pessoas importantes.

## Data Contract

The client stores responses by question id, not by visual position. The lead
payload keeps the five affinity answers in `answers` and adds a whitelisted
`profile` object with `companhia`, `momento`, and `viagem` keys. The server
validates both collections, recalculates the affinity from `answers`, and never
uses profile values for classification.

The result payload and webhook continue to expose the server-calculated result.
Profile values are forwarded only after validation and are never accepted as a
replacement for the affinity answers.

## UI

The progress indicator reports the current position out of eight as text. The
decorative progress track is omitted. Existing radio controls, back navigation,
fixed viewport behavior, focus management, and mobile fallback remain
unchanged.

## Verification

- Unit tests cover the exact five-question affinity set, three profile sets, and
  fixed question and option order.
- Server tests cover valid profile forwarding, missing profile values, unknown
  profile values, and result recalculation from affinity answers only.
- UI tests cover the textual progress indicator and the unchanged semantic form.
- Chromium checks all eight questions and the lead form at supported
  viewports.
