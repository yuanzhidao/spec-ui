# desktop-runtime-architecture Specification

## ADDED Requirements

### Requirement: Desktop-first product runtime

The system SHALL treat Tauri Desktop as the primary runtime for local spec-ui workbench workflows.

#### Scenario: Desktop user launches spec-ui

- **WHEN** a user launches the packaged desktop app
- **THEN** the app opens without requiring an external browser
- **AND** local project reading, filesystem watching, worktree projection, settings, and terminal features are owned by the desktop runtime boundary

#### Scenario: Web target remains available

- **WHEN** the project builds or runs the Web target
- **THEN** Next.js remains available for browser-based and future cloud-hosted workflows
- **AND** Web support is not removed as part of the Desktop-first architecture

### Requirement: Shared product code across targets

The system SHALL preserve one shared product implementation for Web and Desktop surfaces where the same feature exists in both targets.

#### Scenario: Shared dashboard UI changes

- **WHEN** a maintainer changes shared dashboard UI, i18n text, route semantics, or product state projection code
- **THEN** the change is usable by both the Next.js Web target and the Tauri Desktop renderer
- **AND** target-specific entrypoints contain only platform wiring that cannot be shared

#### Scenario: Shared packages are created

- **WHEN** the Desktop-first architecture is implemented
- **THEN** reusable UI primitives live in a shared UI package
- **AND** domain types, runtime contracts, route semantics, i18n adapters, state/query hooks, and projection logic live in a shared core package
- **AND** shared product pages and feature views live in a shared views package
- **AND** Web and Desktop app shells import those packages instead of duplicating product UI

#### Scenario: Workspace packages are managed

- **WHEN** the repository is reorganized for shared packages
- **THEN** pnpm workspace configuration links the shared packages and app shells
- **AND** root-level scripts can run typecheck, lint, tests, Web build, and Desktop build across the workspace

#### Scenario: Shared package imports are checked

- **WHEN** shared packages are built or tested
- **THEN** they do not import Next.js app APIs, Tauri APIs, or concrete router implementations directly
- **AND** platform behavior enters shared views through adapters

#### Scenario: Platform-only capability is rendered

- **WHEN** a feature depends on desktop-only local capabilities such as PTY terminal control
- **THEN** the shared UI accesses it through a target-aware runtime client
- **AND** Web mode does not expose unavailable local shell or filesystem capabilities

### Requirement: Static Tauri renderer

The packaged desktop app SHALL load static renderer assets through Tauri instead of starting a frontend server.

#### Scenario: Desktop production starts

- **WHEN** the packaged desktop app starts
- **THEN** Tauri loads local static renderer assets from `frontendDist`
- **AND** the app does not start a bundled Next.js server to render the desktop UI
- **AND** the app does not require a loopback frontend server before opening the main window

#### Scenario: Desktop development starts

- **WHEN** a developer starts the desktop app in development mode
- **THEN** Tauri loads the Desktop renderer from a fixed `devUrl`
- **AND** the renderer development server uses a strict port
- **AND** the renderer watcher ignores `src-tauri` to avoid recursive rebuild or watcher growth

### Requirement: Next.js Web target

The system SHALL keep Next.js as the Web target while preventing Desktop production from depending on Next.js server startup.

#### Scenario: Web app builds

- **WHEN** the Web target is built
- **THEN** Next.js builds the browser/cloud-targeted app
- **AND** Web routes and future hosted behavior remain in scope for that target

#### Scenario: Desktop app builds

- **WHEN** the Desktop target is built
- **THEN** the Desktop renderer uses static assets compatible with Tauri
- **AND** it does not rely on Next.js route handlers, SSR, or server components at runtime

#### Scenario: Desktop route changes

- **WHEN** the Desktop renderer navigates between dashboard routes
- **THEN** a client-side memory router owns route state inside the Desktop app shell
- **AND** the shared navigation adapter subscribes to the router state outside routed product views
- **AND** shared views receive navigation through the adapter instead of importing a concrete router implementation

### Requirement: Tauri command and event runtime bridge

The Desktop renderer SHALL communicate with local runtime capabilities through Tauri commands and events.

#### Scenario: UI requests local project data

- **WHEN** the Desktop renderer needs project, spec, change, settings, worktree, validation, or terminal data
- **THEN** it calls a typed runtime client
- **AND** the Desktop runtime client invokes Tauri commands or listens to Tauri events instead of calling a local Hono HTTP endpoint

#### Scenario: Runtime emits project updates

- **WHEN** a watched project, checkout, or OpenSpec artifact changes on disk
- **THEN** the Rust runtime emits a typed event to the renderer
- **AND** the renderer updates the visible dashboard without polling a local HTTP server

#### Scenario: Capability permission is enforced

- **WHEN** the Desktop renderer invokes a local command
- **THEN** Tauri capabilities and command scopes control which window or origin may access that command
- **AND** recoverable permission or filesystem errors are reported to the UI without crashing the app

### Requirement: Hono removed from Desktop production path

The system SHALL NOT require a Hono runtime server for packaged Desktop startup after the Desktop runtime bridge is complete.

#### Scenario: Packaged desktop app starts after migration

- **WHEN** a user launches the packaged desktop app
- **THEN** no Hono process is started for Desktop production behavior
- **AND** no Node sidecar is required to host local runtime HTTP or WebSocket APIs

#### Scenario: Web mode still needs a runtime transport

- **WHEN** the Web target runs in a mode that needs local project data
- **THEN** it may use a Web-compatible runtime transport
- **AND** that transport remains separate from the packaged Desktop startup path

### Requirement: Desktop release packaging without Node server sidecars

The Desktop release flow SHALL package the static renderer and native Tauri runtime without embedding Node server processes for app startup.

#### Scenario: Desktop artifact is produced

- **WHEN** the release workflow builds a Desktop artifact
- **THEN** the artifact includes the static renderer assets and Tauri binary
- **AND** it does not include a Next.js server bundle for Desktop UI startup
- **AND** it does not include npm-installed server `node_modules` for Desktop startup

#### Scenario: Desktop startup avoids frontend port coordination

- **WHEN** the packaged desktop app starts
- **THEN** the app does not allocate a loopback port for a frontend server
- **AND** the main window can be created after native runtime initialization without waiting for a Next.js service health check
