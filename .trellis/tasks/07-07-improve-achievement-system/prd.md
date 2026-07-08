# Improve achievement system

## Goal

Tighten the achievement system so achievements are granted reliably, persisted correctly, and surfaced to players with clear feedback.

## Requirements

- Inventory the current achievement rules, storage, and UI/event consumers before changing behavior.
- Ensure achievement grants are idempotent: repeated triggers must not duplicate the same achievement.
- Preserve existing achievements and user progress through migrations or compatibility handling.
- Define when achievements are evaluated: gameplay event, page load, server sync, or explicit recompute.
- Provide clear user feedback for newly unlocked achievements without noisy repeats.
- Keep achievement logic centralized enough to avoid per-page duplicated rule checks.

## Acceptance Criteria

- [ ] Existing achievement definitions are documented before changes.
- [ ] Granting the same achievement twice does not create duplicates or repeated unlock spam.
- [ ] Existing saved progress remains readable after the change.
- [ ] New/changed achievement rules have targeted tests or deterministic smoke checks.
- [ ] Medal page and any achievement surfaces consume the same source of truth.
- [ ] Failure cases are handled without corrupting achievement state.

## Open Questions

- Should achievements be retroactively awarded from existing progress after rules change? Recommended default: yes for deterministic progress already stored; no for events that were never persisted.
