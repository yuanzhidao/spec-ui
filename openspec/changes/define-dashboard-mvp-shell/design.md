## Context

The current application is still close to the default Next.js scaffold. spec-ui needs a first usable product shell for a local, spec-driven dashboard that can later become a desktop tool. The MVP must read user-selected local projects, project OpenSpec data into unified boards, and update the dashboard as local files change.

The project uses one root `openspec/` instance, English as the primary artifact and UI language, Next.js, pnpm, shadcn/ui, and Motion. Local filesystem access must not live in React components because future desktop packaging will need a different runtime surface.

## Goals / Non-Goals

**Goals:**

- Replace the scaffolded home page with a Specs-first workbench shell contract.
- Support UI-driven local project directory addition through a local server-backed path input/picker.
- Support a multi-project unified workbench with one focused project filter.
- Support monorepo-style projects by discovering multiple OpenSpec scopes under one added project root without requiring the user to add each subdirectory separately.
- Define a `SpecDialectAdapter` boundary with OpenSpec as the first implementation.
- Define WebSocket-based realtime events for project file changes, projection refreshes, validation state, and connection health.
- Establish a target operational layout: persistent sidebar, dense central workspace, Specs-first workboard, project drill-down, detail inspector, command/search entry, and restrained transitions.
- Establish design token, theme, and language expectations for light default UI with user-selectable preferences in Settings.
- Follow the approved product UI behavior and visual rhythm for the MVP; independent brand styling is out of scope for this change.

**Non-Goals:**

- Native desktop folder picker integration.
- Full desktop runtime packaging.
- Support for Spec Kit, Kiro, or other non-OpenSpec dialects in the MVP.
- Open-source contribution docs and templates.
- Multi-user collaboration or cloud sync.
- Full terminal/PTY integration.
- Hard-coded scope names such as `api`, `web`, or `desktop`.
- Cross-project Change aggregation by `change-id`.
- Automatic creation or synchronization of missing scoped Changes.

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

### Decision: Let users add local directories from the UI

The MVP SHALL present a directory addition surface in the app. Early Web builds can use a path input or server-backed picker. Desktop builds can later replace the picker implementation without changing dashboard state contracts. When an added directory contains a supported spec structure, the runtime SHALL detect it automatically. When the directory is readable but contains no supported spec structure, the app SHALL keep it as a blank/no-spec project state instead of treating the directory as a fatal error.

Alternatives considered:
- CLI-only project path at startup: simpler, but it does not match the intended product workflow.
- Hard-code the current repository: useful for demos, but not a product behavior.

### Decision: Discover OpenSpec scopes inside monorepo projects

The runtime SHALL treat the user-added directory as the project root and SHALL discover supported spec scopes under that root. A scope is a directory that owns a recognizable `openspec/` instance. The root scope SHALL be labeled `root` when the project root itself contains `openspec/`; nested scopes SHALL be labeled by their relative POSIX path from the project root, such as `apps/web` or `packages/api`.

Scope discovery SHALL be generic within OpenSpec and SHALL NOT hard-code product names, package names, or fixed directory categories. The MVP runtime SHALL use maintained directory scanning and ignore-rule utilities for project scanning; the approved MVP dependencies are `fast-glob` and `ignore`. The runtime SHALL search specifically for directories named `openspec` under the project root instead of using a fixed maximum directory depth. Other spec dialects can add their own scope detection rules later through the adapter boundary, but they SHALL NOT be detected by this MVP scan. The search SHALL prune heavy or unrelated directories including `.git`, `node_modules`, `.next`, `dist`, `build`, `coverage`, `.turbo`, `.worktree`, `.worktrees`, and hidden directories unless a hidden directory is the selected project root. During traversal, the runtime SHALL discover readable `.gitignore` files at the project root and in nested directories, apply supported patterns against paths relative to the directory that owns each `.gitignore`, and inherit those ignore rules while traversing descendants. If a `.gitignore` file cannot be read or parsed, discovery SHALL continue with built-in ignores and expose a recoverable project issue if needed. Discovered scopes SHALL be sorted with `root` first, then by relative path. A project with no discovered scopes remains a no-spec project state.

