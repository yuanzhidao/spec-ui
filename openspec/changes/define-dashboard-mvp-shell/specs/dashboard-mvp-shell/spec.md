## ADDED Requirements

### Requirement: Dashboard-first app shell
The system SHALL present the usable dashboard workbench as the first screen instead of a marketing or scaffold landing page.

#### Scenario: App opens
- **WHEN** the user opens the application
- **THEN** the user sees the spec-ui dashboard shell with project selection or active project data

### Requirement: Three-region operational layout
The system SHALL provide a dense app shell with persistent navigation, a primary work area, and a detail inspector.

#### Scenario: Desktop viewport
- **WHEN** the dashboard renders on a desktop viewport
- **THEN** it displays sidebar navigation, a central workspace, and a right detail inspector without overlapping content

#### Scenario: Mobile or narrow viewport
- **WHEN** the dashboard renders on a narrow viewport
- **THEN** navigation and detail inspection remain accessible through responsive collapsed, drawer, or panel behavior

### Requirement: MVP navigation model
The system SHALL provide navigation entries for Dashboard, Changes, Specs, Validation, Activity, and Settings.

#### Scenario: User navigates between sections
- **WHEN** the user selects a primary navigation item
- **THEN** the central workspace updates to the selected section and the active navigation state is visible

#### Scenario: Project opens after selection
- **WHEN** the user binds a supported local project directory
- **THEN** the central workspace defaults to the Dashboard overview

### Requirement: Validation section behavior
The system SHALL provide a Validation section with explicit validation status and manual validation action.

#### Scenario: User opens validation section
- **WHEN** the user opens the Validation navigation item
- **THEN** the system displays the current validation state and an action to run validation for the selected project

#### Scenario: Project files changed after validation
- **WHEN** supported project files changed after the last validation result
- **THEN** the Validation section indicates that the current result is stale

### Requirement: Project data sections
The system SHALL render MVP sections for dashboard overview, active changes, specs, validation, activity, and settings using normalized project data.

#### Scenario: User opens Changes section
- **WHEN** the user opens the Changes navigation item for a bound project
- **THEN** the system displays active changes or an empty state when no active changes exist

#### Scenario: User opens Specs section
- **WHEN** the user opens the Specs navigation item for a bound project
- **THEN** the system displays detected specs or an empty state when no specs exist

#### Scenario: User opens Activity section
- **WHEN** the user opens the Activity navigation item for a bound project
- **THEN** the system displays recent normalized project events or an empty state when no events are available

#### Scenario: User opens Settings section
- **WHEN** the user opens the Settings navigation item
- **THEN** the system displays active project binding details and runtime status information

### Requirement: Command and search entry
The system SHALL provide a command/search entry point in the dashboard shell.

#### Scenario: Command surface opens
- **WHEN** the user activates the command/search entry
- **THEN** the system displays a command/search surface for available dashboard actions and project entities

### Requirement: Design tokens and theme behavior
The system SHALL define semantic tokens for dashboard surfaces, sidebar, border, ring, brand, status, chart, and muted states.

#### Scenario: Light theme default
- **WHEN** the dashboard renders without an explicit theme preference
- **THEN** it uses the light theme as the default appearance

#### Scenario: Dark tokens available
- **WHEN** the application is rendered under dark theme conditions
- **THEN** semantic dark tokens provide readable foregrounds, surfaces, borders, and status colors

### Requirement: Theme mode control
The system SHALL provide a theme mode control for Light, Dark, and System preferences.

Theme preference SHALL be persisted in the runtime-managed settings file at `~/.spec-ui/settings.json`.

#### Scenario: User selects dark mode
- **WHEN** the user selects Dark theme mode
- **THEN** the dashboard shell and MVP sections render with dark semantic tokens

#### Scenario: Theme preference persists
- **WHEN** the user changes the theme mode and reloads the app
- **THEN** the previously selected theme mode remains active

#### Scenario: User selects system mode
- **WHEN** the user selects System theme mode
- **THEN** the dashboard follows the operating system color scheme while preserving readable semantic tokens

#### Scenario: Operating system theme changes in system mode
- **WHEN** the user has selected System theme mode and the operating system color scheme changes
- **THEN** the dashboard automatically updates to the matching light or dark semantic tokens without a page reload

### Requirement: shadcn and Motion usage
The system SHALL use shadcn/ui as the component foundation and Motion only for purposeful interaction transitions.

#### Scenario: Component added
- **WHEN** implementation needs a shadcn/ui component
- **THEN** the component is added through the official shadcn CLI rather than by manually editing package metadata

#### Scenario: Animation added
- **WHEN** the dashboard uses animation or transition effects
- **THEN** the motion is fast, purposeful, respects reduced-motion preferences, and does not hide critical status changes

### Requirement: Reference-aligned visual behavior
The system SHALL align MVP visual behavior with the approved operational UI references and SHALL NOT introduce an independent product visual identity in this change.

#### Scenario: Dashboard shell is implemented
- **WHEN** the MVP dashboard shell is rendered
- **THEN** spacing, density, sidebar behavior, panel rhythm, and command/search behavior follow the approved reference direction

#### Scenario: New visual style is proposed
- **WHEN** implementation requires a distinct spec-ui visual identity beyond semantic tokens and reference-aligned behavior
- **THEN** that visual identity is deferred to a separate approved OpenSpec change
