## ADDED Requirements

### Requirement: User selects a local project directory from the UI
The system SHALL provide a UI surface that lets the user bind the dashboard to a local project directory.

#### Scenario: No project selected
- **WHEN** the user opens the app without a selected project directory
- **THEN** the system displays an empty state with a project directory selection control

#### Scenario: Project path submitted
- **WHEN** the user submits a local project directory path
- **THEN** the system validates the path through the local runtime before rendering project data

### Requirement: Selected project validation
The system SHALL validate that a selected local directory is readable and SHALL automatically detect supported spec-driven project structure when present.

#### Scenario: Directory is readable and supported
- **WHEN** the selected directory is readable and contains an `openspec/` project
- **THEN** the system binds the dashboard to the project and shows the project overview

#### Scenario: Directory is missing or unreadable
- **WHEN** the selected path is missing or unreadable
- **THEN** the system shows a recoverable error that explains the failure and keeps the directory selection control available

#### Scenario: Directory is readable with no supported spec structure
- **WHEN** the selected directory is readable but contains no supported spec structure
- **THEN** the system binds the directory and shows a blank no-spec project state without crashing the shell

### Requirement: OpenSpec structure detection
The system SHALL detect a selected directory as OpenSpec when it contains an `openspec/` directory with recognizable OpenSpec project structure.

#### Scenario: OpenSpec config exists
- **WHEN** the selected directory contains `openspec/config.yaml`
- **THEN** the system detects the OpenSpec dialect even if there are no active changes or specs

#### Scenario: OpenSpec content directories exist
- **WHEN** the selected directory contains `openspec/specs/` or `openspec/changes/`
- **THEN** the system detects the OpenSpec dialect and projects available content

#### Scenario: Empty openspec directory exists
- **WHEN** the selected directory contains an empty `openspec/` directory
- **THEN** the system detects an empty OpenSpec project and displays empty OpenSpec states

### Requirement: Project binding state is visible
The system SHALL show the active project identity and binding state in the dashboard shell.

#### Scenario: Project is bound
- **WHEN** a project directory is successfully bound
- **THEN** the shell displays the active project name or path and the detected spec dialect

#### Scenario: Project is changed
- **WHEN** the user selects a different valid project directory
- **THEN** the system replaces the active project data and realtime subscription with the new project binding

### Requirement: Project binding persists locally
The system SHALL persist runtime settings in the runtime-managed JSON settings file at `~/.spec-ui/settings.json`.

The settings file SHALL include active project binding and theme preference.

#### Scenario: App restarts with valid persisted project
- **WHEN** the app starts and the JSON settings file contains a previously selected valid project directory
- **THEN** the system restores that project binding after validating the directory is still readable and detecting supported spec structure if present

#### Scenario: Persisted project is no longer valid
- **WHEN** the app starts and the persisted project path is missing or unreadable
- **THEN** the system shows a recoverable invalid-project state and lets the user choose another directory

#### Scenario: User clears project binding
- **WHEN** the user clears the active project binding
- **THEN** the system removes or disables the persisted binding and returns to the project selection empty state

#### Scenario: Settings file is invalid
- **WHEN** the runtime reads a malformed or schema-invalid JSON settings file
- **THEN** the system ignores the invalid persisted binding, reports a recoverable settings error, and lets the user choose a project directory

#### Scenario: Settings are updated
- **WHEN** the active project binding changes
- **THEN** the runtime writes the JSON settings file atomically with schema-valid content

#### Scenario: Theme preference is updated
- **WHEN** the user changes the theme preference
- **THEN** the runtime settings file is updated atomically with the new schema-valid theme preference

### Requirement: Filesystem access stays behind runtime boundary
The system MUST keep local filesystem reads, path validation, and project discovery outside React UI components.

#### Scenario: UI renders project selection
- **WHEN** the project selection UI renders or updates
- **THEN** it uses runtime APIs or state derived from runtime APIs instead of importing filesystem APIs directly
