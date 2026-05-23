## 1. Project Preparation

- [x] 1.1 Create the approved feature branch and dedicated worktree for implementation.
- [x] 1.2 Confirm package manager state and install approved UI/runtime dependencies through pnpm and official CLIs.
- [x] 1.3 Initialize shadcn/ui configuration and add only the components required by this change through the shadcn CLI.
- [x] 1.4 Add development process wiring for running Next.js and the local Hono runtime together.
- [x] 1.5 Verify and install `fast-glob` and `ignore` as the approved maintained directory scanning and ignore-rule dependencies for OpenSpec scope discovery.

## 2. Design System Foundation

- [x] 2.1 Replace scaffold global styling with semantic tokens for background, foreground, sidebar, card, border, ring, brand, status, and chart colors.
- [x] 2.2 Add light default theme behavior, dark token support, and persisted Settings-page Preferences for Light/Dark/System theme plus language.
- [x] 2.3 Add shared layout utilities and reduced-motion-safe transition helpers for approved Motion usage.

## 3. Local Project Runtime

- [x] 3.1 Verify and install the approved lightweight local server framework through pnpm.
- [x] 3.2 Create a server/runtime module for local project path validation, OpenSpec discovery, and project identity resolution across a project collection.
- [x] 3.3 Add API endpoints for adding, focusing, validating, removing, clearing, and rebinding local project directories.
- [x] 3.4 Implement schema validation for the runtime-managed JSON settings file.
- [x] 3.5 Persist project collection with random project IDs, focused project ID, theme preference, and language preference in `~/.spec-ui/settings.json` with atomic writes.
- [x] 3.6 Restore the last valid project collection on app restart while preserving recoverable invalid-project entries.
- [x] 3.7 Add automatic OpenSpec structure detection for `openspec/config.yaml`, `openspec/specs/`, `openspec/changes/`, and empty `openspec/` directories.
- [x] 3.8 Add recoverable error and empty states for unreadable, missing, no-spec, unsupported, or stale persisted project directories.
- [x] 3.9 Add tests for valid project addition, duplicate handling, invalid path handling, no-spec directory handling, OpenSpec detection, project focus behavior, project remove/clear behavior, restart restore behavior, invalid settings handling, language preference handling, and atomic settings writes.
- [x] 3.10 Add monorepo OpenSpec scope discovery that searches for `openspec` directories under one project root with deterministic root-first ordering.
- [x] 3.11 Prune dependency, build, hidden, worktree, reference, and inherited `.gitignore`-ignored directories during OpenSpec scope discovery.
- [x] 3.12 Add tests for root scope, nested scopes, nested-only scopes, ignored directories, root and nested `.gitignore` pruning, unreadable `.gitignore` recovery, no-scope projects, and deterministic ordering.

## 4. Spec Dialect Adapter

- [x] 4.1 Define the normalized `SpecDialectAdapter` and multi-project projection types used by the dashboard UI.
- [x] 4.2 Implement the OpenSpec adapter for active changes, specs, requirements, proposal/design/tasks presence, validation status, and activity projection.
- [x] 4.3 Add unsupported-dialect detection and recoverable adapter error states.
- [x] 4.4 Add validation status projection, including `not-run`, `running`, `passing`, `failing`, and `stale` states.
- [x] 4.5 Implement runtime validation command execution for OpenSpec projects with stdout, stderr, exit code, and timestamps.
- [x] 4.6 Add adapter, aggregation, focused-project filtering, and validation contract tests using small fixture projects.
- [x] 4.7 Extend normalized projection types with scope identity and scoped specs, changes, requirements, validation, and activity records.
- [x] 4.8 Aggregate same-id scoped Changes within one project while preserving per-scope details and progress.
- [x] 4.9 Add tests for scoped projection, same-id Change aggregation, single-scope behavior, and no cross-project aggregation.
- [x] 4.10 Project local directory modification timestamps for specs and active changes.

## 5. Realtime Runtime

- [x] 5.1 Verify and install the approved cross-platform watcher dependency through pnpm.
- [x] 5.2 Implement watcher lifecycle management for the project collection behind the local runtime boundary.
- [x] 5.3 Implement WebSocket endpoint, connection handling, and project collection subscription behavior in the local runtime server.
- [x] 5.4 Normalize realtime events with project path, dialect, event type, file path, timestamp, and optional entity id.
- [x] 5.5 Refresh affected per-project adapter projections when relevant realtime events arrive.
- [x] 5.6 Add tests for watcher event normalization, project collection changes, removed-project cleanup, disconnected state, required event fields, and irrelevant event filtering.
- [x] 5.7 Include scope identity in normalized watcher events when a changed file belongs to a detected scope.
- [x] 5.8 Refresh project scope discovery when `openspec/` directories are added, moved, or removed.
- [x] 5.9 Add tests for scoped watcher events, ignored directory changes, and scope rediscovery events.

## 6. Dashboard Shell UI

