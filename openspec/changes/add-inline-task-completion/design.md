# Design

## Runtime Write Boundary

The UI does not write files directly. Parsed task records include:

- `sourcePath`: the absolute `tasks.md` path;
- `lineNumber`: the one-based line number of the markdown task;
- `completed`: the current checkbox state.

When the user toggles a task, the app sends those fields to the runtime. The runtime validates that the path:

- is named `tasks.md`;
- is under an `openspec/changes` directory;
- is inside a checkout for an added project.

Only then does it update the checkbox marker on that exact line.

## Markdown Preservation

The writer only replaces the checkbox marker in a markdown task line. It preserves the rest of the line and the file newline style. If the line number is stale or the line is no longer a markdown task, the runtime returns a recoverable runtime issue instead of rewriting another line.

## Snapshot Refresh

After a successful write, the runtime refreshes the project data and emits a fresh snapshot. The file watcher may also observe the change, but the explicit snapshot keeps the UI responsive without waiting for a polling or watcher tick.

## UI Pending Behavior

Task toggles use task-level pending state instead of the global busy state. The clicked task renders its new checkbox state immediately, while the task stays in its current status group until the runtime snapshot confirms the markdown write. If the write fails or the line is rejected, clearing the pending state restores the task to the source snapshot state.

The clicked checkbox state is committed synchronously, but task groups continue to derive their columns from the last confirmed runtime snapshot. The runtime call starts after the browser has had a paint opportunity for the pending checkbox state. In Desktop, the Tauri command moves file IO and snapshot refresh work onto a blocking worker thread so native runtime work does not block the renderer.
