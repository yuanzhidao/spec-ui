# Design

## Verified Tauri Guidance

Tauri's frontend configuration documentation says Tauri conceptually acts as a static web host: production apps should provide a directory containing HTML, CSS, JavaScript, and related assets for the webview. It also states that Tauri does not natively support server-based frontend alternatives such as SSR.

Tauri's Next.js guide supports Next through static export: Next must use `output: 'export'`, and Tauri loads the generated `out` directory. This is different from starting a bundled Next.js server.

The Vite integration guide shows the expected shape for React-style SPA apps: `devUrl` points to the Vite dev server during development, while `frontendDist` points to the built static assets for production. The guide also recommends `strictPort: true`, preserving Rust errors by disabling Vite's clear-screen behavior, and ignoring `src-tauri` from Vite's watcher.

Tauri's runtime authority documentation confirms that webview calls to commands are checked against origins, capabilities, and scopes before reaching Rust commands. That makes native command/event APIs the right boundary for local filesystem and shell capabilities.

## Decision: Desktop-first, not desktop-only

Tauri Desktop SHALL be the primary product runtime for local workbench workflows. Next.js SHALL remain in the repository as the Web target so the same product can later support browser-only and cloud-hosted workflows.

This is not a fork into two applications. Shared UI, domain models, parser/adapters, i18n messages, and product state projections SHOULD live in modules that can be used by both the Next.js Web target and the Tauri Desktop renderer.

## Decision: Shared packages, thin app shells

The shared product implementation SHALL move into workspace packages rather than living inside the Next.js `app/` tree. The target structure SHOULD use these boundaries:

- `packages/ui`: design tokens, shadcn/ui components, low-level primitives, shared hooks, and visual utilities.
- `packages/core`: domain types, parser/adapters, runtime client contracts, state/query hooks, route semantics, i18n adapters, and pure projection logic.
- `packages/views`: product pages and feature views such as Specs, Changes, Projects, Settings, and shared terminal surfaces.
- `apps/web`: Next.js route wrappers, metadata, hosted/Web-only wiring, and Web runtime client implementation.
- `apps/desktop`: Vite renderer entrypoint, client-side router, Tauri runtime client implementation, and desktop-only chrome or platform wiring.

Framework-specific imports SHALL stay out of shared packages unless the package is explicitly target-specific. Shared view components SHALL NOT import `next/navigation`, Next route handlers, Tauri APIs, or router implementation APIs directly. They SHALL use shared adapters such as navigation and runtime-client interfaces.

pnpm workspaces SHALL manage these packages and app shells. Package metadata and workspace configuration SHALL be introduced through approved package-manager or scaffolding workflows where possible, and manual package metadata edits SHALL stay limited to workspace structure that package tooling cannot reasonably infer.

## Decision: Static desktop renderer

The desktop app SHALL use a static renderer bundle in production. The renderer SHOULD be built with Vite because spec-ui Desktop is a local SPA-style workbench with dynamic project state, Tauri commands/events, and client-side routing. Next static export remains an official Tauri-compatible option, but it would make Desktop inherit Next export restrictions without providing clear value for local-only desktop workflows.

Tauri production config SHALL use `frontendDist` to load the desktop renderer's built assets. Tauri development config SHALL use a fixed `devUrl` pointing at the renderer dev server. The renderer dev server SHALL use a strict port and SHALL ignore `src-tauri` in its watcher configuration.

The renderer SHALL NOT require SSR, Next.js API routes, or a local HTTP frontend server to launch in packaged desktop builds.

## Decision: Keep Next.js as Web target

Next.js SHALL continue to own the Web target. Web builds may keep URL-backed routes, metadata, and future cloud-hosted behavior. Desktop routing SHALL use a React Router memory router in the Desktop app shell, with the navigation adapter subscribing to router state outside the routed product views. This keeps Desktop routing compatible with a static renderer while preserving existing route semantics from the user's point of view.

Shared screens SHALL be extracted into packages so editing the dashboard UI affects both Web and Desktop where the feature exists in both targets.

Shared product components SHOULD be client-compatible. Next.js server components, route handlers, metadata, and hosted-only behavior SHOULD stay in thin Web-target wrappers so Desktop can reuse the same product screens inside a static renderer.

## Decision: Tauri command/event runtime boundary

Desktop local capabilities SHALL move behind Tauri commands and events:

- project collection and settings persistence;
- local project scanning and OpenSpec parsing;
- file watching and realtime refresh events;
- worktree discovery and projection;
- validation command execution when in scope;
- integrated terminal session management.

The frontend SHALL call a typed runtime client interface. The Desktop implementation SHALL use Tauri commands/events. The Web implementation MAY keep an HTTP/WebSocket runtime client while Web mode remains local-server backed.

The shared runtime client contract SHALL live outside both app shells. React components SHALL depend on that contract rather than directly calling `fetch`, Hono endpoints, Tauri `invoke`, or event APIs.

## Decision: Hono exits the desktop runtime path

Hono SHALL NOT remain a required desktop runtime process after the Tauri runtime bridge provides equivalent capabilities. Hono MAY remain temporarily during migration only behind the Web runtime client or as compatibility code until the covered command/event APIs are complete.

Desktop release builds SHALL NOT package a Hono server, Next.js server, Node sidecar, npm staging `node_modules`, or loopback ports for app startup once this migration is complete.

This decision supersedes the earlier release-packaging assumption that packaged Desktop starts a bundled Next.js server and local Hono runtime server.

## Decision: Incremental migration sequence

The first implementation step SHOULD establish the new target boundaries before rewriting internals:

1. Add the desktop renderer target and Tauri static asset packaging.
2. Create workspace package boundaries for `packages/ui`, `packages/core`, and `packages/views`, with thin app shells in `apps/web` and `apps/desktop`.
3. Configure pnpm workspace linking and package build/test scripts.
4. Move shared design primitives, product views, domain types, route semantics, i18n, and projection logic into those packages.
5. Introduce a typed runtime client abstraction.
6. Implement Tauri commands/events for settings and project scanning.
7. Move watcher/worktree realtime updates to Rust events.
8. Keep terminal under Rust PTY management and connect it through the same command/event pattern.
9. Remove desktop dependencies on Hono, Node sidecars, and Next server packaging.

## Risks

- Maintaining one product UI across Next.js and Vite requires clean package boundaries and strict adapter usage.
- Next.js server components, server-only APIs, and route handlers cannot be used inside the static desktop renderer.
- Rust command/event coverage must be complete before removing the desktop Hono path.
- File watching, validation, and terminal APIs need capability scopes and recoverable error reporting to avoid exposing broad local access.
- The release flow and CI matrix must change after desktop no longer packages Node runtime pieces.
- The repository move from a single package to a pnpm workspace can create large diffs; implementation should be split into reviewable commits by package boundary and runtime boundary.
