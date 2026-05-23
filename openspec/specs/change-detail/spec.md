## Purpose
Define how Change details render OpenSpec proposal, task, delta spec, and file artifacts.

## Requirements

### Requirement: Change detail overview
The system SHALL display structured overview content for an OpenSpec Change.

#### Scenario: Proposal sections are available
- **WHEN** a Change proposal includes Why and What Changes sections
- **THEN** the Overview tab displays those sections as readable markdown

#### Scenario: Design is available
- **WHEN** a Change includes design content
- **THEN** the Overview tab includes the design content

### Requirement: Change detail tasks
The system SHALL display tasks from an OpenSpec Change.

#### Scenario: Tasks are available
- **WHEN** a Change includes task checklist items
- **THEN** the Tasks tab displays completion state for each task

#### Scenario: Tasks are absent
- **WHEN** a Change has no task file or task items
- **THEN** the Tasks tab displays a compact empty state

### Requirement: Change detail artifacts
The system SHALL display delta specs and markdown files for an OpenSpec Change.

#### Scenario: Delta specs are available
- **WHEN** a Change contains delta spec files
- **THEN** the Delta Specs tab renders each spec delta as markdown

#### Scenario: Markdown files are available
- **WHEN** a Change contains proposal, design, tasks, or nested markdown files
- **THEN** the Files tab lists those files with readable markdown content
