# Contributing to spec-ui

Thanks for taking the time to improve spec-ui. This project is an early-stage spec-driven workbench, so contribution quality matters more than speed.

## Project Status

spec-ui is currently shaping its web MVP and desktop shell. Expect APIs, UI flows, and runtime boundaries to change through reviewed OpenSpec changes.

## Requirements

- Node.js 22 or newer.
- pnpm 10 or newer.
- OpenSpec CLI available on `PATH` for OpenSpec validation.
- Rust stable toolchain for Tauri desktop work.
- Xcode Command Line Tools on macOS for Tauri development.

Use pnpm for all JavaScript package operations. Do not use npm, yarn, or bun for project installs.

## Setup

```bash
pnpm install
pnpm dev
```

The default development command starts both the Next.js web app and the local runtime.

For desktop shell development:

```bash
source "$HOME/.cargo/env"
pnpm desktop:dev
```

## Branches And Worktrees

Use `main` as the base branch. Create a feature branch for every meaningful change.

When working locally, prefer a dedicated worktree outside the repository checkout. Do not put active worktrees inside the project directory, because nested worktrees can cause recursive file watching and excessive memory usage.

## OpenSpec First

OpenSpec is required before implementing changes that affect:

- Product behavior, UI flows, or information architecture.
- Spec dialect compatibility, parsing, adapters, validation, or import/export behavior.
- Runtime boundaries, local file access, watchers, desktop packaging, or deployment.
- Dependency strategy, test strategy, automation, contribution policy, or security policy.

Small typo fixes, purely mechanical formatting, and narrow test repairs may bypass OpenSpec when they do not change behavior or policy.

Use:

```bash
openspec validate <change-id>
```

## Dependency Policy

Add dependencies through package-manager or official CLI commands, for example:

```bash
pnpm add <package>@latest
pnpm add -D <package>@latest
pnpm dlx <official-cli>@latest
```

Dependency changes must be disclosed in the pull request and justified by maintenance status, stability, license, runtime or bundle impact, and fit with the approved stack.

Do not hand-edit package manifests to add dependencies.

## Code Style

- Keep files focused and reviewable.
- Split large modules by responsibility.
- Prefer existing project patterns over introducing new abstractions.
- Keep UI copy English-first unless a localization change is in scope.
- Use structured parsers and domain adapters instead of ad hoc string parsing when practical.
- Keep generated files and build outputs out of commits unless they are required lockfiles or project metadata.

## Verification

Run the checks that match your change:

```bash
pnpm typecheck
pnpm lint
pnpm test
openspec validate <change-id>
```

For Tauri changes:

```bash
source "$HOME/.cargo/env"
cd src-tauri
cargo fmt --check
cargo check
```

For visible UI changes, include screenshots or short recordings when practical. For runtime, parser, adapter, or settings changes, include test output or command output.

## Pull Requests

Pull requests should be narrow and reviewable. Include:

- Motivation and problem statement.
- Summary of changed behavior.
- OpenSpec change ID or explanation for why OpenSpec is not required.
- Verification commands and results.
- Screenshots, recordings, or logs when relevant.
- Dependency changes and justification.
- Breaking-change disclosure.

Maintainers may ask for an OpenSpec change, more tests, clearer screenshots, or a smaller PR before review.