Alternatives considered:
- Require the user to add every subdirectory separately: rejected because it fragments a single monorepo feature across multiple projects and hides same-id Change relationships.
- Hard-code known subdirectories such as `api`, `web`, and `desktop`: rejected because monorepo structure is project-specific.
- Scan every directory as a candidate without pruning: rejected because local repositories can contain generated output, vendored dependencies, nested worktrees, or other large local-only directories that can make detection slow or unsafe.
- Depend on external `rg` or `fd` binaries: rejected for the runtime because desktop packaging would need to distribute and invoke platform-specific binaries.

### Decision: Model the workbench as a project collection with a focused project

The MVP SHALL persist and render a collection of local project bindings. Changes and Specs SHALL default to an All Projects view with unified single-column card streams. Selecting a project from the sidebar SHALL set a focused project filter and render the same card stream semantics scoped to that project. The focused filter SHALL be clearable so the user can return to All Projects. Project creation or addition SHALL live in the Projects page upper-right action area, not in sidebar navigation chrome. This mirrors the intended workflow where the user can see all work across projects, then drill into one project's changes or specs without switching applications.

Alternatives considered:
- Single active project only: rejected because the product direction is a multi-project unified dashboard.
- Separate route tree per project first: deferred because the MVP can express project drill-down as a focused filter while keeping implementation smaller.
- Workspace/team abstraction: rejected for this MVP because the first runtime is local-only and single-user.

### Decision: Persist runtime settings in JSON first

The MVP SHALL persist runtime settings in the runtime-managed JSON settings file at `~/.spec-ui/settings.json`. The settings file SHALL include the local project collection as persistent random project IDs paired with local paths, focused project ID, theme preference, and language preference. On restart, the app SHALL attempt to restore the project collection, validate that each path is still readable, detect supported spec structure if present, and preserve recoverable invalid-project states. Project URLs SHALL use the persistent project ID rather than an encoded or hashed local path. The runtime SHALL validate settings content against a schema and write updates atomically to reduce corruption risk.

Alternatives considered:
- Browser `localStorage`: rejected because project binding is runtime-owned local state and will later need desktop/runtime access.
- YAML file: viable for human-authored configuration, but unnecessary for runtime-managed settings and easier to corrupt through formatting ambiguity.
- SQLite: deferred because the MVP only needs light settings persistence. Reconsider SQLite when structured history, event storage, search cache, or query-heavy settings become necessary.

### Decision: OpenSpec first, adapter contract always

The first adapter SHALL support OpenSpec. The UI SHALL consume normalized project, scope, change, spec, requirement, validation, and activity models from a `SpecDialectAdapter` interface instead of importing OpenSpec parsing details into app shell components. Aggregation across projects SHALL happen above adapters by combining normalized per-project projections; adapter implementations SHALL remain project-scoped.

For monorepo projects, the OpenSpec adapter SHALL project each discovered scope separately and attach a stable `scopeId`, `scopeLabel`, and relative `scopePath` to scoped specs, scoped changes, validation state, and activity records. The runtime aggregation layer SHALL group scoped Changes with the same `change-id` within a single project into one project-level aggregated Change. Aggregation SHALL NOT merge Changes across different projects.

Alternatives considered:
- Implement multiple dialects immediately: rejected because it expands scope before the OpenSpec MVP is observable.
- Build OpenSpec directly into pages: rejected because it would make future Spec Kit and Kiro support a rewrite.
- Flatten nested scopes into one synthetic OpenSpec tree: rejected because it would erase which package or surface owns a task, delta spec, or validation result.

### Decision: WebSocket for realtime project updates

