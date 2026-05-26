# Design

## Decision: Keep the Web stack available

The initial desktop shell preserved the existing Next.js web app and local Hono runtime so Tauri could be introduced as a desktop host and packaging boundary. The later `migrate-to-desktop-first-tauri-renderer` change supersedes the Hono-backed Desktop runtime assumption while keeping Next.js available as the Web target.

## Decision: Development shell first

The first Tauri integration SHALL target local development. Tauri dev mode SHALL load `http://localhost:3000` and run `pnpm dev`, which already starts the Next.js app and runtime server.

## Decision: Defer production packaging

The current app uses URL-backed dynamic detail routes. Production desktop packaging SHALL be handled in a later change by introducing a dedicated static Desktop renderer and routing/build strategy while preserving Next.js for the Web target.

## Risks

- Tauri requires a Rust toolchain and platform WebView prerequisites.
- Production bundling is not complete until the static Desktop renderer and runtime command/event strategy is specified.
- Desktop APIs must stay behind an adapter so the browser MVP remains usable.
