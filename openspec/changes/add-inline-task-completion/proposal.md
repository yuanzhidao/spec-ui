# Inline Task Completion

## Why

Change details already render OpenSpec tasks, but task completion still requires editing `tasks.md` manually. The app should support the common review workflow where a maintainer checks off completed tasks from the UI and the source markdown stays authoritative.

## What Changes

- Attach `tasks.md` source path and line number metadata to parsed OpenSpec tasks.
- Let users toggle task completion from the change detail tasks board.
- Write the corresponding markdown checkbox back to `tasks.md`.
- Restrict task writes to `tasks.md` files inside added project checkouts.
- Refresh runtime snapshots after the write so task summaries and task columns update.

## Non-Goals

- Do not edit arbitrary markdown files.
- Do not support task reordering, task creation, or task deletion in this change.
- Do not implement conflict resolution beyond rejecting lines that are no longer markdown tasks.
