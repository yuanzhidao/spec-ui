## ADDED Requirements

### Requirement: Spec dialect adapter contract
The system SHALL define a spec dialect adapter contract that projects a local spec-driven project into normalized dashboard data.

#### Scenario: Adapter projects project data
- **WHEN** the dashboard requests data for a selected project
- **THEN** the active adapter returns normalized project, spec, change, requirement, validation, and activity data needed by the MVP UI

#### Scenario: UI consumes normalized data
- **WHEN** dashboard components render project information
- **THEN** they consume normalized adapter output instead of dialect-specific file structures

### Requirement: OpenSpec adapter is the first supported dialect
The system SHALL support OpenSpec as the first implemented spec dialect.

#### Scenario: OpenSpec project selected
- **WHEN** the selected project contains a valid `openspec/` directory
- **THEN** the system detects the OpenSpec dialect and uses the OpenSpec adapter

#### Scenario: OpenSpec data is projected
- **WHEN** the OpenSpec adapter reads an OpenSpec project
- **THEN** it exposes active changes, specs, requirements, proposal/design/tasks presence, and validation status in the normalized model

### Requirement: Future dialects remain extensible
The system SHALL leave extension points for future spec dialects without requiring dashboard shell rewrites.

#### Scenario: Unsupported dialect selected
- **WHEN** the selected project does not match any supported dialect
- **THEN** the system reports that no supported spec dialect was detected and does not crash the shell

#### Scenario: New dialect is added later
- **WHEN** a later implementation adds a new dialect adapter
- **THEN** existing dashboard shell components can render its normalized model without importing dialect-specific parser code

### Requirement: Adapter failures are recoverable
The system SHALL surface adapter parsing and projection failures as recoverable dashboard states.

#### Scenario: Adapter read fails
- **WHEN** the active adapter cannot parse or project selected project data
- **THEN** the system displays the adapter error with enough context for the user to inspect the project and retry

### Requirement: Validation status projection
The system SHALL expose validation status for the selected project through the active spec dialect adapter.

The normalized validation status SHALL use explicit states: `not-run`, `running`, `passing`, `failing`, and `stale`.

#### Scenario: Validation has not run
- **WHEN** the selected project has no current validation result
- **THEN** the normalized model exposes validation status as `not-run`

#### Scenario: Validation becomes stale
- **WHEN** a relevant project file changes after the last validation result
- **THEN** the normalized model exposes validation status as `stale`

### Requirement: Runtime validation command execution
The system SHALL execute manual validation through the local runtime command boundary.

For OpenSpec projects, manual validation SHALL invoke the OpenSpec validation command for the selected project and capture stdout, stderr, exit code, start timestamp, and end timestamp.

#### Scenario: User starts validation
- **WHEN** the user triggers validation for a selected OpenSpec project
- **THEN** the runtime starts OpenSpec validation and exposes validation status as `running`

#### Scenario: Validation passes
- **WHEN** the OpenSpec validation command exits successfully
- **THEN** the normalized model exposes validation status as `passing` with captured command output and timestamps

#### Scenario: Validation fails
- **WHEN** the OpenSpec validation command exits unsuccessfully
- **THEN** the normalized model exposes validation status as `failing` with captured command output, exit code, and timestamps

#### Scenario: Validation cannot start
- **WHEN** the runtime cannot start the OpenSpec validation command
- **THEN** the normalized model exposes validation status as `failing` with a recoverable runtime error message
