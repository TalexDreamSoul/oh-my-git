# Oh My Git! Web Redesign Plan

This branch (`next`) is for a from-scratch pure web version of Oh My Git!.

## Goals

- Pure frontend: no server-side shell, no local `git` binary, no native dependencies.
- Static deployable: GitHub Pages / Cloudflare Pages / Vercel static output.
- Preserve the teaching idea: cards + visual Git graph + file/index/working-tree view.
- Use a browser Git implementation instead of reimplementing Git from zero.

## Proposed stack

- UI: React + TypeScript + Vite
- Git engine: `isomorphic-git`
- Browser filesystem: `@isomorphic-git/lightning-fs` backed by IndexedDB
- Graph/layout: custom SVG/canvas first; optionally Dagre later
- State management: React state first; introduce Zustand only if needed

## Architecture

```text
web/src
  git/
    browserGit.ts       Browser Git facade built on isomorphic-git
  game/
    cards.ts            Card definitions and command mapping
    levels.ts           New declarative level format
    shell.ts            Small command adapter for card/terminal UX
  App.tsx               First playable prototype
```

## Key decision

The original Godot project executes real bash scripts and the real Git CLI. The web rewrite will not emulate a whole POSIX shell. Instead:

1. Core Git operations call `isomorphic-git` directly.
2. Game levels move from bash sections to declarative TypeScript/JSON actions.
3. A small command adapter may support familiar strings such as `git add file`, but it is not a general shell.

## Level format draft

```ts
type LevelAction =
  | { type: 'writeFile'; path: string; content: string }
  | { type: 'deleteFile'; path: string }
  | { type: 'gitInit' }
  | { type: 'gitAdd'; path: string }
  | { type: 'gitCommit'; message: string };

type WinCondition =
  | { type: 'commitCountAtLeast'; count: number }
  | { type: 'fileInHeadEquals'; path: string; content: string }
  | { type: 'workingTreeClean' };
```

## Milestones

### M0: Technical proof of concept

- Create a Vite app.
- Initialize a browser repo.
- Write a file.
- Stage and commit it.
- Read status and log from `isomorphic-git`.

### M1: Basic game loop

- Level select.
- Declarative setup and win conditions.
- Basic cards: file-new, add, commit, branch, checkout.
- Visual commit graph for linear and branching history.

### M2: Index and branches chapters

- Working tree / index / HEAD comparison.
- Branch creation/deletion.
- Checkout commit/branch.
- Reset basics.

### M3: Merge and remotes

- Merge basics and conflict display.
- Simulated local remotes as multiple IndexedDB repo directories.
- Pull/push/fetch as local repo-to-repo operations first.

### M4: Advanced Git

- Rebase/cherry-pick/revert.
- Stash.
- Tags.
- Bisect and reflog simulation.
- Low-level Git object lessons if still desired.

## Notes

`isomorphic-git` supports many needed operations: `init`, `add`, `remove`, `commit`, `checkout`, `branch`, `deleteBranch`, `merge`, `cherryPick`, `fetch`, `pull`, `push`, `status`, `statusMatrix`, `log`, `tag`, `stash`, and low-level read/write object APIs. It does not provide the Git CLI or a bash runtime, so the rewrite should treat it as a Git library, not a shell replacement.
