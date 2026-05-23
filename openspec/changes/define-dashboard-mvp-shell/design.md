## Context

The current application is still close to the default Next.js scaffold. spec-ui needs a first usable product shell for a local, spec-driven dashboard that can later become a desktop tool. The MVP must read a user-selected local project, project OpenSpec data into the UI, and update the dashboard as local files change.

The project uses one root `openspec/` instance, English as the primary artifact and UI language, Next.js, pnpm, shadcn/ui, and Motion. Local filesystem access must not live in React components because future desktop packaging will need a different runtime surface.

## Goals / Non-Goals

**Goals:**

- Replace the scaffolded home page with a dashboard-oriented app shell contract.
- Support UI-driven local project directory selection through a local server-backed path input/picker.
- Define a `SpecDialectAdapter` boundary with OpenSpec as the first implementation.
- Define WebSocket-based realtime events for project file changes, projection refreshes, validation state, and connection health.
- Establish a reference-aligned operational layout: persistent sidebar, dense central workspace, right detail inspector, command/search entry, and restrained transitions.
- Establish design token and theme expectations for light default UI with user-selectable dark mode.
- Follow the approved reference UI behavior and visual rhythm for the MVP; independent brand styling is out of scope for this change.

**Non-Goals:**

- Native desktop folder picker integration.
- Full desktop runtime packaging.
- Support for Spec Kit, Kiro, or other non-OpenSpec dialects in the MVP.
- Open-source contribution docs and templates.
- Multi-user collaboration or cloud sync.
- Full terminal/PTY integration.

## Decisions

### Decision: Use a local runtime boundary for project access

React UI SHALL call project/runtime APIs instead of reading files directly. The runtime owns path validation, OpenSpec discovery, file reads, watcher lifecycle, WebSocket event emission, and persisted project binding state.

Alternatives considered:
- Direct browser filesystem APIs: rejected because they are not reliable for arbitrary local project paths, watchers, or future desktop parity.
- Direct `fs` reads in React components: rejected because it couples UI rendering to Node-only behavior and makes desktop runtime replacement harder.

### Decision: Use a lightweight local server framework

The local runtime server SHALL use a lightweight Node framework rather than a full application framework. The preferred framework is Hono with `@hono/node-server`, because it keeps route handlers close to Web-standard request/response semantics while still supporting Node runtime deployment and WebSocket upgrade handling.

Alternatives considered:
- Next.js route handlers only: rejected for the realtime local runtime because a long-lived local WebSocket/watch process should not be tied to ordinary page route handling.
- Fastify: viable, but heavier than needed for a thin local runtime boundary.
- NestJS: rejected as over-structured for this single-user local runtime.

### Decision: Let users choose the local directory from the UI

The MVP SHALL present a directory selection surface in the app. Early Web builds can use a path input or server-backed picker. Desktop builds can later replace the picker implementation without changing dashboard state contracts. When the selected directory contains a supported spec structure, the runtime SHALL detect it automatically. When the directory is readable but contains no supported spec structure, the app SHALL show a blank/no-spec project state instead of treating the directory as a fatal error.

Alternatives considered:
- CLI-only project path at startup: simpler, but it does not match the intended product workflow.
- Hard-code the current repository: useful for demos, but not a product behavior.

### Decision: Persist runtime settings in JSON first

The MVP SHALL persist runtime settings in the runtime-managed JSON settings file at `~/.spec-ui/settings.json`. The settings file SHALL include the active project binding and theme preference. On restart, the app SHALL attempt to restore the last selected project, validate that it is still readable, and detect supported spec structure if present. The runtime SHALL validate settings content against a schema and write updates atomically to reduce corruption risk.

Alternatives considered:
- Browser `localStorage`: rejected because project binding is runtime-owned local state and will later need desktop/runtime access.
- YAML file: viable for human-authored configuration, but unnecessary for runtime-managed settings and easier to corrupt through formatting ambiguity.
- SQLite: deferred because the MVP only needs light settings persistence. Reconsider SQLite when structured history, event storage, search cache, or query-heavy settings become necessary.

### Decision: OpenSpec first, adapter contract always

The first adapter SHALL support OpenSpec. The UI SHALL consume normalized project, change, spec, requirement, validation, and activity models from a `SpecDialectAdapter` interface instead of importing OpenSpec parsing details into app shell components.

Alternatives considered:
- Implement multiple dialects immediately: rejected because it expands scope before the OpenSpec MVP is observable.
- Build OpenSpec directly into pages: rejected because it would make future Spec Kit and Kiro support a rewrite.

### Decision: WebSocket for realtime project updates

The runtime SHALL expose WebSocket events for project changes and connection state. The MVP can use ordinary HTTP/API calls for initial reads and commands, with WebSocket focused on update notifications and live status.

Alternatives considered:
- Polling: simpler, but worse for a product positioned as a realtime dashboard.
- SSE: adequate for one-way updates, but WebSocket leaves room for future terminal, command, and desktop runtime interactions.

