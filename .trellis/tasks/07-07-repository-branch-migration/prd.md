# Repository branch migration

## Goal

Prepare a safe repository/branch migration where the current Next code becomes the default `master` branch in a new repository, and the previous Godot `master` history is preserved as a `godot` branch.

## Confirmed Facts

- User wants a new repository.
- User wants current `next` content to become `master`.
- User says the current `master` is the previous Godot version and should become branch `godot`.
- Current working directory reported by Trellis is on branch `main`; branch names must be verified before any git operation.

## Requirements

- Preserve both code lines with no data loss.
- Make the Next code the new repository default branch named `master` unless the user later chooses `main`.
- Preserve the previous Godot branch as `godot`.
- Produce a dry-run migration plan before running destructive git or remote operations.
- Do not run branch deletion, force push, remote replacement, or repository creation commands without explicit confirmation.
- Update repository metadata only when required by the migration: default branch, CI/release branch references, documentation branch names, and remote URL.

## Acceptance Criteria

- [ ] Existing branch/head mapping is documented before migration: source commit for Next code and source commit for Godot code.
- [ ] New repository contains default branch `master` pointing at the intended Next commit/history.
- [ ] New repository contains branch `godot` pointing at the intended Godot commit/history.
- [ ] Remote default branch and local tracking branches match the chosen branch names.
- [ ] CI/release config and docs no longer reference stale branch names incorrectly.
- [ ] A clone/fetch smoke check proves both `master` and `godot` are reachable from the new remote.

## Open Questions

- What is the new repository name/remote URL?
- Should history be preserved exactly, or should the new repository start with a cleaned/squashed history?
- Is the default branch required to be `master`, or can it be `main` if the hosting platform defaults to `main`?
