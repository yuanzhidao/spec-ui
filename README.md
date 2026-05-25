# spec-ui

spec-ui is a universal UI for spec-driven AI development.

It turns local spec workflows into a real-time dashboard for projects that use OpenSpec today, while keeping the adapter layer open for additional spec formats later.

**English | [简体中文](./README.zh-CN.md)**

## What Is spec-ui?

Spec-driven projects often spread planning context across changes, specs, task lists, deltas, and validation output. spec-ui turns that local project structure into a dashboard that is easier to scan, navigate, and review.

The goal is not to replace a spec system. The goal is to provide a shared product surface for maintainers, contributors, and AI agents working from the same spec-driven context.

The first supported workflow is OpenSpec:

- Add one or more local project directories.
- Detect OpenSpec workspaces automatically, including nested monorepo scopes.
- Track changes, specs, task progress, files, and validation state.
- Watch local files and update the dashboard in real time.
- Move between all projects and focused project views without losing context.

Future adapters can support additional spec formats without changing the main dashboard model.

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

spec-ui is early-stage software. The product surface, runtime boundaries, and adapter contracts are being shaped through reviewed OpenSpec changes.

APIs, UI flows, runtime behavior, desktop integration, and adapter contracts may continue to evolve.

| Area | Status |
| --- | --- |
| Web dashboard | Active MVP |
| OpenSpec adapter | First supported dialect |
| Multi-project dashboard | Active MVP |
| Monorepo scope detection | Active MVP |
| Realtime local updates | Active MVP |
| Desktop shell | Preview packaging |
| Additional spec dialects | Planned |

## Core Features

- **Project dashboard**: manage multiple local projects from one workspace.
- **Change board**: scan OpenSpec changes with progress, scope, task, spec, and file context.
- **Spec board**: browse specs across projects and drill into a focused project.
- **Monorepo scopes**: detect nested `openspec` directories and group matching change IDs under one project.
- **Realtime updates**: file changes are watched by the local runtime and pushed to the UI over WebSocket.
- **Local settings**: project state and preferences are stored locally in `~/.spec-ui/settings.json`.
- **Theme and language preferences**: light, dark, and system theme support with English-first localization foundations.
- **Desktop-ready direction**: the Web app remains the first-class surface while Tauri provides the desktop shell path.

## User Workflow

1. Start spec-ui locally.
2. Open **Projects** and add a local project directory.
3. spec-ui detects OpenSpec structure in the selected directory.
4. Open **Changes** to review active changes, tasks, scopes, deltas, specs, and files.
5. Open **Specs** to browse project specs.
6. Use **Settings** for appearance and language preferences.

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
│ for the Web app    │
└────────────────────┘
```

The runtime owns local file access, directory discovery, settings persistence, and file watching. React components consume structured project data instead of reading the filesystem directly.

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

```bash
source "$HOME/.cargo/env"
pnpm desktop:dev
```

## Desktop Release Artifacts

Release tags use `vX.Y.Z`, starting with `v0.0.1`. The release workflow verifies project metadata, builds desktop artifacts for macOS, Windows, and Linux, uploads intermediate Actions artifacts, generates release notes from commit messages, then creates or updates a draft GitHub Release for maintainer review.

Generated preview artifacts:

- macOS DMG for Apple Silicon and Intel.
- Windows NSIS installer.
- Linux AppImage and Debian package.

Desktop preview builds are unsigned. Code signing, notarization, auto-updates, updater manifests, package-manager publishing, and app-store publishing are not part of the initial release flow.

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
openspec validate --all
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

Substantial behavior, UI, runtime, adapter, packaging, dependency, automation, or policy changes should start with an OpenSpec change before implementation.

Use pnpm for JavaScript package operations. Dependencies should be added through package-manager or official CLI commands rather than hand-editing package manifests.

## License

Apache-2.0. See [LICENSE](./LICENSE).
