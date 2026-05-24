## ADDED Requirements

### Requirement: Spec dialect adapter contract
The system SHALL define a spec dialect adapter contract that projects each local spec-driven project into normalized dashboard data.

#### Scenario: Adapter projects project data
- **WHEN** the dashboard requests data for an added project
- **THEN** the active adapter returns normalized project, spec, change, requirement, validation, and activity data needed by the MVP UI

#### Scenario: UI consumes normalized data
- **WHEN** dashboard components render project information
- **THEN** they consume normalized adapter output instead of dialect-specific file structures

#### Scenario: Runtime aggregates project data
- **WHEN** multiple projects are added
- **THEN** the runtime combines normalized per-project adapter outputs into a unified dashboard projection without making adapters responsible for cross-project aggregation

### Requirement: Scoped adapter projection
The system SHALL allow a spec dialect adapter to project multiple scopes for one local project.

Each scoped entity SHALL include the persistent project ID plus scope identity fields that let the UI and runtime distinguish the root scope from nested scopes.

#### Scenario: Adapter projects scopes
- **WHEN** the dashboard requests data for a project with multiple detected spec scopes
- **THEN** the active adapter returns normalized scope records with stable scope ID, scope label, relative scope path, dialect, and status

#### Scenario: Adapter projects scoped specs
- **WHEN** a detected scope contains specs
- **THEN** the adapter attaches that scope's identity to each normalized spec and requirement projected from that scope

#### Scenario: Adapter projects scoped changes
- **WHEN** a detected scope contains active Changes
- **THEN** the adapter attaches that scope's identity to each normalized Change, task item, delta spec, and file entry projected from that scope

#### Scenario: Adapter projects archived OpenSpec changes
- **WHEN** a detected scope contains `openspec/changes/archive/<change-id>/`
- **THEN** the adapter projects that Change with an archived lifecycle and keeps it separate from active Changes with the same Change ID

#### Scenario: Adapter projects scoped validation
- **WHEN** validation state is available for a scoped OpenSpec project
- **THEN** the adapter exposes validation status for that scope without replacing the project-level validation summary

### Requirement: Same-id scoped Changes aggregate inside one project
The system SHALL aggregate Changes that share the same lifecycle and Change ID across scopes within the same project.

The aggregated Change SHALL preserve per-scope title, status, task progress, delta spec files, and file entries so scoped differences remain inspectable.

#### Scenario: Same Change ID exists in multiple scopes
- **WHEN** two or more scopes in one project contain a Change with the same lifecycle and Change ID
- **THEN** the normalized project projection exposes one aggregated Change with scoped child entries for each matching scope

#### Scenario: Change exists in only one scope
- **WHEN** only one scope contains a given lifecycle and Change ID
- **THEN** the normalized project projection exposes the Change with one scoped child entry and does not create placeholder scoped Changes

#### Scenario: Same Change ID exists in different projects
- **WHEN** two different projects contain the same lifecycle and Change ID
- **THEN** the runtime keeps those Changes separate by project and does not aggregate them across projects

#### Scenario: Scoped Change task progress differs
- **WHEN** scoped Changes with the same Change ID have different task totals or completion states
- **THEN** the aggregated Change exposes both project-level rolled-up progress and per-scope progress

### Requirement: OpenSpec adapter is the first supported dialect
The system SHALL support OpenSpec as the first implemented spec dialect.

#### Scenario: OpenSpec project selected
- **WHEN** an added project contains a valid `openspec/` directory
- **THEN** the system detects the OpenSpec dialect and uses the OpenSpec adapter

#### Scenario: OpenSpec data is projected
- **WHEN** the OpenSpec adapter reads an OpenSpec project
- **THEN** it exposes scopes, active and archived changes, specs, requirements, proposal/design/tasks presence, and validation status in the normalized model

#### Scenario: OpenSpec Spec detail is projected
- **WHEN** the OpenSpec adapter reads a baseline Spec
- **THEN** it exposes the Spec markdown content needed by the Spec detail view

#### Scenario: OpenSpec entity timestamps are projected
- **WHEN** the OpenSpec adapter reads specs and changes
- **THEN** it exposes creation and modification timestamps derived from the local spec and change directories in the normalized model

#### Scenario: OpenSpec Change detail is projected
- **WHEN** the OpenSpec adapter reads a Change
- **THEN** it exposes proposal overview, design content, task items, delta spec markdown files, and markdown file entries needed by the Change detail view

### Requirement: Future dialects remain extensible
The system SHALL leave extension points for future spec dialects without requiring dashboard shell rewrites.

#### Scenario: Unsupported dialect selected
- **WHEN** an added project does not match any supported dialect
- **THEN** the system reports that no supported spec dialect was detected and does not crash the shell

#### Scenario: New dialect is added later
- **WHEN** a later implementation adds a new dialect adapter
- **THEN** existing dashboard shell components can render its normalized model without importing dialect-specific parser code

### Requirement: Adapter failures are recoverable
The system SHALL surface adapter parsing and projection failures as recoverable dashboard states.

#### Scenario: Adapter read fails
- **WHEN** the active adapter cannot parse or project added project data
- **THEN** the system displays the adapter error with enough context for the user to inspect the project and retry

### Requirement: Validation status projection
The system SHALL expose validation status for each added project through the active spec dialect adapter.

The normalized validation status SHALL use explicit states: `not-run`, `running`, `passing`, `failing`, and `stale`.

#### Scenario: Validation has not run
- **WHEN** an added project has no current validation result
- **THEN** the normalized model exposes validation status as `not-run`

#### Scenario: Validation becomes stale
- **WHEN** a relevant project file changes after the last validation result
- **THEN** the normalized model exposes that project's validation status as `stale`

### Requirement: Runtime validation command execution
The system SHALL execute manual validation through the local runtime command boundary.

For OpenSpec projects, manual validation SHALL invoke the OpenSpec validation command for the focused project and capture stdout, stderr, exit code, start timestamp, and end timestamp.

#### Scenario: User starts validation
- **WHEN** the user triggers validation for a focused OpenSpec project
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
