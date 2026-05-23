## 1. Project Preparation

- [ ] 1.1 Create the approved feature branch and dedicated worktree for implementation.
- [ ] 1.2 Confirm package manager state and install approved UI/runtime dependencies through pnpm and official CLIs.
- [ ] 1.3 Initialize shadcn/ui configuration and add only the components required by this change through the shadcn CLI.
- [ ] 1.4 Add development process wiring for running Next.js and the local Hono runtime together.

## 2. Design System Foundation

- [ ] 2.1 Replace scaffold global styling with semantic tokens for background, foreground, sidebar, card, border, ring, brand, status, and chart colors.
- [ ] 2.2 Add light default theme behavior, dark token support, and a persisted Light/Dark/System theme mode control.
- [ ] 2.3 Add shared layout utilities and reduced-motion-safe transition helpers for approved Motion usage.

## 3. Local Project Runtime

- [ ] 3.1 Verify and install the approved lightweight local server framework through pnpm.
- [ ] 3.2 Create a server/runtime module for local project path validation, OpenSpec discovery, and project identity resolution.
- [ ] 3.3 Add API endpoints for selecting, validating, clearing, and rebinding a local project directory.
- [ ] 3.4 Implement schema validation for the runtime-managed JSON settings file.
- [ ] 3.5 Persist active project binding and theme preference in `~/.spec-ui/settings.json` with atomic writes.
- [ ] 3.6 Restore the last valid project binding on app restart.
- [ ] 3.7 Add automatic OpenSpec structure detection for `openspec/config.yaml`, `openspec/specs/`, `openspec/changes/`, and empty `openspec/` directories.
- [ ] 3.8 Add recoverable error and empty states for unreadable, missing, no-spec, unsupported, or stale persisted project directories.
- [ ] 3.9 Add tests for valid project binding, invalid path handling, no-spec directory handling, OpenSpec detection, project switch behavior, clear behavior, restart restore behavior, invalid settings handling, and atomic settings writes.

## 4. Spec Dialect Adapter

- [ ] 4.1 Define the normalized `SpecDialectAdapter` types used by the dashboard UI.
- [ ] 4.2 Implement the OpenSpec adapter for active changes, specs, requirements, proposal/design/tasks presence, validation status, and activity projection.
- [ ] 4.3 Add unsupported-dialect detection and recoverable adapter error states.
- [ ] 4.4 Add validation status projection, including `not-run`, `running`, `passing`, `failing`, and `stale` states.
- [ ] 4.5 Implement runtime validation command execution for OpenSpec projects with stdout, stderr, exit code, and timestamps.
- [ ] 4.6 Add adapter and validation contract tests using small fixture projects.

## 5. Realtime Runtime

- [ ] 5.1 Verify and install the approved cross-platform watcher dependency through pnpm.
- [ ] 5.2 Implement watcher lifecycle management behind the local runtime boundary.
- [ ] 5.3 Implement WebSocket endpoint, connection handling, and project subscription behavior in the local runtime server.
- [ ] 5.4 Normalize realtime events with project path, dialect, event type, file path, timestamp, and optional entity id.
- [ ] 5.5 Refresh affected adapter projections when relevant realtime events arrive.
- [ ] 5.6 Add tests for watcher event normalization, project switching, disconnected state, required event fields, and irrelevant event filtering.

## 6. Dashboard Shell UI

- [ ] 6.1 Replace the default home page with the dashboard-first app shell.
- [ ] 6.2 Implement sidebar navigation for Dashboard, Changes, Specs, Validation, Activity, and Settings.
- [ ] 6.3 Implement the central workspace and right detail inspector responsive layout.
- [ ] 6.4 Implement the project selection empty state and active project identity display.
- [ ] 6.5 Implement command/search entry for MVP actions and project entities.
- [ ] 6.6 Implement visible realtime connection and watcher status states.
- [ ] 6.7 Implement the Validation section with status display and manual validation action.
- [ ] 6.8 Implement MVP section content for Dashboard, Changes, Specs, Activity, and Settings with empty states.
- [ ] 6.9 Verify dashboard shell and MVP sections render correctly in Light, Dark, and System theme modes, including automatic OS theme changes while System mode is active.
- [ ] 6.10 Review MVP spacing, density, sidebar behavior, panel rhythm, and command/search behavior against the approved reference direction.

## 7. Verification

- [ ] 7.1 Run typecheck and lint for the affected Next.js app.
- [ ] 7.2 Run unit tests covering runtime, adapter, and realtime behavior.
- [ ] 7.3 Use browser verification for desktop and narrow viewport layouts, including no overlapping text or controls.
- [ ] 7.4 Run `openspec validate define-dashboard-mvp-shell` before requesting implementation completion review.
