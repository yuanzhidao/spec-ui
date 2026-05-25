## ADDED Requirements

### Requirement: Specs-first app shell
The system SHALL present the usable Specs workbench as the first screen instead of a marketing, scaffold, or metric dashboard page.

#### Scenario: App opens
- **WHEN** the user opens the application
- **THEN** the user sees the spec-ui app shell with project addition or the unified Specs workboard

### Requirement: Three-region operational layout
The system SHALL provide a dense app shell with persistent navigation, a primary workboard area, and a detail inspector.

#### Scenario: Desktop viewport
- **WHEN** the dashboard renders on a desktop viewport
- **THEN** it displays sidebar navigation, a central workspace, and a right detail inspector without overlapping content

#### Scenario: Mobile or narrow viewport
- **WHEN** the dashboard renders on a narrow viewport
- **THEN** navigation and detail inspection remain accessible through responsive collapsed, drawer, or panel behavior

### Requirement: MVP navigation model
The system SHALL provide navigation entries for Specs, Changes, Projects, Activity, Validation, and Settings, plus a visible project collection in the sidebar.

#### Scenario: User navigates between sections
- **WHEN** the user selects a primary navigation item
- **THEN** the URL updates to that section route, the central workspace updates to the selected section, and the active navigation state is visible

#### Scenario: User refreshes a section route
- **WHEN** the user refreshes a section route such as `/settings` or `/projects`
- **THEN** the app restores that section instead of returning to the Specs first screen

#### Scenario: User uses browser navigation
- **WHEN** the user uses browser back or forward between section routes
- **THEN** the active section follows the URL route

#### Scenario: First project opens after addition
- **WHEN** the user adds the first supported local project directory
- **THEN** the central workspace defaults to the Specs workboard

#### Scenario: Project is selected from sidebar
- **WHEN** the user selects a project in the sidebar project collection
- **THEN** the current board focuses that project while keeping the same section semantics

#### Scenario: All projects is selected
- **WHEN** the user clears the focused project filter or selects All Projects
- **THEN** the current board returns to the unified all-projects view

#### Scenario: Sidebar project rows render
- **WHEN** projects are available in the sidebar project collection
- **THEN** each project row shows the project identity and compact status or count summaries for project specs and changes

#### Scenario: Sidebar add project entry is absent
- **WHEN** the sidebar renders
- **THEN** project creation or addition controls are not displayed in the sidebar

### Requirement: Validation section behavior
The system SHALL provide a Validation section with explicit validation status and manual validation action for the focused project.

#### Scenario: User opens validation section
- **WHEN** the user opens the Validation navigation item
- **THEN** the system displays the current validation state and an action to run validation for the focused project

#### Scenario: Project files changed after validation
- **WHEN** supported project files changed after the last validation result
- **THEN** the Validation section indicates that the current result is stale

### Requirement: Project data sections
The system SHALL render MVP sections for specs, changes, validation, activity, and settings using normalized multi-project data.

#### Scenario: Default Specs section opens
- **WHEN** the app opens with one or more added projects
- **THEN** the Specs section is active by default and no dashboard overview section is displayed

#### Scenario: Initial project data is loading
- **WHEN** the dashboard shell is waiting for the initial runtime snapshot
- **THEN** the app displays a stable loading transition instead of rendering project, specs, or changes empty states

#### Scenario: User opens Changes section
- **WHEN** the user opens the Changes navigation item without a focused project filter
- **THEN** the system displays Changes across all added projects in the same workboard style used by Specs, grouped into collapsible Active and Archive sections

#### Scenario: User opens focused project Changes
- **WHEN** the user opens Changes with a focused project selected
- **THEN** the system displays Changes for that project grouped into collapsible Active and Archive sections or an empty state when no changes exist

#### Scenario: Change lifecycle groups collapse with motion
- **WHEN** the user expands or collapses a Change lifecycle group
- **THEN** the group body animates open or closed with a restrained motion transition while preserving reduced-motion preferences

