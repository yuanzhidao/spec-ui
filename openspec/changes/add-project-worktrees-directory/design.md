## Context

The dashboard already supports multiple projects and monorepo OpenSpec scopes. The missing layer is a repository-level project that can include multiple local checkouts: the primary checkout plus feature worktrees stored under a known sibling directory.

## Decision: Bind a worktrees directory per project, with orphan worktree support

Each project MAY store a `worktreesPath` setting. The UI SHALL expose this in the project's settings dialog as a directory path, with actions to save and clear it.

The runtime SHALL scan only direct child directories under `worktreesPath`. It SHALL NOT recursively search below the worktrees directory. This keeps discovery predictable and avoids scanning large unrelated directory trees.

Each project MAY also store manually bound orphan worktree paths. These paths cover valid worktrees that are not located under the saved worktrees directory. Manual orphan paths SHALL be individually validated against the primary checkout's git common directory.

## Decision: Verify worktree ownership with git common dir

The runtime SHALL treat a child directory as a project checkout only when it is readable, is a git working tree, and resolves to the same git common directory as the primary project path. This supports normal git worktrees while rejecting unrelated repositories.

Git metadata discovery SHALL run in the runtime layer, not in React components. If git metadata cannot be resolved, the child SHALL be skipped with a recoverable worktree issue instead of crashing project discovery.

## Decision: Aggregate checkouts under one project

The primary project path remains the project identity owner and route target. Worktree checkouts SHALL be modeled as project children. The dashboard SHALL aggregate Specs, Changes, Validation, and Activity from valid checkouts under the owning project.

Projected items SHALL include checkout identity fields so the UI can label where each item comes from. Same-ID Changes in different checkouts SHALL merge into one project Change card. The visible primary Change data SHALL come from the most recently updated checkout version, and the merged Change SHALL expose checkout sources so the UI can show worktree tags.

Checkout labels SHALL prefer the git branch name. If the branch cannot be resolved, the label SHALL fall back to the checkout directory name. The primary checkout MAY use the same branch-based label behavior.

## Decision: Keep persistence minimal

Settings SHALL persist the project `worktreesPath` and manual orphan worktree paths, not a full durable list of every detected worktree under the directory. Directory-derived checkouts are discovered from the current filesystem on startup, project refresh, and saved worktrees directory changes. If a directory-derived worktree disappears, it stops contributing projected data after the automatic directory-change refresh. If a manually bound orphan worktree disappears, the runtime SHALL keep the saved path recoverable until the user removes it.

The MVP SHALL NOT automatically infer or save a worktrees directory. Users must set the directory or orphan worktree paths explicitly.

## Decision: Watch OpenSpec content and the saved worktrees directory

For valid checkout watchers, the runtime SHALL listen for relevant OpenSpec paths and respect ignore rules. Discovery and watcher filtering SHALL search for directories named `openspec` and SHALL apply supported `.gitignore` rules before projecting or reacting to OpenSpec content.

For saved worktrees directories, the runtime SHALL listen for direct child entry changes and debounce project rediscovery, with a lightweight direct-child polling fallback when native filesystem watching is unavailable. The directory watcher SHALL NOT recursively watch every checkout file under the worktrees directory. When a child directory appears, disappears, or is renamed, the owning project SHALL rediscover valid checkouts and update the dashboard without requiring a manual refresh.

## Alternatives Considered

- Add each worktree manually as a separate project: rejected because it fragments one repository across multiple project columns and requires repeated manual setup.
- Store every detected worktree as a durable settings entry: rejected because git worktrees are often temporary and can be recreated by scanning the root directory.
- Recursively discover worktrees: rejected because the approved workflow uses a known worktrees directory and recursive scans increase performance and accidental discovery risk.
