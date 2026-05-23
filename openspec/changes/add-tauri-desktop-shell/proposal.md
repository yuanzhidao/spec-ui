# Add Tauri Desktop Shell

## Why

spec-ui is planned as a desktop-first local workbench after the web MVP. The current app already separates the browser UI from a local Hono runtime, so the first desktop step should add a thin Tauri shell without replacing the Next.js UI or rewriting the runtime.

## What Changes

- Add a Tauri v2 desktop shell under `src-tauri/`.
- Keep the existing Next.js, React, TypeScript, shadcn/ui, next-intl, and Hono runtime stack.
- Add pnpm desktop scripts for launching and inspecting the Tauri shell.
- Use Tauri dev mode to load the existing local Next.js dev URL at `http://localhost:3000`.
- Let Tauri start the existing `pnpm dev` command for development, which runs both the web app and the local runtime.
- Defer production sidecar packaging and runtime migration to a later change.

## Non-Goals

- Do not rewrite the local runtime in Rust.
- Do not switch the web app to static export while dynamic detail routes remain URL-backed.
- Do not add production installers or code signing in this change.
