# Add Tauri Desktop Shell

## Why

spec-ui is planned as a desktop-first local workbench after the web MVP. The first desktop step added a thin Tauri shell around the existing Web/runtime architecture so desktop development could start before the desktop runtime boundary was redesigned.

## What Changes

- Add a Tauri v2 desktop shell under `src-tauri/`.
- Keep the existing Next.js, React, TypeScript, shadcn/ui, and next-intl Web stack for the initial shell.
- Treat the existing Hono runtime as transitional after `migrate-to-desktop-first-tauri-renderer`.
- Add pnpm desktop scripts for launching and inspecting the Tauri shell.
- Use Tauri dev mode to load the existing local Next.js dev URL at `http://localhost:3000`.
- Let Tauri start the existing `pnpm dev` command for development, which runs both the web app and the local runtime.
- Defer production sidecar packaging and runtime migration to a later change.

## Non-Goals

- Do not remove Next.js from the Web target.
- Do not create a separate product UI for Desktop.
- Do not add production installers or code signing in this change.
