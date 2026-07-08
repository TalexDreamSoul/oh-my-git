# Gameplay roadmap task set

## Goal

Create and coordinate separate Trellis tasks for the repository branch migration, the level 9 `app.js` collision bug, leaderboard/medal/achievement improvements, and a new AI feature.

## Task Map

| Child task | Path | Primary outcome |
|---|---|---|
| Repository branch migration | `.trellis/tasks/07-07-repository-branch-migration` | New repository/default branch shape is planned and executed safely: current Next code becomes `master`; existing Godot `master` is preserved as `godot`. |
| Fix level 9 app.js already exists error | `.trellis/tasks/07-07-fix-level-9-app-js-exists` | Level 9 no longer fails when `app.js` already exists. |
| Optimize leaderboard page | `.trellis/tasks/07-07-optimize-leaderboard-page` | Ranking page UX, states, and data presentation are improved. |
| Optimize medal page | `.trellis/tasks/07-07-optimize-medal-page` | Medal page UX, locked/unlocked states, and progress display are improved. |
| Improve achievement system | `.trellis/tasks/07-07-improve-achievement-system` | Achievement rules, grant flow, persistence, and feedback are tightened. |
| Add AI feature | `.trellis/tasks/07-07-add-ai-feature` | AI feature direction is chosen, designed, and implemented behind a clear UX contract. |

## Requirements

- Keep each deliverable independently planned, implemented, checked, and archived.
- Do not execute repository-moving or branch-destructive operations until the migration task has an approved execution plan and explicit confirmation.
- Treat UI/feature work as separate product tasks; do not bundle unrelated leaderboard, medal, achievement, and AI changes into the level 9 bug fix.
- Preserve the current repository worktree state unless a child task explicitly owns the change.

## Acceptance Criteria

- [ ] All six child tasks exist under `.trellis/tasks/` and are linked to this parent.
- [ ] Each child task has an initial `prd.md` with goal, requirements, acceptance criteria, and open questions.
- [ ] No implementation begins until the selected child task is activated and its planning gate is complete.
- [ ] Final integration review checks that child tasks do not conflict on routes, state models, or branch/release flow.

## Open Questions

- Which child task should be activated first after this planning pass? Recommended: fix the level 9 `app.js` bug first because it is a concrete regression with a narrow verification path.
