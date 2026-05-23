## Why

spec-ui needs a first product contract before replacing the default Next.js scaffold with a real tool. The MVP must establish the dashboard shell, local project selection, OpenSpec-first parsing, and realtime update behavior without locking the project into OpenSpec-only assumptions.

## What Changes

- Introduce an MVP dashboard shell inspired by dense operational tools: persistent sidebar, central work area, right detail inspector, command/search affordance, and realtime status surface.
- Let users choose a local project directory from the UI, with early Web builds using a local server-backed path picker/input.
- Persist the selected project binding in a runtime-managed JSON settings file so the app can restore the last active project on restart.
- Support OpenSpec as the first spec dialect while defining adapter boundaries for future dialects such as Spec Kit and Kiro.
- Add WebSocket-based realtime project update semantics backed by local file watching outside React UI components.
- Establish design-system requirements for shadcn/ui, semantic tokens, light default appearance, user-selectable dark mode, and restrained Motion animation.
- Align MVP visual behavior with the approved operational UI references instead of inventing a new product style in this change.
- Exclude open-source contribution documents from this change; they will be handled by a separate OpenSpec change.

## Capabilities

### New Capabilities

- `local-project-selection`: Covers UI-driven local directory selection, project binding state, validation, and empty/error states.
- `spec-dialect-adapters`: Covers the OpenSpec-first adapter contract and extensibility rules for additional spec-driven standards.
- `realtime-project-updates`: Covers WebSocket transport, local watcher responsibilities, event semantics, and connection states.
- `dashboard-mvp-shell`: Covers the primary app shell, navigation model, dashboard layout, detail inspector, command/search entry, design tokens, and theme behavior.

### Modified Capabilities

- None.

## Impact

- Affected app areas: Next.js app routes, global layout, dashboard shell components, design tokens, local project runtime APIs, local persistence, WebSocket runtime, and spec parsing/domain modules.
- Affected dependencies: shadcn/ui components added through the shadcn CLI, Motion for approved animation, and a verified cross-platform local file watcher package.
- Affected tests: UI layout/render tests, adapter contract tests, local project validation tests, WebSocket event tests, and parser projection tests.
- Operational constraints: local project filesystem access must stay behind server/runtime boundaries; React components must not read the filesystem directly.
