# Repository Branch Migration Design

## Current observed source state

- Source repository remote: `origin` -> `https://github.com/TalexDreamSoul/oh-my-git`.
- Remote default branch today: `main`.
- Next/web branch today: `next` at `0fdae3cb46a383bca74014e9413db800148fcac8` (`fix(web): preserve custom display name on oauth login`).
- Godot branch today: `main` at `2992b0a60af767c1a5131fdd4cfdded68fe5c9f8` (`docs: enlarge linux.do badge`).
- Worktrees:
  - `/Users/talexdreamsoul/Workspace/Projects/oh-my-git` -> branch `main`.
  - `/Users/talexdreamsoul/Workspace/Projects/oh-my-git-next` -> branch `next`.
- `oh-my-git-next` currently has uncommitted product changes. Those changes are not represented by the `next` commit above until they are committed.

## Target state

- New repository default branch: `master`.
- `master` points to the final Next/web commit. If the current uncommitted product work is intended for launch, commit it first and use that resulting commit, not the current `0fdae3c` HEAD.
- `godot` points to the previous Godot line currently represented by `main` at `2992b0a60af767c1a5131fdd4cfdded68fe5c9f8`.
- Preserve history by pushing branch refs, not by squashing or copying files.
- Do not delete or rewrite `main`/`next` in the source repository during migration.

## Safe migration shape

Use a temporary clone and push only the intended refs to the new remote. This avoids mutating the developer worktrees and avoids accidentally mirroring stale branch names.

```bash
NEW_REMOTE="<new repository git URL>"
TMP_DIR="$(mktemp -d)/oh-my-git-migration"

git clone --no-local /Users/talexdreamsoul/Workspace/Projects/oh-my-git "$TMP_DIR"
cd "$TMP_DIR"
git fetch origin --prune

git branch --force master origin/next
git branch --force godot origin/main

git remote add new "$NEW_REMOTE"
git push new refs/heads/master:refs/heads/master refs/heads/godot:refs/heads/godot --tags
```

If the final Next commit exists only in the `/Users/talexdreamsoul/Workspace/Projects/oh-my-git-next` worktree, first commit/push it to `origin/next`, or replace `origin/next` in the temporary clone with the exact committed SHA.

## Repository metadata follow-up

After the new remote exists and refs are pushed:

1. Set the hosting provider default branch to `master`.
2. Ensure local tracking uses `master` and `godot` against the new remote.
3. Audit stale branch/product references on the new default branch:
   - `docs/web-redesign.md` currently says the branch is `next`; update to `master` or remove if obsolete.
   - Root `README.md` is still Godot-oriented and says the default branch is `main`; keep it only on `godot` or replace it on `master` with web product docs.
   - `.github/workflows/build.yml` is a Godot release workflow triggered by tags; keep it on `godot` or gate/remove it from `master` if Next releases use a different pipeline.

## Smoke check

```bash
git ls-remote --heads "$NEW_REMOTE" master godot
git clone --depth 1 --branch master "$NEW_REMOTE" /tmp/oh-my-git-master-smoke
git -C /tmp/oh-my-git-master-smoke rev-parse HEAD
git clone --depth 1 --branch godot "$NEW_REMOTE" /tmp/oh-my-git-godot-smoke
git -C /tmp/oh-my-git-godot-smoke rev-parse HEAD
```

Expected refs after migration:

- `master` -> final Next/web commit.
- `godot` -> `2992b0a60af767c1a5131fdd4cfdded68fe5c9f8` unless Godot receives additional commits before migration.

## Blockers before execution

- New repository URL/name is not known yet.
- Explicit approval is still required before repository creation, remote push, branch rewrite, branch deletion, or default-branch changes.
