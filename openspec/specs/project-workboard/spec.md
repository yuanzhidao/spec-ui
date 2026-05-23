## Purpose
Define the multi-project workboard behavior for Specs and Changes.

## Requirements

### Requirement: Multi-project Specs workboard
The system SHALL render Specs as a multi-project workboard.

#### Scenario: Specs are available
- **WHEN** one or more projects contain specs
- **THEN** the Specs section displays project columns with compact spec cards

#### Scenario: Project has no specs
- **WHEN** a project has no specs
- **THEN** the project column remains visible with a compact empty state

#### Scenario: User focuses a project
- **WHEN** the user selects a project from the project switcher
- **THEN** the workboard filters to that project while keeping the same board model

### Requirement: Multi-project Changes workboard
The system SHALL render active Changes with the same project-column model as Specs.

#### Scenario: Changes are available
- **WHEN** one or more projects contain active changes
- **THEN** the Changes section displays project columns with compact Change cards

#### Scenario: User clears focus
- **WHEN** the user returns to All Projects
- **THEN** the workboard displays Changes across every saved project

### Requirement: Workboard sorting
The system SHALL support workboard sorting by creation time and by name.

#### Scenario: Default sort is active
- **WHEN** a workboard first renders
- **THEN** items are ordered by local directory creation time

#### Scenario: Name sort is selected
- **WHEN** the user selects name sorting
- **THEN** items are ordered alphabetically by title
