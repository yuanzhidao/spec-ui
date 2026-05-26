## 1. OpenSpec

- [x] 1.1 Review the desktop-first architecture scope, non-goals, target boundaries, and affected release assumptions.
- [x] 1.2 Update product/technical context to describe Desktop as the primary runtime while preserving Next.js as the Web target.
- [x] 1.3 Validate `migrate-to-desktop-first-tauri-renderer`.

## 2. Target Architecture

- [x] 2.1 Define the workspace package layout for `packages/ui`, `packages/core`, `packages/views`, `apps/web`, and `apps/desktop`.
- [x] 2.2 Configure pnpm workspace package linking for shared packages and app shells.
- [x] 2.3 Add or define a static Desktop renderer target compatible with Tauri `frontendDist`.
- [x] 2.4 Keep Next.js as the Web target under a thin app shell.
- [x] 2.5 Extract shadcn/ui primitives, design tokens, and low-level shared hooks into `packages/ui`.
- [x] 2.6 Extract domain types, route semantics, i18n adapters, runtime client contracts, state/query hooks, and projection logic into `packages/core`.
- [x] 2.7 Extract Specs, Changes, Projects, Settings, and other shared product screens into `packages/views`.
- [x] 2.8 Add target-specific entrypoints only where platform wiring differs.
- [x] 2.9 Prevent shared packages from importing Next.js app APIs, Tauri APIs, or concrete router implementations directly.
- [x] 2.10 Use a Desktop app-shell memory router with navigation adapter subscription outside routed product views.

## 3. Desktop Runtime Bridge

- [x] 3.1 Define a typed runtime client interface in the shared core package.
- [x] 3.2 Implement the Desktop runtime client in the Desktop app shell with Tauri commands and events.
- [x] 3.3 Keep or adapt a Web runtime client in the Web app shell for Next.js/Web mode.
- [x] 3.4 Move settings persistence behind the Desktop command boundary.
- [x] 3.5 Move project scanning and OpenSpec parsing behind the Desktop command boundary.
- [x] 3.6 Move file watching and worktree realtime updates to Rust-managed events.
- [x] 3.7 Keep integrated terminal sessions controlled by the Rust process and connected through the runtime client.

## 4. Remove Desktop Server Packaging

- [x] 4.1 Stop packaging a Next.js server for Desktop production.
- [x] 4.2 Stop packaging a Hono runtime server for Desktop production.
- [x] 4.3 Stop embedding Node sidecars and npm staging `node_modules` for Desktop app startup.
- [x] 4.4 Update Tauri config so production uses static `frontendDist` and development uses the Desktop renderer `devUrl`.
- [x] 4.5 Update release scripts and CI expectations for the static renderer architecture.

## 5. Verification

- [x] 5.1 Add package-level unit tests for shared route semantics, runtime client contracts, i18n adapters, and projections where practical.
- [x] 5.2 Add Rust tests for command handlers that own settings, scanning, watcher, worktree, and terminal behavior.
- [x] 5.3 Verify shared packages build without importing target-only framework APIs.
- [x] 5.4 Verify the Desktop renderer works without a Next.js server or Hono server.
- [x] 5.5 Verify Web target still builds and uses the shared product packages.
- [x] 5.6 Verify pnpm workspace scripts run from the repository root.
- [x] 5.7 Run typecheck, lint, unit tests, desktop Rust tests, Web build, Desktop build, and `pnpm spec:validate`.
