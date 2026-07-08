# Add AI feature

## Goal

Add an AI feature with a clear player-facing purpose, bounded product scope, and safe integration points.

## Requirements

- Choose one concrete AI use case before implementation.
- Keep the first AI feature narrow enough to verify end to end.
- Define where AI appears in the UX, when it can be invoked, and what inputs it may use.
- Avoid sending secrets, credentials, private user data, or full local project contents to an external model unless explicitly approved and required.
- Provide graceful fallback when AI is unavailable, slow, or returns unusable output.
- Gate cost/rate-limit behavior if the implementation uses an external API.
- Do not entangle AI work with leaderboard, medal, achievement, or level 9 fixes unless the selected use case requires it.

## Candidate Directions

1. Level hint assistant: gives progressive hints without directly spoiling the answer.
2. Achievement coach: suggests next achievements based on visible progress.
3. AI-generated challenge flavor text: improves content tone without affecting gameplay rules.
4. Leaderboard commentary: summarizes ranks or progress trends.

Recommended direction: level hint assistant, because it has direct gameplay value and can be bounded with progressive hints, cooldowns, and no score mutation.

## Acceptance Criteria

- [ ] One AI use case is selected and documented before implementation.
- [ ] AI inputs, outputs, and privacy boundaries are explicit.
- [ ] UI has loading, success, error, and unavailable states.
- [ ] The feature degrades gracefully when AI is disabled or fails.
- [ ] Tests or smoke checks cover the selected AI flow and failure path.
- [ ] No AI output can directly corrupt score, achievements, repository state, or user progress without validation.

## Open Questions

- Which AI use case should be implemented first? Recommended: level hint assistant.
- Should the AI run through an external provider API, local model, or a mocked/stubbed provider for the first implementation?
