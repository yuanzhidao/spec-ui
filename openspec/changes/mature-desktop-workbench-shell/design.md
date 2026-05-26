# Design

## Context

The current Desktop renderer can launch without a bundled Next.js server and uses Tauri commands/events for local runtime capabilities. That establishes the correct runtime boundary, but the desktop product shell still lacks several mature workbench concepts:

- a Desktop-owned shell layout and chrome boundary;
- route lifecycle owned by the app shell;
- preserved route/tab state for long-running local workflows;
- granular runtime data subscriptions instead of one large dashboard snapshot;
- explicit overlay roots for terminal, dialogs, search, and future global surfaces;
- consistent loading behavior driven by cached data and real pending states;
- clear separation between shared views and platform-specific app shell behavior.

## Decision: Desktop shell owns platform behavior

The Desktop app shell SHALL own platform-specific behavior such as window chrome, route container layout, global overlays, terminal surface placement, app-level status, and future tab/workspace state.

Shared views SHALL remain product screens. They may receive navigation, runtime data, and actions through shared adapters, but they SHALL NOT own platform concerns such as Tauri commands, concrete router APIs, native window controls, or tab persistence.

## Decision: Mature capabilities are phased

The maturity roadmap SHALL be incremental:

1. Establish the Desktop shell boundary around router, navigation adapter, terminal host, and future overlay roots.
2. Add route handles and document title sync so route metadata lives with the app-shell router.
3. Add desktop chrome and window-layout structure without changing product routes.
4. Add route-level status semantics and app-shell history controls.
5. Add tab/workspace state only when workflows require preserved independent route instances.
6. Split runtime state into smaller cached projections after the MVP data model stabilizes.
7. Refactor large workboard and terminal modules as features expand.

## Decision: Do not fake loading

Navigation and skeleton states SHOULD reflect real route, runtime, or data loading. The system SHOULD NOT rely on artificial timeout-based loading states to hide synchronous rerenders.

When route transitions have no real async work, the workbench may use subtle route-surface motion or focus feedback, but page skeletons SHOULD come from missing or stale data boundaries.

## Decision: Preserve Web compatibility

Desktop maturity SHALL NOT fork product views away from the Web target. Web may keep Next.js route wrappers and Web-compatible runtime transport. Desktop may use a static renderer, memory router, and native runtime client. Shared product code SHALL continue to depend on adapters rather than concrete platform APIs.

## Decision: Keep runtime source boundaries explicit

The native Desktop runtime SHALL keep command/state orchestration separate from dashboard projection, filesystem fingerprints, task mutation, validation, and activity recording. Runtime modules should be split by stable responsibility before they approach the repository's 1,000-line source-file guideline.

## Decision: Source trees are organized by domain ownership

Source directories SHALL use folders to express domain ownership instead of repeating prefixes in filenames. Shared core code should separate runtime contracts, dashboard types, navigation, i18n, and utilities. Shared views should separate dashboard shell surfaces from feature sections. Desktop app code should separate app shell, routing, runtime bridge, and terminal UI. Native Rust code should separate runtime modules from terminal modules.

## Future Work

Future approved implementation tasks may include:

- desktop titlebar and drag region;
- back/forward controls driven by app-shell route history;
- per-project or per-context tab groups;
- preserved hidden route instances;
- command/search, terminal, and dialogs mounted as global overlay roots;
- route handles for document titles and status labels;
- runtime projection caches split by project, workboard, detail, validation, and terminal;
- additional runtime modules split by command groups when native capabilities expand;
- persistent view preferences for workboards and project pages;
- desktop renderer code splitting for heavy terminal and workbench surfaces;
- package/release hardening and platform integration.
