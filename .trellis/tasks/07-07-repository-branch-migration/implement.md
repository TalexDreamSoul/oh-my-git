# Repository Branch Migration Implementation Plan

## Preconditions

- `oh-my-git-next` product changes are committed if they should be included in the new `master` branch.
- New repository has been created or a writable remote URL is available.
- User has explicitly approved remote push/default-branch changes.

## Ordered checklist

1. Freeze source refs.
   - Record `git rev-parse next` for the Next source commit.
   - Record `git rev-parse main` for the Godot source commit.
   - Require a clean working tree for any worktree whose uncommitted files should be included.
2. Create a temporary clone from the source repository.
3. In the temporary clone, create `master` from the selected Next commit.
4. In the temporary clone, create `godot` from the selected Godot commit.
5. Push only `master`, `godot`, and tags to the new remote.
6. Set the new remote default branch to `master` in the hosting provider.
7. Clone/fetch-smoke the new remote and verify both branch heads.
8. Update stale branch/product metadata on the new default branch:
   - `docs/web-redesign.md` branch wording.
   - Root README product/default-branch wording.
   - Godot-only release workflow placement or branch gating.
9. Keep the old repository untouched until the new repository smoke check passes.

## Validation commands

```bash
git ls-remote --heads "$NEW_REMOTE" master godot
git ls-remote --tags "$NEW_REMOTE"
git clone --depth 1 --branch master "$NEW_REMOTE" /tmp/oh-my-git-master-smoke
git clone --depth 1 --branch godot "$NEW_REMOTE" /tmp/oh-my-git-godot-smoke
```

## Rollback shape

- If push fails before default-branch switch: delete the partially created new repository or remove the pushed refs from the new remote only after confirming no one else has consumed it.
- If default-branch switch is wrong: set the provider default branch back to the previous branch, then re-run the smoke check.
- Do not force-push or delete refs in the source repository as part of rollback.