The runtime SHALL expose WebSocket events for project changes and connection state. The MVP can use ordinary HTTP/API calls for initial reads and commands, with WebSocket focused on update notifications and live status. Realtime events SHALL identify the affected project and, when possible, the affected scope so unified boards can refresh the affected project projection without discarding other projects.

Alternatives considered:
- Polling: simpler, but worse for a product positioned as a realtime dashboard.
- SSE: adequate for one-way updates, but WebSocket leaves room for future terminal, command, and desktop runtime interactions.

### Decision: Run validation through the runtime command boundary

Manual validation SHALL execute through the local runtime command boundary. For OpenSpec projects, the runtime SHALL invoke the OpenSpec validation command for the focused project, capture stdout, stderr, exit code, start/end timestamps, and expose the result through normalized validation state. The runtime MAY provide buffered results for the MVP; streaming output can be added later without changing validation state semantics. Bulk validation across all projects is out of scope for this MVP unless explicitly added later.

Alternatives considered:
- Adapter-only validation: useful for fast structural checks, but it does not represent the authoritative CLI workflow.
- Automatic validation after every file event: rejected for the MVP because manual validation plus stale marking is easier to reason about.

### Decision: Run Next.js and local runtime as MVP dev processes

The MVP implementation MAY use parallel development processes for the Next.js app and the Hono local runtime server. The browser app SHALL communicate with the runtime through configured local HTTP and WebSocket endpoints. A later desktop packaging change can consolidate process management without changing the UI contracts.

Alternatives considered:
- Embed all runtime behavior in Next.js: rejected because long-lived watcher and WebSocket lifecycle should remain runtime-owned.
- Solve final desktop process orchestration now: rejected as premature for the Web-first MVP.

### Decision: Keep UI shell dense and inspectable

The MVP shell SHALL prioritize a workbench over a landing page. The default layout SHALL include sidebar navigation, a central board surface, project-focused drill-down, a detail inspector, and a command/search trigger. Empty states SHALL guide the user to add a project directory or create/read OpenSpec artifacts. The MVP SHALL align interaction density, sidebar behavior, panel rhythm, command/search behavior, and restrained visual treatment with the approved product direction; defining a distinct spec-ui visual identity is a non-goal for this change.

Alternatives considered:
- Marketing-style landing first screen: rejected because the app is a tool, not a campaign page.
- Metric dashboard: rejected because spec/change workflows need fast drill-down into actual work items.

### Decision: Default to the unified Specs workboard and manual validation

The initial central workspace SHALL default to Specs after at least one project is added. The app SHALL NOT include a separate Dashboard overview in this MVP. Primary navigation SHALL be backed by section routes such as `/specs`, `/changes`, `/projects`, `/activity`, `/validation`, and `/settings` so refresh and browser history preserve the current section. Specs SHALL be rendered as a single full-width vertical stream of spec cards, not as project-count metrics or narrow project columns. Changes SHALL reuse the same dense single-column card pattern and separate active and archived Changes into collapsible lifecycle groups. Change cards SHALL open a project-scoped detail route using the persistent random project ID, preserving the Changes navigation context and presenting MVP tabs for Overview, Tasks, Delta Specs, and Files. Projects SHALL be a separate page with a compact header, search/display toolbar, and project rows or cards; its upper-right action area SHALL contain the add-project control. Selecting a project from the sidebar SHALL focus the same card stream on that project. The Validation section SHALL provide an explicit validation action and status history for the focused project. Realtime file changes SHALL mark that project's validation status stale instead of automatically running validation in the MVP.

When a focused project contains multiple discovered scopes, Specs and Changes SHALL keep the ordinary full-width card stream. Each project-level Change SHALL aggregate by lifecycle and Change ID, render once inside the matching lifecycle group, and show compact per-scope progress rows for scopes where that Change exists. Scopes without that Change SHALL be omitted instead of shown as missing placeholders. Specs SHALL keep scope identity in card metadata rather than splitting into scope columns. Future Issues work MAY introduce multi-column boards; Specs and Changes SHALL remain single-column in this MVP.

