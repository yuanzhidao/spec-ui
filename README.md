# spec-ui

spec-ui is a local dashboard for spec-driven development.

It turns local OpenSpec projects into a real-time workspace for reviewing changes, specs, tasks, files, and validation state.

**English | [简体中文](./README.zh-CN.md)**

## What Is spec-ui?

Spec-driven projects often spread planning context across changes, specs, task lists, deltas, and validation output. spec-ui turns that local project structure into a dashboard that is easier to scan, navigate, and review.

spec-ui does not replace OpenSpec. It gives local spec files a visual workspace, with project navigation, progress views, and live updates.

The first supported workflow is OpenSpec:

- Add one or more local project directories.
- Detect OpenSpec workspaces automatically, including nested monorepo scopes.
- Track changes, specs, task progress, files, and validation state.
- Watch local files and update the dashboard in real time.
- Move between all projects and focused project views without losing context.

Additional spec formats are planned for later releases.

## Preview

**Changes board**

<p align="center">
  <img src="docs/assets/changes.png" alt="spec-ui changes board" width="900">
</p>

**Change tasks**

<p align="center">
  <img src="docs/assets/tasks.png" alt="spec-ui change tasks view" width="900">
</p>

## Current Status

spec-ui is early preview software. The current build focuses on OpenSpec projects, multi-project dashboards, monorepo scope detection, real-time local updates, and a desktop preview with an integrated terminal.

Some UI flows and desktop behavior may continue to change before a stable release.

| Area | Status |
| --- | --- |
| Web dashboard | Preview |
| OpenSpec support | Available |
| Multi-project dashboard | Available |
| Monorepo scope detection | Available |
| Realtime local updates | Available |
| Desktop app with terminal | Preview |
| Additional spec dialects | Planned |

## Core Features

- **Project dashboard**: manage multiple local projects from one workspace.
- **Change board**: scan OpenSpec changes with progress, scope, task, spec, and file context.
- **Spec board**: browse specs across projects and drill into a focused project.
- **Monorepo scopes**: detect nested `openspec` directories and group matching change IDs under one project.
- **Realtime updates**: file changes are watched by the local runtime and pushed to the UI over WebSocket.
- **Local settings**: project state and preferences are stored locally in `~/.spec-ui/settings.json`.
- **Theme and language preferences**: light, dark, and system theme support.
- **Desktop terminal**: open a persistent terminal in the focused project directory, so tools such as `codex`, `claude`, and other local CLIs can start from the right workspace quickly.

## User Workflow

1. Start spec-ui locally.
2. Open **Projects** and add a local project directory.
3. spec-ui detects OpenSpec structure in the selected directory.
4. Open **Changes** to review active changes, tasks, scopes, deltas, specs, and files.
5. Open **Specs** to browse project specs.
6. In the desktop app, open the terminal from the lower-right launcher to run local CLI tools in the focused project directory.
7. Use **Settings** for appearance and language preferences.

For monorepos, add the repository root. spec-ui detects nested `openspec` directories and displays each scope only when it exists.

## Stack

| Layer | Technology |
| --- | --- |
| Web app | Next.js, React, TypeScript |
| UI | shadcn/ui, Base UI primitives, Motion |
| Local runtime | Hono, WebSocket, file watcher |
| Spec planning | OpenSpec |
| Desktop shell | Tauri v2 |
| Package manager | pnpm |
| Tests | Vitest, TypeScript, ESLint |

## Architecture

```text
┌────────────────────┐
│   Next.js Web UI   │
│ boards, settings,  │
│ project navigation │
└─────────┬──────────┘
          │ HTTP + WebSocket
┌─────────▼──────────┐
│   Local Runtime    │
│ Hono API, watcher, │
│ settings store     │
└─────────┬──────────┘
          │ local file access
┌─────────▼──────────┐
│  Project Folders   │
│ openspec changes,  │
│ specs, tasks, docs │
└────────────────────┘

┌────────────────────┐
│   Tauri Shell      │
│ desktop container  │
│ and terminal PTY   │
└────────────────────┘
```

The runtime owns local file access, directory discovery, settings persistence, and file watching. React components consume structured project data instead of reading the filesystem directly.

The desktop app owns integrated terminal sessions through Tauri and a Rust-managed PTY. Terminal sessions stay alive while navigating inside the app, and new sessions start in the currently focused project directory when one is selected.

## Requirements

- Node.js 22 or newer.
- pnpm 10 or newer.
- OpenSpec CLI available on `PATH` for OpenSpec validation.
- Rust stable toolchain for Tauri desktop work.
- Xcode Command Line Tools on macOS for Tauri development.

## Run From Source

```bash
pnpm install
pnpm dev
```

The default development command starts both the Next.js app and the local runtime.

Open http://localhost:3000 after the dev server starts.

## Desktop Development

The Tauri shell currently loads the local Web app during development.

In desktop mode, spec-ui also includes an integrated terminal for quickly starting project-local CLI tools, for example:

```bash
codex
claude
```

New terminal sessions use the focused project directory as `cwd`. If no project is focused, sessions start in the user's home directory.

```bash
source "$HOME/.cargo/env"
pnpm desktop:dev
```

## Desktop Release Artifacts

Release tags use `vX.Y.Z`, starting with `v0.0.1`. Preview release artifacts are built for macOS and Windows and attached to GitHub Releases.

Generated preview artifacts:

- macOS DMG for Apple Silicon and Intel.
- Windows NSIS installer.

Desktop preview builds are unsigned. Code signing, notarization, auto-updates, updater manifests, package-manager publishing, and app-store publishing are not part of the initial release flow.

On macOS, unsigned preview builds may be blocked by Gatekeeper. After moving `spec-ui.app` to `/Applications`, only run this command for a release artifact you trust:

```bash
xattr -dr com.apple.quarantine "/Applications/spec-ui.app"
```

Pull requests run a desktop compile workflow across macOS, Windows, and Linux targets. It prepares the desktop runtime and checks the Tauri crate without producing installer artifacts.

Local packaging for the current host:

```bash
source "$HOME/.cargo/env"
pnpm desktop:build --ci --no-sign
```

## Development Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm spec:validate
```

For Tauri changes:

```bash
source "$HOME/.cargo/env"
pnpm desktop:prepare-sidecar
cd src-tauri
cargo fmt --check
cargo check
```

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

Apache-2.0. See [LICENSE](./LICENSE).