#### Scenario: User opens a Change detail
- **WHEN** the user activates a Change card from the Changes workboard
- **THEN** the URL updates to a project-scoped Change detail route with the persistent random project ID, Change ID, and lifecycle when needed, and the shell displays that Change while preserving the Changes navigation context

#### Scenario: Change detail renders
- **WHEN** a Change detail is available
- **THEN** the app displays a single top header bar with a back action, breadcrumb-style route context, Change identity, task progress, scope context when available, and MVP tabs for Overview, Tasks, Delta Specs, and Files below the header

#### Scenario: Detail content scrolls
- **WHEN** the user scrolls long Spec or Change detail content
- **THEN** the top route header remains visible and Change detail tabs remain available while the body content scrolls

#### Scenario: Change detail is missing
- **WHEN** the route targets a project or Change that is no longer available
- **THEN** the app displays a recoverable not-found state with a way back to the Changes workboard

#### Scenario: User opens Specs section
- **WHEN** the user opens the Specs navigation item without a focused project filter
- **THEN** the system displays specs across all added projects in a single full-width vertical stream of spec cards

#### Scenario: User opens focused project Specs
- **WHEN** the user opens Specs with a focused project selected
- **THEN** the system displays detected specs for that project in board form or an empty state when no specs exist

#### Scenario: User opens a Spec detail
- **WHEN** the user activates a Spec card from the Specs workboard
- **THEN** the URL updates to a project-scoped Spec detail route with the persistent random project ID and the shell displays that Spec while preserving the Specs navigation context

#### Scenario: Spec detail renders
- **WHEN** a Spec detail is available
- **THEN** the app displays a single top header bar with a back action, breadcrumb-style route context, Spec identity, project context, scope context when available, requirement count, and rendered markdown content below the header

#### Scenario: Spec detail is missing
- **WHEN** the route targets a project or Spec that is no longer available
- **THEN** the app displays a recoverable not-found state with a way back to the Specs workboard

#### Scenario: User opens Projects section
- **WHEN** the user opens the Projects navigation item
- **THEN** the system displays a projects page with project count, search/display controls, and project rows or cards showing scope count, specs count, Change completion progress, validation status, watcher status, and project issues

#### Scenario: User adds project from Projects section
- **WHEN** the user opens the Projects section
- **THEN** the add-project action is available from the page header or upper-right action area

#### Scenario: User manages a project row
- **WHEN** a project row or card is visible
- **THEN** the user can focus or unfocus that project, remove it from the collection, or open project settings

#### Scenario: User opens a project from Projects
- **WHEN** the user activates the main area of a project row or card
- **THEN** the app focuses that project and navigates to the Specs section

#### Scenario: User updates project directory
- **WHEN** the user opens project settings and saves a new local directory path
- **THEN** the runtime validates the path, keeps the existing project ID, refreshes project status, and updates the projects page

### Requirement: Focused project scope workboards
The system SHALL expose detected scopes inside a focused project without replacing the top-level single-column card stream model.

All Projects views SHALL remain single-column card streams. Focused project views SHALL keep the same single-column card stream while surfacing scope identity inside cards when useful.

#### Scenario: All Projects specs render with scoped projects
- **WHEN** the Specs workboard renders in All Projects mode and a project contains multiple scopes
- **THEN** specs remain in the shared card stream and each scoped spec card can show compact project and scope metadata

#### Scenario: Focused project specs render as cards with multiple scopes
- **WHEN** the Specs section renders for a focused project with multiple detected scopes
- **THEN** the workboard displays one full-width card stream and shows scope metadata inside spec cards

#### Scenario: Focused project changes render with multiple scopes
- **WHEN** the Changes section renders for a focused project with multiple detected scopes
- **THEN** the workboard displays one full-width aggregated Change card per lifecycle and Change ID inside the matching lifecycle group

