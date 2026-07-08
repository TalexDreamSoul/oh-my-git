# Optimize medal page

## Goal

Improve the medal page so earned, locked, and in-progress medals are clear and visually consistent with the rest of the product.

## Requirements

- Reuse existing medal/achievement data where possible.
- Clearly distinguish earned, locked, and in-progress medals.
- Show medal criteria/progress when available; hide or phrase unknown criteria intentionally if spoilers matter.
- Handle empty, loading, and error states if the page depends on async data.
- Keep layout responsive and accessible: readable labels, meaningful icons, and keyboard/screen-reader-friendly structure where applicable.
- Do not invent new medal rules in this task unless they are required by the existing achievement system contract.

## Acceptance Criteria

- [ ] Earned medals are visually distinct from locked medals.
- [ ] Progress/criteria are displayed consistently for medals that expose them.
- [ ] Page has intentional empty/loading/error states where applicable.
- [ ] Medal grid/list is usable on mobile and desktop.
- [ ] Existing medal data remains compatible.
- [ ] Targeted UI or component verification covers earned and locked examples.

## Open Questions

- Should locked medals reveal exact unlock criteria or stay partially hidden? Recommended default: reveal non-spoiler criteria and hide only story/puzzle-sensitive details.
