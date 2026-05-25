## 1. OpenSpec

- [x] 1.1 Review project worktree binding scope, non-goals, and affected runtime/UI contracts.
- [x] 1.2 Validate `add-project-worktrees-directory`.

## 2. Runtime Model

- [x] 2.1 Extend runtime project settings with optional `worktreesPath` and manual orphan worktree paths.
- [x] 2.2 Add settings migration/default handling for missing `worktreesPath`.
- [x] 2.3 Add checkout projection fields for primary and worktree-derived items.
- [x] 2.4 Preserve project identity and routes on the primary project ID.

## 3. Worktree Discovery

- [x] 3.1 Scan only direct child directories under a saved worktrees directory.
- [x] 3.2 Support manually bound orphan worktree paths outside the saved worktrees directory.
- [x] 3.3 Verify candidate directories belong to the same git common directory as the primary project.
- [x] 3.4 Skip unreadable, missing, non-directory, non-git, and unrelated-repo children recoverably.
- [x] 3.5 Refresh worktree discovery on project refresh and runtime startup.
- [x] 3.6 Refresh worktree discovery automatically when the saved worktrees directory direct children change.

## 4. Realtime And Projection

- [x] 4.1 Attach watchers for valid primary and worktree checkouts.
- [x] 4.2 Refresh the owning project when any checkout watcher reports relevant OpenSpec changes.
- [x] 4.3 Aggregate Specs, Changes, Validation, and Activity from all valid checkouts under the owning project.
- [x] 4.4 Merge same-ID Changes across checkouts and use the most recently updated checkout version as the visible primary.
- [x] 4.5 Keep checkout source metadata available for merged Changes.

## 5. UI

- [x] 5.1 Add a Worktrees directory control to each Project settings dialog.
- [x] 5.2 Add a manual orphan worktree path control to each Project settings dialog.
- [x] 5.3 Show detected checkout count and checkout labels in project surfaces.
- [x] 5.4 Label Specs and Changes cards with checkout identity when a project has multiple checkouts.
- [x] 5.5 Add clear actions for the saved worktrees directory and manual orphan paths.

## 6. Verification

- [x] 6.1 Add runtime tests for worktrees path persistence, orphan worktree persistence, and migration.
- [x] 6.2 Add runtime tests for direct-child worktree discovery and unrelated repo rejection.
- [x] 6.3 Add projection tests for multi-checkout Specs aggregation and same-ID Change merging.
- [x] 6.4 Run TypeScript typecheck, lint, unit tests, and `openspec validate --all`.
- [x] 6.5 Add runtime coverage for automatic directory-derived worktree add/remove discovery.
