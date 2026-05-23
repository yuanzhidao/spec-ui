## Purpose
Define how spec-ui persists local runtime settings, project identity, and migration behavior.

## Requirements

### Requirement: Runtime settings file
The system SHALL persist runtime-owned settings in `~/.spec-ui/settings.json`.

#### Scenario: Settings file is written
- **WHEN** project collection, focused project, theme, or language settings change
- **THEN** the runtime writes a schema-valid settings file atomically

#### Scenario: Settings file is missing
- **WHEN** the runtime starts and no settings file exists
- **THEN** the runtime loads default settings without treating the missing file as an error

### Requirement: Persistent project identity
The system SHALL assign each saved local project a persistent random project ID.

#### Scenario: Project is added
- **WHEN** the user adds a local project directory
- **THEN** the settings file stores a project entry with a random `prj_` ID and the local path

#### Scenario: Project route is generated
- **WHEN** the UI links to project-scoped content
- **THEN** the route uses the persistent project ID instead of encoding or hashing the local path

### Requirement: Settings migration
The runtime SHALL migrate supported older settings shapes to the current settings schema.

#### Scenario: Legacy active project is migrated
- **WHEN** the runtime reads a legacy settings file with an active project path
- **THEN** the runtime converts it into a project collection with a persistent project ID

#### Scenario: Path-only project collection is migrated
- **WHEN** the runtime reads a path-only project collection
- **THEN** the runtime creates persistent project IDs and maps the focused project path to the matching focused project ID
