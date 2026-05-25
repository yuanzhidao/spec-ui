## Why

Feature work is developed in git worktrees, and each worktree can own its own OpenSpec change state. A project bound only to its primary checkout cannot show active feature progress unless every worktree is added as a separate project, which fragments the dashboard.

## What Changes

- Add a per-project worktrees directory binding and a manual orphan worktree path binding.
- Detect valid git worktrees by scanning only the worktrees directory's direct children, plus any manually saved orphan worktree paths.
- Watch the saved worktrees directory so newly added or removed directory-derived worktrees appear without a manual refresh.
- Treat the primary checkout and detected worktrees as checkouts under one project.
- Aggregate Specs, Changes, Validation, and Activity from all valid checkouts for the focused project.
- Merge same-ID Changes across checkouts, using the most recently updated checkout version as the visible primary.
- Show checkout/worktree labels on projected cards and project detail surfaces so feature progress stays attributable.
- Persist the worktrees directory and manually bound orphan worktree paths in runtime settings and restore them on restart.

## Non-Goals

- Creating, deleting, pruning, or moving git worktrees.
- Automatically adding every worktree without an explicit worktrees directory or manual orphan worktree binding.
- Deep recursive worktree discovery.
- Native desktop folder picker integration.