- [x] 6.1 Replace the default home page with the Specs-first app shell.
- [x] 6.2 Implement sidebar navigation for Specs, Changes, Projects, Activity, Validation, and Settings plus a borderless project collection area without sidebar add-project controls.
- [x] 6.3 Implement the central workspace, Specs-first multi-project workboard, focused project drill-down, and detail inspector responsive layout.
- [x] 6.4 Implement the project addition empty state and project collection identity display.
- [x] 6.5 Implement command/search entry for MVP actions, projects, changes, specs, and project entities.
- [x] 6.6 Implement visible realtime connection and per-project watcher status states.
- [x] 6.7 Implement the Validation section with status display and manual validation action for the focused project.
- [x] 6.8 Implement MVP section content for Specs, Changes, Projects, Activity, Validation, and Settings with multi-project empty states.
- [x] 6.9 Verify dashboard shell and MVP sections render correctly in Light, Dark, and System theme modes, including automatic OS theme changes while System mode is active.
- [x] 6.10 Review MVP spacing, density, borderless sidebar behavior, project list behavior, board rhythm, and command/search behavior against the approved reference direction.

## 7. Multi-Project Workbench

- [x] 7.1 Update runtime settings schema and migration handling from single active project to project collection plus focused project.
- [x] 7.2 Add project collection API operations for add, remove, focus, clear, and list.
- [x] 7.3 Aggregate per-project adapter outputs into unified dashboard, changes, specs, activity, and validation projections.
- [x] 7.4 Render sidebar project collection with status/count summaries and focused-project state.
- [x] 7.5 Render Specs as the default multi-project card stream with full-width cards, not metric tiles or narrow project columns.
- [x] 7.6 Render focused project Specs and Changes using the same single-column card semantics scoped to that project.
- [x] 7.7 Move theme controls into Settings Preferences and add language preference control with English default and Chinese secondary option.
- [x] 7.8 Update command/search to include projects and focus-project actions.
- [x] 7.9 Add tests for multi-project aggregation, focus filtering, project removal cleanup, settings persistence, and Preferences persistence.
- [x] 7.10 Add a Projects page with search/display controls and an upper-right add-project action.
- [x] 7.11 Redesign Settings as a secondary vertical navigation page with visual Preferences and runtime panels.
- [x] 7.12 Add URL-backed section routes so refresh and browser history preserve the active section.
- [x] 7.13 Install and wire the maintained i18n dependency with English and Chinese message files for shell-level copy.
- [x] 7.14 Add workboard sorting by local directory creation time by default, with a name sort option.
- [x] 7.15 Add stable loading transitions before the initial runtime snapshot resolves.
- [x] 7.16 Add project-scoped Change detail routes from Change cards.
- [x] 7.17 Project OpenSpec Change detail data for overview, tasks, delta specs, and files.
- [x] 7.18 Render Change detail with Overview, Tasks, Delta Specs, and Files tabs plus recoverable missing states.
- [x] 7.19 Add project-scoped Spec detail routes from Spec cards.
- [x] 7.20 Project OpenSpec Spec markdown content for detail rendering.
- [x] 7.21 Render Spec detail markdown with recoverable missing states.
- [x] 7.22 Enhance Projects page cards and rows with specs count, Change completion progress, validation status, watcher status, and project issues.
- [x] 7.23 Add per-project focus, remove, and settings actions.
- [x] 7.24 Add runtime project path repair that keeps the persistent project ID and reattaches discovery/watch state.
- [x] 7.25 Show detected scope count and compact scope summaries on Projects and All Projects workboard surfaces.
- [x] 7.26 Render focused-project Specs as full-width cards with scope metadata when the project has multiple detected scopes.
- [x] 7.27 Render focused-project Changes as ordinary aggregated Change cards instead of a scope matrix.
- [x] 7.28 Render compact scoped progress rows inside Change cards, wrap scoped progress at four items per row, and omit absent scopes.
- [x] 7.29 Update Change detail to group aggregated Change content by scope while preserving a project-level summary.
- [x] 7.30 Add scope tabs inside aggregated Change Overview so root and nested scope overview content can be switched directly.
- [x] 7.31 Add status-grouped task columns for single-scope Changes and side-by-side scoped task columns with Todo above Completed inside aggregated Change Tasks, hiding empty Todo groups when completed tasks exist.
- [x] 7.32 Add scope tabs inside aggregated Change Delta Specs and Files.
- [x] 7.33 Navigate from Projects row/card activation to focused Specs.
- [x] 7.34 Collapse Spec and Change detail chrome into a single breadcrumb-style top header with integrated back action and Change progress.
- [x] 7.35 Keep route header and Change detail tabs visible while detail body content scrolls.
- [x] 7.36 Make Change task board columns scroll internally when their card stacks overflow.
- [x] 7.37 Keep single-scope projects on the existing project-scoped board/detail behavior.
- [x] 7.38 Add modification-time descending as a workboard sort option.
- [x] 7.39 Move project management ownership out of Settings so add, remove, relocate, and focus controls live on the Projects section.
- [x] 7.40 Require MVP dashboard copy to use the i18n message layer with English and Chinese coverage.
- [x] 7.41 Split dashboard section implementation into focused feature directories instead of one oversized component file.

## 8. Verification

- [x] 8.1 Run typecheck and lint for the affected Next.js app.
- [x] 8.2 Run unit tests covering runtime, adapter, aggregation, settings, and realtime behavior.
- [x] 8.3 Use browser verification for desktop and narrow viewport layouts, including no overlapping text or controls.
- [x] 8.4 Run `openspec validate define-dashboard-mvp-shell` before requesting implementation completion review.
- [x] 8.5 Re-run typecheck, lint, unit tests, and OpenSpec validation after monorepo scope implementation.
- [x] 8.6 Browser-check single-scope, multi-scope, nested-only, and no-scope projects in Light, Dark, and System theme modes.
