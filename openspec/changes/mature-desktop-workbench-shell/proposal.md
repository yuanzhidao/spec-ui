# Mature Desktop Workbench Shell

## Why

The desktop-first migration makes spec-ui run as a static Tauri renderer with native runtime commands and events. That is the correct runtime direction, but the product shell is still closer to a Web MVP container than a mature desktop workbench.

spec-ui should grow toward a durable desktop workbench architecture without forcing every mature feature into the current MVP. The project needs an approved plan that lets maintainers add desktop chrome, route lifecycle, tab/workspace state, granular runtime data, and richer workboards incrementally while keeping the Web target and shared product UI intact.

## What Changes

- Define the target desktop workbench shell architecture.
- Separate the Desktop app shell boundary from routed product views.
- Plan native desktop chrome, window layout, overlay roots, and persistent global surfaces.
- Plan route lifecycle and tab state as app-shell responsibilities, not ad hoc page state.
- Plan runtime state to move from a single large dashboard snapshot toward granular subscriptions and cached projections.
- Plan shared-view constraints so Web and Desktop keep one product implementation while app shells own platform-specific behavior.
- Track currently feasible foundation work separately from later mature capabilities.

## Non-Goals

- Do not implement the full tab system in this change.
- Do not add accounts, cloud sync, hosted collaboration, or remote workspace services.
- Do not remove the Web target or fork the shared product UI.
- Do not redesign every workboard card in this change.
- Do not add auto-updates, signing, notarization, or deep-link handling unless a later release/platform spec approves them.
