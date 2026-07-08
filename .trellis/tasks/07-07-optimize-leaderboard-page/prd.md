# Optimize leaderboard page

## Goal

Improve the leaderboard page so rankings are easier to understand, current-player context is visible, and loading/error/empty states are polished.

## Requirements

- Reuse existing leaderboard data contracts and styling conventions where possible.
- Preserve score/rank correctness; UI improvements must not change scoring rules unless explicitly scoped later.
- Show clear states for loading, empty data, errors, and unauthenticated/no-player contexts if those states exist in the app.
- Make top ranks visually scannable and keep the current user's rank discoverable.
- Keep the page responsive across desktop and mobile layouts.
- Avoid adding new filters, backend fields, or pagination unless codebase evidence shows they already exist or the user approves them.

## Acceptance Criteria

- [ ] Leaderboard renders correctly with normal ranking data.
- [ ] Empty/loading/error states are intentionally designed, not broken blanks.
- [ ] Current user/player rank is visible or explicitly handled when unavailable.
- [ ] Mobile and desktop layouts remain usable without clipped critical content.
- [ ] Existing leaderboard data fetch/score rules remain compatible.
- [ ] Targeted UI or component verification covers at least normal and empty/loading states.

## Open Questions

- What visual direction should the leaderboard use: game-like podium, clean table, or card/rank hybrid? Recommended default: podium for top 3 plus compact list for the rest, because it improves scanning without changing data contracts.