#### Scenario: Scoped Change card renders progress
- **WHEN** an aggregated Change card has scoped child Changes
- **THEN** the card displays compact progress rows for the scopes where that Change exists, wrapping them with no more than four scoped progress items per row

#### Scenario: Scoped Change card omits absent scopes
- **WHEN** a Change ID exists in some detected scopes but not in another detected scope
- **THEN** the card omits the absent scope rather than creating a missing placeholder or synthetic Change

#### Scenario: Aggregated Change detail opens
- **WHEN** the user opens an aggregated Change from the focused project Changes board
- **THEN** the detail view groups Overview, Tasks, Delta Specs, and Files by scope while preserving a project-level summary

#### Scenario: Aggregated Change overview switches scope
- **WHEN** the Overview tab renders an aggregated Change with details from multiple scopes
- **THEN** the Overview panel displays scope tabs using the detected scope labels so the user can switch between root and nested scope overview content

#### Scenario: Aggregated Change tasks compare scopes
- **WHEN** the Tasks tab renders an aggregated Change with tasks from multiple scopes
- **THEN** the Tasks panel displays detected scopes as side-by-side task columns, with each scope column showing Todo tasks above Completed tasks

#### Scenario: Task columns overflow
- **WHEN** a task column contains more tasks than fit in the visible detail workspace
- **THEN** that column scrolls internally while the surrounding detail header, tabs, and neighboring columns remain visible

#### Scenario: Scoped task column has no Todo tasks
- **WHEN** a task status group has zero Todo tasks and one or more Completed tasks
- **THEN** the Tasks panel hides the empty Todo group and only displays the Completed group

#### Scenario: Single-scope Change tasks group by status
- **WHEN** the Tasks tab renders a Change with tasks from one scope
- **THEN** the Tasks panel displays Todo and Completed task groups as separate columns

#### Scenario: Aggregated Change delta specs switch scope
- **WHEN** the Delta Specs tab renders an aggregated Change with delta specs from multiple scopes
- **THEN** the Delta Specs panel displays scope tabs using the detected scope labels and shows only the selected scope's delta specs

#### Scenario: Aggregated Change files switch scope
- **WHEN** the Files tab renders an aggregated Change with markdown files from multiple scopes
- **THEN** the Files panel displays scope tabs using the detected scope labels and shows only the selected scope's files

#### Scenario: Single-scope focused project uses ordinary boards
- **WHEN** the focused project has only one detected scope
- **THEN** Specs and Changes use the existing project-scoped board and detail behavior without unnecessary scoped progress rows

### Requirement: Specs workboard behavior
The system SHALL render Specs as the primary operational surface, using a full-width card stream rather than summary metric tiles or narrow project columns.

#### Scenario: Specs workboard renders
- **WHEN** specs are available across added projects
- **THEN** the workboard renders a full-width vertical stream with stable card widths, readable metadata, item counts, and stacked spec cards

#### Scenario: Spec card renders
- **WHEN** a spec appears in the Specs workboard
- **THEN** its full-width card shows the spec identity, project context or scope context when useful, requirement count, and concise metadata without relying on large metric tiles

#### Scenario: Fixed-width metadata expands on hover
- **WHEN** a compact metadata label such as a project, scope, worktree, or checkout tag is truncated
- **THEN** the label uses a motion hover expansion to reveal more content while keeping the surrounding card layout stable

#### Scenario: Board controls render
- **WHEN** the Specs workboard is visible
- **THEN** the app exposes compact controls for search/filter, display preferences, and view mode without adding explanatory marketing copy

#### Scenario: Board sort mode changes
- **WHEN** the user changes the workboard sort mode
- **THEN** the app can sort Specs or Changes cards by local directory creation time by default, by local directory modification time descending, or by name when selected

#### Scenario: Empty stream renders
- **WHEN** no specs match the current project and filter context
- **THEN** the stream displays a compact empty state so the user can understand the current coverage

