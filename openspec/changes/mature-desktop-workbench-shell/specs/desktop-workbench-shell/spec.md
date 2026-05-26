# desktop-workbench-shell Specification

## ADDED Requirements

### Requirement: Desktop shell boundary

The Desktop target SHALL have an app-shell boundary that owns platform wiring outside routed product views.

#### Scenario: Desktop app renders routed product views

- **WHEN** the Desktop renderer starts
- **THEN** the Desktop shell wraps the client router with the navigation adapter
- **AND** routed product views render inside that shell
- **AND** terminal and future global surfaces mount outside routed product views so route changes do not recreate them

#### Scenario: Shared views remain platform-neutral

- **WHEN** shared product views need navigation or runtime behavior
- **THEN** they use shared adapters and runtime contracts
- **AND** they do not import Tauri APIs, concrete router implementations, or native window APIs

### Requirement: Desktop chrome maturity roadmap

The Desktop shell SHALL be able to evolve into a native-feeling workbench chrome without changing shared product screens.

#### Scenario: Desktop chrome is added

- **WHEN** the project adds a custom titlebar, drag region, back/forward controls, app-level status, or top navigation
- **THEN** those surfaces are implemented in the Desktop app shell
- **AND** shared product views continue to render as routed workbench content

#### Scenario: Overlay surfaces are added

- **WHEN** command search, terminal, global dialogs, notifications, or future app overlays are visible
- **THEN** they mount from shell-level overlay roots rather than from individual route pages
- **AND** route changes do not close persistent overlays unless the user or a feature rule explicitly closes them

### Requirement: Route lifecycle ownership

The Desktop shell SHALL own Desktop route lifecycle and history behavior.

#### Scenario: Desktop route changes

- **WHEN** a Desktop user navigates between Specs, Changes, Projects, Settings, or detail routes
- **THEN** the route state changes through the Desktop app-shell router
- **AND** the navigation adapter publishes the current pathname and search params to shared views
- **AND** global shell surfaces such as terminal remain mounted

#### Scenario: Future route handles are introduced

- **WHEN** route handles for title, icon, status, or history labels are added
- **THEN** the Desktop shell can consume those route handles without shared views depending on platform-specific code

#### Scenario: Document title follows the active route

- **WHEN** the Desktop route changes
- **THEN** the Desktop shell derives the active document title from the deepest matched route handle
- **AND** the routed product views do not set static Desktop document titles themselves

### Requirement: Incremental tab and preserved-state model

The system SHALL plan for preserved independent route instances without requiring the MVP to implement full tabs immediately.

#### Scenario: Tab state becomes necessary

- **WHEN** workflows require multiple preserved project/spec/change contexts at once
- **THEN** the Desktop shell introduces tab or workspace state above the routed product views
- **AND** each preserved context owns independent route state
- **AND** inactive contexts do not reset long-running local UI state when the user switches away

#### Scenario: MVP has one active context

- **WHEN** the MVP runs with one active Desktop route context
- **THEN** the app still keeps the shell/router/provider boundary that can accept tab state later

### Requirement: Runtime data maturity roadmap

The runtime data model SHALL evolve from a single dashboard snapshot toward granular cached projections when feature complexity requires it.

#### Scenario: Initial snapshot is loaded

- **WHEN** the Desktop app needs initial project data
- **THEN** it may load a dashboard snapshot through the runtime client
- **AND** loading states stay stable until initial data or a recoverable runtime error is available

#### Scenario: Granular projections are introduced

- **WHEN** project pages, workboards, details, validation, or terminal state need independent refresh behavior
- **THEN** those surfaces can move to smaller runtime queries or subscriptions
- **AND** cached data should prevent route changes from flashing empty states
- **AND** skeletons should reflect real missing or pending data, not artificial delays

#### Scenario: Route changes complete synchronously

- **WHEN** the user navigates between already-loaded workbench routes
- **THEN** the content surface may animate the route change with subtle motion
- **AND** the app does not show loading skeletons unless route data is actually missing or pending

### Requirement: Native runtime source boundaries

The Desktop native runtime SHALL keep source modules split by stable responsibility so local capabilities remain reviewable and testable.

#### Scenario: Runtime responsibilities are implemented

- **WHEN** the Desktop runtime owns settings, project scanning, worktree updates, dashboard projection, validation, task mutation, activity, or terminal capabilities
- **THEN** command/state orchestration is separated from projection, filesystem fingerprinting, task writing, validation, and activity recording modules
- **AND** source files are split before a hand-written module exceeds the repository maintainability guideline

### Requirement: Maintainable workbench modules

Workbench UI modules SHALL be split as behavior grows so individual files remain reviewable and testable.

#### Scenario: Source tree is organized

- **WHEN** app-shell, shared core, shared views, native runtime, or terminal source files are added or moved
- **THEN** folders express the owning domain or feature area
- **AND** filenames express focused responsibilities inside that domain
- **AND** repeated namespace prefixes are avoided when the parent directory already provides that context

#### Scenario: Workboard behavior expands

- **WHEN** workboards gain drag/drop, pagination, per-column scroll, persisted display modes, or issue-style workflows
- **THEN** card, column, toolbar, grouping, sorting, and mutation behavior are split into focused modules
- **AND** shared tests cover the projection and interaction contracts

#### Scenario: Terminal behavior expands

- **WHEN** terminal behavior adds more session controls, persistence, environment detection, or platform-specific behavior
- **THEN** UI state, command bridge, window layout, and xterm lifecycle remain separated into focused modules
