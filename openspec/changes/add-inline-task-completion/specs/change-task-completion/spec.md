# change-task-completion Specification

## ADDED Requirements

### Requirement: OpenSpec task source metadata

Parsed OpenSpec tasks SHALL include enough source metadata for the runtime to update the backing `tasks.md` line.

#### Scenario: Task metadata is projected

- **WHEN** the runtime parses a markdown task from `tasks.md`
- **THEN** the task includes its source file path
- **AND** the task includes its one-based line number

### Requirement: Inline task completion toggle

The change detail tasks view SHALL allow users to toggle OpenSpec task completion.

#### Scenario: User marks a task completed

- **WHEN** a user clicks an incomplete task checkbox in the change detail tasks view
- **THEN** the task checkbox commits and renders as checked immediately
- **AND** the task remains in its current todo group while the write is pending
- **AND** the runtime update starts after the local pending state has a paint opportunity
- **AND** the runtime updates the matching markdown task line from `[ ]` to `[x]`
- **AND** the task moves to the completed group only after the frontend receives a successful runtime snapshot

#### Scenario: User marks a task todo

- **WHEN** a user clicks a completed task checkbox in the change detail tasks view
- **THEN** the task checkbox commits and renders as unchecked immediately
- **AND** the task remains in its current completed group while the write is pending
- **AND** the runtime update starts after the local pending state has a paint opportunity
- **AND** the runtime updates the matching markdown task line from `[x]` or `[X]` to `[ ]`
- **AND** the task moves to the todo group only after the frontend receives a successful runtime snapshot

#### Scenario: Desktop task write does not block the renderer

- **WHEN** a user toggles one or more task checkboxes in the Desktop app
- **THEN** the Rust task write and project refresh work runs off the WebView/native command thread
- **AND** other task checkboxes remain interactive while earlier task writes are pending

### Requirement: Task write safety

The runtime SHALL restrict inline task writes to OpenSpec task files that belong to added project checkouts.

#### Scenario: Task source is outside added projects

- **WHEN** a task completion request targets a path outside the added project checkouts
- **THEN** the runtime rejects the write
- **AND** no file is modified

#### Scenario: Task line changed before write

- **WHEN** the requested line is no longer a markdown task
- **THEN** the runtime rejects the write
- **AND** no unrelated line is modified