#### Scenario: User opens Activity section
- **WHEN** the user opens the Activity navigation item
- **THEN** the system displays recent normalized project events across all added projects or an empty state when no events are available

#### Scenario: User opens Settings section
- **WHEN** the user opens the Settings navigation item
- **THEN** the system displays a Settings workspace with secondary navigation and grouped settings panels

#### Scenario: Settings preferences render
- **WHEN** the user opens Settings Preferences
- **THEN** the system displays theme mode as visual Light, Dark, and System preview choices and language as compact choices in the content panel

#### Scenario: Settings runtime render
- **WHEN** the user opens Settings Runtime
- **THEN** the system displays runtime status information and focused project discovery state without exposing project management controls

#### Scenario: Project management location
- **WHEN** the user needs to add, remove, relocate, or focus projects
- **THEN** those controls are available from the Projects section rather than from Settings or sidebar chrome

### Requirement: Command and search entry
The system SHALL provide a command/search entry point in the dashboard shell.

#### Scenario: Command surface opens
- **WHEN** the user activates the command/search entry
- **THEN** the system displays a command/search surface for available app actions, projects, changes, specs, and other project entities

### Requirement: Design tokens and theme behavior
The system SHALL define semantic tokens for dashboard surfaces, sidebar, border, ring, brand, status, chart, and muted states.

#### Scenario: Light theme default
- **WHEN** the dashboard renders without an explicit theme preference
- **THEN** it uses the light theme as the default appearance

#### Scenario: Dark tokens available
- **WHEN** the application is rendered under dark theme conditions
- **THEN** semantic dark tokens provide readable foregrounds, surfaces, borders, and status colors

### Requirement: Theme mode control
The system SHALL provide a theme mode control for Light, Dark, and System preferences in the Settings page Preferences area.

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

### Requirement: Language preference control
The system SHALL provide a language preference control in the Settings page Preferences area.

Language preference SHALL be persisted in the runtime-managed settings file at `~/.spec-ui/settings.json`. English SHALL be the default and primary UI language. Chinese MAY be offered as a secondary language option, but UI copy SHALL NOT default to Chinese.

The UI SHALL read user-facing dashboard copy through a maintained i18n message layer rather than hard-coding copy directly inside feature components. The i18n layer SHALL use an established Next.js-compatible library. MVP dashboard sections SHALL provide both English and Chinese message coverage for visible copy, accessibility labels, empty states, dialog copy, and control labels.

#### Scenario: User selects Chinese
- **WHEN** the user selects Chinese language preference
- **THEN** supported UI copy switches to Chinese where translations are available

#### Scenario: User selects English
- **WHEN** the user selects English language preference
- **THEN** supported UI copy switches to English without requiring a page reload

#### Scenario: Language preference persists
- **WHEN** the user changes the language preference and reloads the app
- **THEN** the previously selected language preference remains active

### Requirement: shadcn and Motion usage
The system SHALL use shadcn/ui as the component foundation and Motion only for purposeful interaction transitions.

#### Scenario: Component added
- **WHEN** implementation needs a shadcn/ui component
- **THEN** the component is added through the official shadcn CLI rather than by manually editing package metadata

#### Scenario: Animation added
- **WHEN** the dashboard uses animation or transition effects
- **THEN** the motion is fast, purposeful, respects reduced-motion preferences, and does not hide critical status changes

### Requirement: Direction-aligned visual behavior
The system SHALL align MVP visual behavior with the approved operational UI direction and SHALL NOT introduce an independent product visual identity in this change.

#### Scenario: Dashboard shell is implemented
- **WHEN** the MVP dashboard shell is rendered
- **THEN** spacing, density, borderless sidebar treatment, project list behavior, board rhythm, and command/search behavior follow the approved product direction

#### Scenario: New visual style is proposed
- **WHEN** implementation requires a distinct spec-ui visual identity beyond semantic tokens and the approved product behavior
- **THEN** that visual identity is deferred to a separate approved OpenSpec change
