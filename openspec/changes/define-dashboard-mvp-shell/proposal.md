## Why

spec-ui needs a first product contract before replacing the default Next.js scaffold with a real tool. The MVP must establish the dashboard shell, local project collection, OpenSpec-first parsing, and realtime update behavior without locking the project into OpenSpec-only assumptions.

## What Changes

- Introduce an MVP Specs-first shell inspired by dense operational tools: persistent sidebar, central workboard, right detail inspector, command/search affordance, and realtime status surface.
- Let users add local project directories from the UI, with early Web builds using a local server-backed path picker/input.
- Detect multiple OpenSpec scopes inside one added local project directory so monorepos can be managed as one project while preserving per-scope status.
- Persist the local project collection, focused project, theme preference, and language preference in a runtime-managed JSON settings file so the app can restore the unified workbench on restart.
- Present Specs as the first screen and primary unified card stream; present Changes with the same single-column card semantics and project-focused drill-down.
- Aggregate same-id Changes across detected scopes inside a focused project and present scoped progress inside each Change card rather than duplicating the project as separate entries.
- Add a dedicated Projects page for project browsing and project addition, keeping add-project controls out of the sidebar.
- Support OpenSpec as the first spec dialect while defining adapter boundaries for future dialects such as Spec Kit and Kiro.
- Add WebSocket-based realtime project update semantics backed by local file watching outside React UI components.
- Establish design-system requirements for shadcn/ui, semantic tokens, light default appearance, Settings-page preferences for theme and language, user-selectable dark mode, and restrained Motion animation.
- Align MVP visual behavior with the approved operational UI direction instead of inventing a new product style in this change.
- Exclude open-source contribution documents from this change; they will be handled by a separate OpenSpec change.

## Capabilities

### New Capabilities

- `local-project-selection`: Covers UI-driven local directory selection, project binding state, validation, and empty/error states.
- `spec-dialect-adapters`: Covers the OpenSpec-first adapter contract, scoped projection, Change aggregation, and extensibility rules for additional spec-driven standards.
- `realtime-project-updates`: Covers WebSocket transport, local watcher responsibilities, scoped event semantics, and connection states.
- `dashboard-mvp-shell`: Covers the primary app shell, navigation model, Specs-first single-column card layout, focused-project scoped cards, detail inspector, command/search entry, design tokens, and theme behavior.

### Modified Capabilities

- None.

## Impact

- Affected app areas: Next.js app routes, global layout, dashboard shell components, design tokens, local project runtime APIs, local persistence, WebSocket runtime, multi-project projections, monorepo scope discovery, Change aggregation, and spec parsing/domain modules.
- Affected dependencies: shadcn/ui components added through the shadcn CLI, Motion for approved animation, a verified cross-platform local file watcher package, and a verified maintained directory walking/glob package for OpenSpec scope discovery.
- Affected tests: UI layout/render tests, adapter contract tests, local project validation tests, WebSocket event tests, and parser projection tests.
- Operational constraints: local project filesystem access must stay behind server/runtime boundaries; React components must not read the filesystem directly.
