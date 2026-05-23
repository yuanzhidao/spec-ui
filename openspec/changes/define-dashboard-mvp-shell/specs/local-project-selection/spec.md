## ADDED Requirements

### Requirement: User adds local project directories from the UI
The system SHALL provide a UI surface that lets the user add local project directories to the dashboard project collection.

#### Scenario: No projects added
- **WHEN** the user opens the app without any project directories
- **THEN** the system displays an empty state with a project directory addition control

#### Scenario: Project path submitted
- **WHEN** the user submits a local project directory path
- **THEN** the system validates the path through the local runtime before adding it to the project collection

### Requirement: Added project validation
The system SHALL validate that each added local directory is readable and SHALL automatically detect supported spec-driven project structure when present.

#### Scenario: Directory is readable and supported
- **WHEN** the submitted directory is readable and contains an `openspec/` project
- **THEN** the system adds the directory to the project collection and makes it available in unified boards

#### Scenario: Directory is missing or unreadable
- **WHEN** the submitted path is missing or unreadable
- **THEN** the system shows a recoverable error that explains the failure and keeps the project addition control available

#### Scenario: Directory is readable with no supported spec structure
- **WHEN** the submitted directory is readable but contains no supported spec structure
- **THEN** the system adds the directory and shows a blank no-spec project state without crashing the shell

### Requirement: OpenSpec structure detection
The system SHALL detect a submitted directory as OpenSpec when it contains an `openspec/` directory with recognizable OpenSpec project structure.

#### Scenario: OpenSpec config exists
- **WHEN** the submitted directory contains `openspec/config.yaml`
- **THEN** the system detects the OpenSpec dialect even if there are no active changes or specs

#### Scenario: OpenSpec content directories exist
- **WHEN** the submitted directory contains `openspec/specs/` or `openspec/changes/`
- **THEN** the system detects the OpenSpec dialect and projects available content

#### Scenario: Empty openspec directory exists
- **WHEN** the submitted directory contains an empty `openspec/` directory
- **THEN** the system detects an empty OpenSpec project and displays empty OpenSpec states

### Requirement: Monorepo OpenSpec scope discovery
The system SHALL detect multiple OpenSpec scopes under one added project directory and keep them attached to the same project binding.

Each detected scope SHALL represent one directory that owns a recognizable `openspec/` instance. The project root scope SHALL use the label `root`; nested scopes SHALL use their relative POSIX path from the project root as their label.
Scope discovery SHALL search for directories named `openspec` instead of relying on a fixed directory depth limit. The MVP scope scan SHALL only discover OpenSpec scopes; other spec dialect scope discovery SHALL be added later through dialect-specific extensions.

#### Scenario: Root and nested OpenSpec scopes exist
- **WHEN** the submitted directory contains `openspec/` and nested directories that also contain `openspec/`
- **THEN** the system adds one project binding and records each detected OpenSpec scope under that project

#### Scenario: Nested OpenSpec scopes exist without a root scope
- **WHEN** the submitted directory has no root `openspec/` but contains nested directories with recognizable `openspec/` structure
- **THEN** the system adds one project binding and records the nested scopes under that project

#### Scenario: No OpenSpec scopes exist
- **WHEN** the submitted directory and its scanned child directories contain no supported spec structure
- **THEN** the system adds the directory as a blank no-spec project state without creating synthetic scopes

#### Scenario: Scope scan ignores heavy directories
- **WHEN** the submitted directory contains dependency, build, hidden, worktree, or reference directories
- **THEN** the system skips ignored directories during scope discovery so generated or nested repository content does not appear as project scopes

#### Scenario: Scope scan follows project ignore rules
- **WHEN** the submitted directory or any traversed child directory contains readable `.gitignore` rules
- **THEN** the system applies supported `.gitignore` patterns during scope discovery and verifies discovered paths against rules relative to the directory that owns each `.gitignore`

#### Scenario: Project ignore rules cannot be read
- **WHEN** the submitted directory or a traversed child directory contains `.gitignore` rules that cannot be read or parsed
- **THEN** the system continues scope discovery with built-in ignored directories and keeps the project state recoverable

#### Scenario: Scope ordering is deterministic
- **WHEN** multiple scopes are discovered under a project
- **THEN** the system orders the root scope first when present and orders nested scopes by relative path

### Requirement: Project collection state is visible
The system SHALL show the project collection, focused project, and each project's binding state in the dashboard shell.

#### Scenario: Project is added
- **WHEN** a project directory is successfully added
- **THEN** the shell displays the project name or path, detected spec dialect, and detected scope count in the project collection

#### Scenario: Project is focused
- **WHEN** the user selects a project from the project collection
- **THEN** the system focuses that project and filters project-specific boards to that project

#### Scenario: Project is removed
- **WHEN** the user removes a project from the project collection
- **THEN** the system removes that project from unified boards and detaches its realtime subscription

#### Scenario: Project path is replaced
- **WHEN** the user updates a saved project's local directory path
- **THEN** the runtime keeps the same persistent project ID, validates the new path, refreshes discovery, and reattaches the realtime subscription for the new path

### Requirement: Project collection persists locally
The system SHALL persist runtime settings in the runtime-managed JSON settings file at `~/.spec-ui/settings.json`.

The settings file SHALL include the project collection as persistent random project IDs paired with local paths, focused project ID, theme preference, and language preference.
The focused project ID MAY be empty to represent the All Projects view.

#### Scenario: App restarts with valid persisted projects
- **WHEN** the app starts and the JSON settings file contains previously added valid project directories
- **THEN** the system restores the project collection after validating each directory is still readable and detecting supported spec structure if present

#### Scenario: Project identity persists independently from path display
- **WHEN** a project is added to the collection
- **THEN** the runtime stores a persistent random project ID for that project and uses that ID for project-scoped routes instead of encoding or hashing the local path

#### Scenario: Project path repair keeps identity
- **WHEN** a persisted project path is repaired or replaced
- **THEN** the runtime updates the stored path without replacing the persistent project ID

#### Scenario: Persisted project is no longer valid
- **WHEN** the app starts and a persisted project path is missing or unreadable
- **THEN** the system keeps a recoverable invalid-project state for that entry and lets the user remove or replace it

#### Scenario: User clears project collection
- **WHEN** the user clears all project bindings
- **THEN** the system removes or disables persisted project entries and returns to the project addition empty state

#### Scenario: Settings file is invalid
- **WHEN** the runtime reads a malformed or schema-invalid JSON settings file
- **THEN** the system ignores invalid persisted project entries, reports a recoverable settings error, and lets the user add project directories

#### Scenario: Settings are updated
- **WHEN** the project collection or focused project changes
- **THEN** the runtime writes the JSON settings file atomically with schema-valid content

#### Scenario: Focus is cleared
- **WHEN** the user returns to the All Projects view
- **THEN** the runtime persists an empty focused project ID without removing the project collection

#### Scenario: Theme preference is updated
- **WHEN** the user changes the theme preference
- **THEN** the runtime settings file is updated atomically with the new schema-valid theme preference

#### Scenario: Language preference is updated
- **WHEN** the user changes the language preference
- **THEN** the runtime settings file is updated atomically with the new schema-valid language preference

### Requirement: Filesystem access stays behind runtime boundary
The system MUST keep local filesystem reads, path validation, and project discovery outside React UI components.

#### Scenario: UI renders project addition
- **WHEN** the project addition UI renders or updates
- **THEN** it uses runtime APIs or state derived from runtime APIs instead of importing filesystem APIs directly
