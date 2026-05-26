## 1. Spec and Current Foundation

- [x] 1.1 Define the mature Desktop workbench shell roadmap.
- [x] 1.2 Add a Desktop app-shell component boundary around router, navigation adapter, and persistent terminal host.
- [x] 1.3 Validate shared views do not import concrete Desktop router or Tauri APIs.

## 2. Desktop Shell Structure

- [ ] 2.1 Add a Desktop-owned shell layout that can host window chrome, drag regions, sidebar container, content inset, and overlay roots.
- [ ] 2.2 Keep the current dashboard route content visually stable while moving platform chrome out of shared product views.
- [ ] 2.3 Add shell-level roots for command search, global dialogs, notifications, and future non-terminal desktop overlays.
- [ ] 2.4 Add desktop-safe loading and runtime error surfaces at the shell level.

## 3. Route Lifecycle and History

- [x] 3.1 Add route handles for title metadata.
- [x] 3.2 Add document title synchronization for Desktop routes.
- [ ] 3.3 Add app-shell back and forward controls driven by Desktop router history.
- [x] 3.4 Preserve terminal and other persistent global surfaces across route changes.
- [x] 3.5 Add a visible route-surface transition without fake loading skeletons.

## 4. Preserved Contexts and Tabs

- [ ] 4.1 Define when the product needs multiple preserved contexts instead of one active route.
- [ ] 4.2 Add a tab/context store only after the workflow need is approved.
- [ ] 4.3 Keep each preserved context's router state independent.
- [ ] 4.4 Avoid preserving every project/context by default when it would create unnecessary memory growth.

## 5. Runtime State Maturity

- [x] 5.1 Identify runtime projection boundaries for projects, workboards, details, validation, activity, settings, and terminal.
- [ ] 5.2 Split large snapshot consumers into smaller cached query/subscription surfaces when required by UX or performance.
- [ ] 5.3 Ensure loading states are driven by real missing or pending data.
- [ ] 5.4 Prevent route changes and realtime refreshes from flashing empty states when cached data exists.
- [x] 5.5 Split the native runtime state module by projection, filesystem fingerprinting, task mutation, validation, and activity recording responsibilities.

## 6. Workbench UI Maintainability

- [ ] 6.1 Split Projects page card, list, toolbar, settings dialog, and metric tile modules as behavior grows.
- [ ] 6.2 Split Workboard toolbar, grouping, cards, list rows, and detail-specific helpers as behavior grows.
- [ ] 6.3 Split Terminal dock window state, session tabs, resize/fullscreen behavior, and xterm lifecycle as behavior grows.
- [ ] 6.4 Add interaction tests around router state, view mode persistence, project focus, terminal persistence, and loading states.
- [ ] 6.5 Split heavy terminal and workbench bundles after the Desktop shell and route model settle.
- [x] 6.6 Organize app-shell, core, shared views, native runtime, and terminal source trees by domain directories instead of flat mixed-responsibility `src` roots.
- [x] 6.7 Standardize source naming so directories express domain ownership and filenames express focused responsibilities.

## 7. Verification

- [x] 7.1 Run `pnpm typecheck`.
- [x] 7.2 Run `pnpm lint`.
- [x] 7.3 Run `pnpm build:desktop-renderer`.
- [x] 7.4 Run `pnpm spec:validate`.
- [x] 7.5 Run `pnpm test`.