Alternatives considered:
- Default to Changes: useful for active work, but too narrow when stable specs are the primary product surface.
- Default to a metric dashboard: rejected because the confirmed MVP should open directly into work items, not summary counts.
- Run validation automatically on every relevant file event: attractive, but it risks noisy command execution and unclear performance before the watcher/runtime path is proven.

### Decision: Ship preferences in Settings

The MVP SHALL define semantic CSS tokens for app surfaces, sidebar, cards, borders, status colors, brand accent, and charts before detailed page work. The app SHALL default to light mode, expose theme and language controls in a Settings page with secondary vertical navigation, persist both preferences locally, and support dark rendering for the dashboard shell and MVP sections. The Preferences panel SHALL render Light, Dark, and System as visual preview choices rather than a plain segmented control. The Runtime panel SHALL hold runtime status and focused project discovery state, while project management remains owned by the Projects page. System mode SHALL automatically follow operating system color-scheme changes while the app is open. The language control SHALL default to English and MAY expose Chinese as a secondary language option; UI copy SHALL NOT default to Chinese. User-facing dashboard copy SHALL be sourced from a formal i18n message layer backed by a maintained Next.js-compatible i18n dependency, starting with English and Chinese message files and covering visible copy, labels, empty states, and dialog copy in the MVP surface.

Alternatives considered:
- Token-only dark support with no UI control: rejected because it is hard for maintainers and early testers to verify.
- Dark default: rejected because the confirmed product direction is light by default.
- Sidebar-level theme/language controls: rejected because preferences belong in Settings rather than persistent navigation chrome.

### Decision: Use shadcn and Motion as implementation foundations

shadcn/ui components SHALL be added through the CLI. Motion SHALL be used only for purposeful transitions.

Alternatives considered:
- Style each page locally: rejected because it creates inconsistent UI and makes dark mode harder.
- Build a large custom component library first: rejected as premature.

## Risks / Trade-offs

- Local path input can expose invalid or inaccessible paths -> Validate paths server-side and show explicit recoverable errors.
- File watching can be noisy or platform-dependent -> Use a verified cross-platform watcher and debounce/project events into normalized updates.
- Monorepo discovery can accidentally traverse heavy generated or nested repository directories -> Search only for `openspec` directories while pruning built-in ignored paths and `.gitignore` matches.
- Same-id Changes across scopes may not have identical titles or task structure -> Preserve per-scope details and aggregate progress without hiding scoped differences.
- WebSocket runtime can add complexity to a small MVP -> Keep commands and initial data reads out of WebSocket; use it for realtime notifications and status only.
- Adapter abstraction can become speculative -> Keep the interface limited to the OpenSpec data the MVP UI actually renders, but name extension points clearly.
- A dense three-column layout can break on small screens -> Define responsive behavior: sidebar collapses, inspector becomes a panel/drawer, and content remains readable.
- Dark mode can be half-finished -> Require a visible Settings-page theme mode control and verify Light, Dark, and System rendering during browser checks.

## Migration Plan

1. Scaffold approved UI and runtime dependencies through pnpm and official CLIs.
2. Replace the default page with the MVP dashboard shell.
3. Add project collection management and runtime validation before rendering project-specific data.
4. Add OpenSpec scope discovery, adapter projection, multi-project aggregation, and empty/error states.
5. Add focused-project scoped card behavior after scoped projection is stable.
6. Add watcher and WebSocket updates after static projection works.
7. Add Settings-page preferences for theme and language.
8. Add focused tests and browser verification for desktop and mobile viewport behavior.

Rollback strategy: keep the change isolated to the feature branch/worktree. If realtime work blocks the MVP, preserve the static project collection and adapter projection while disabling the WebSocket connection surface behind a clearly visible disconnected state.

## Open Questions

- None.
