# Fix level 9 app.js already exists error

## Goal

Fix the level 9 failure where creating or loading `app.js` throws an "already exists" style error.

## Confirmed Facts

- User reports level 9 can error because `app.js` already exists.
- The defect is level-specific and should be fixed without changing unrelated gameplay or page systems.

## Requirements

- Reproduce or trace the level 9 flow that creates, copies, restores, or validates `app.js`.
- Fix the root cause instead of suppressing the error message.
- Make the file operation idempotent where the level design expects repeat/retry behavior.
- Preserve intentional safeguards that prevent accidental overwrites in other levels.
- Cover first-run, retry/restart, and pre-existing `app.js` cases.

## Acceptance Criteria

- [ ] Level 9 can be entered from a clean state without an `app.js` collision.
- [ ] Level 9 can be retried/restarted when `app.js` already exists without crashing or blocking progression.
- [ ] The fix does not silently overwrite user-created content unless level 9 explicitly owns that file.
- [ ] A targeted test, fixture check, or manual gameplay smoke test covers the duplicate `app.js` case.
- [ ] No unrelated levels regress in file creation behavior.

## Open Questions

- Should level 9 preserve an existing user-edited `app.js`, replace it with the level template, or treat it as already completed? Recommended default: preserve user content unless the level's contract clearly owns the file.
