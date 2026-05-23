# Design

## Decision: Keep the web stack unchanged

The desktop shell SHALL preserve the existing Next.js web app and local Hono runtime. Tauri is introduced as a desktop host and packaging boundary, not as a replacement for the web UI stack.

## Decision: Development shell first

The first Tauri integration SHALL target local development. Tauri dev mode SHALL load `http://localhost:3000` and run `pnpm dev`, which already starts the Next.js app and runtime server.

## Decision: Defer production packaging

The current app uses URL-backed dynamic detail routes. A static Next export would either lose those routes or require a separate routing strategy. Production desktop packaging SHALL be handled in a later change, most likely by launching a runtime/web sidecar or by introducing a dedicated desktop routing/build strategy.

## Risks

- Tauri requires a Rust toolchain and platform WebView prerequisites.
- Production bundling is not complete until the runtime/web serving strategy is specified.
- Desktop APIs must stay behind an adapter so the browser MVP remains usable.
