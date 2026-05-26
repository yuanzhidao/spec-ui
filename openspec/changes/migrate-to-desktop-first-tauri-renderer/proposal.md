# Migrate To Desktop-First Tauri Renderer

## Why

spec-ui is primarily a local workbench for spec-driven development. Its core workflows read local project directories, watch filesystem changes, manage worktrees, and provide an integrated terminal. Those capabilities fit a desktop-first Tauri architecture better than a packaged Next.js server plus local Node runtime.

The current desktop release path embeds a Next.js server, a Hono runtime server, and a Node sidecar. That keeps the Web MVP running, but it creates release fragility, larger artifacts, dependency-staging complexity, and startup failure modes that Tauri is designed to avoid.

## What Changes

- Make Tauri desktop the primary product runtime.
- Keep Next.js as the Web target for future browser and cloud-hosted use cases.
- Preserve one shared React product codebase for Web and Desktop surfaces instead of maintaining separate UI implementations.
- Extract shared product code into workspace packages so framework entrypoints stay thin.
- Add a Vite-based static desktop renderer target unless a later approved design selects a better Tauri-compatible renderer strategy.
- Configure Tauri production builds to load local static renderer assets through `frontendDist`, not a bundled Next.js server.
- Move local runtime capabilities behind Tauri commands and events, with Rust as the desktop authority for project scanning, settings, file watching, worktree projection, and terminal sessions.
- Remove Hono from the desktop runtime path after equivalent Tauri command/event APIs exist.
- Keep Web mode free to use Next.js and a Web-compatible runtime transport when that target is active.
- Replace Node sidecar packaging for desktop Web/runtime servers with static renderer packaging and native Tauri runtime APIs.

## Non-Goals

- Do not remove Next.js from the project.
- Do not create a second product UI that diverges from the Web UI.
- Do not make the Next.js `app/` directory the shared product layer.
- Do not rewrite every runtime capability in one step before establishing the renderer/runtime boundary.
- Do not add cloud hosting, accounts, remote synchronization, or hosted backend services in this change.
- Do not change visual design beyond what is required to preserve existing screens in the new desktop target.
