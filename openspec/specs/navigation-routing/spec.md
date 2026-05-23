## Purpose
Define URL-backed navigation for dashboard sections and project-scoped Change details.

## Requirements

### Requirement: Section routes
The system SHALL represent primary dashboard sections as URL routes.

#### Scenario: User opens a section
- **WHEN** the user navigates to Specs, Changes, Projects, Activity, Validation, or Settings
- **THEN** the browser URL updates to the matching section route

#### Scenario: User refreshes a section
- **WHEN** the user refreshes a section URL
- **THEN** the application restores that section instead of returning to the default screen

#### Scenario: User uses browser history
- **WHEN** the user moves backward or forward through browser history
- **THEN** the active navigation state follows the current URL

### Requirement: Change detail routes
The system SHALL expose project-scoped routes for Change details.

#### Scenario: User opens a Change detail
- **WHEN** the user activates a Change card
- **THEN** the URL includes the persistent project ID and Change ID

#### Scenario: Change detail route is stale
- **WHEN** the route points to a missing project or Change
- **THEN** the UI displays a recoverable missing state with a path back to Changes