### Decision: Run validation through the runtime command boundary

Manual validation SHALL execute through the local runtime command boundary. For OpenSpec projects, the runtime SHALL invoke the OpenSpec validation command for the selected project, capture stdout, stderr, exit code, start/end timestamps, and expose the result through normalized validation state. The runtime MAY provide buffered results for the MVP; streaming output can be added later without changing validation state semantics.

Alternatives considered:
- Adapter-only validation: useful for fast structural checks, but it does not represent the authoritative CLI workflow.
- Automatic validation after every file event: rejected for the MVP because manual validation plus stale marking is easier to reason about.

### Decision: Run Next.js and local runtime as MVP dev processes

The MVP implementation MAY use parallel development processes for the Next.js app and the Hono local runtime server. The browser app SHALL communicate with the runtime through configured local HTTP and WebSocket endpoints. A later desktop packaging change can consolidate process management without changing the UI contracts.

Alternatives considered:
- Embed all runtime behavior in Next.js: rejected because long-lived watcher and WebSocket lifecycle should remain runtime-owned.
- Solve final desktop process orchestration now: rejected as premature for the Web-first MVP.

### Decision: Keep UI shell dense, inspectable, and reference-aligned

The MVP shell SHALL prioritize a workbench over a landing page. The default layout SHALL include sidebar navigation, a central list/board surface, a right detail inspector, and a command/search trigger. Empty states SHALL guide the user to choose a project directory or create/read OpenSpec artifacts. The MVP SHALL align interaction density, sidebar behavior, panel rhythm, command/search behavior, and restrained visual treatment with the approved reference UI direction; defining a distinct spec-ui visual identity is a non-goal for this change.

Alternatives considered:
- Marketing-style landing first screen: rejected because the app is a tool, not a campaign page.
- Single-column dashboard: rejected because spec/change workflows need fast drill-down and comparison.

### Decision: Default to a dashboard overview and manual validation

The initial central workspace SHALL default to the Dashboard overview after a project is selected. The Validation section SHALL provide an explicit validation action and status history for the selected project. Realtime file changes SHALL mark validation status stale instead of automatically running validation in the MVP.

Alternatives considered:
- Default to Changes: useful for active work, but too narrow when a project is first opened.
- Run validation automatically on every relevant file event: attractive, but it risks noisy command execution and unclear performance before the watcher/runtime path is proven.

### Decision: Ship theme mode support in the MVP

The MVP SHALL define semantic CSS tokens for app surfaces, sidebar, cards, borders, status colors, brand accent, and charts before detailed page work. The app SHALL default to light mode, expose a theme preference control, persist the preference locally, and support dark rendering for the dashboard shell and MVP sections. The preferred control model is Light, Dark, and System because it maps cleanly to common theme providers while keeping Light as the project default. System mode SHALL automatically follow operating system color-scheme changes while the app is open.

Alternatives considered:
- Token-only dark support with no UI control: rejected because it is hard for Boss and early testers to verify.
- Dark default: rejected because the confirmed product direction is light by default.

### Decision: Use shadcn and Motion as implementation foundations

shadcn/ui components SHALL be added through the CLI. Motion SHALL be used only for purposeful transitions.

Alternatives considered:
- Style each page locally: rejected because it creates inconsistent UI and makes dark mode harder.
- Build a large custom component library first: rejected as premature.

## Risks / Trade-offs

- Local path input can expose invalid or inaccessible paths -> Validate paths server-side and show explicit recoverable errors.
- File watching can be noisy or platform-dependent -> Use a verified cross-platform watcher and debounce/project events into normalized updates.
- WebSocket runtime can add complexity to a small MVP -> Keep commands and initial data reads out of WebSocket; use it for realtime notifications and status only.
- Adapter abstraction can become speculative -> Keep the interface limited to the OpenSpec data the MVP UI actually renders, but name extension points clearly.
- A dense three-column layout can break on small screens -> Define responsive behavior: sidebar collapses, inspector becomes a panel/drawer, and content remains readable.
- Dark mode can be half-finished -> Require a visible theme mode control and verify Light, Dark, and System rendering during browser checks.

## Migration Plan

1. Scaffold approved UI and runtime dependencies through pnpm and official CLIs.
2. Replace the default page with the MVP dashboard shell.
3. Add project selection and runtime validation before rendering project-specific data.
4. Add OpenSpec adapter projection and empty/error states.
5. Add watcher and WebSocket updates after static projection works.
6. Add focused tests and browser verification for desktop and mobile viewport behavior.

Rollback strategy: keep the change isolated to the feature branch/worktree. If realtime work blocks the MVP, preserve the static project selection and adapter projection while disabling the WebSocket connection surface behind a clearly visible disconnected state.

## Open Questions

- Which exact local watcher package will be used after package health verification?
