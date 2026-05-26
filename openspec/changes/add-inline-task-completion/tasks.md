## 1. Runtime Data

- [x] 1.1 Include `sourcePath` and `lineNumber` on parsed OpenSpec tasks.
- [x] 1.2 Add a runtime action for setting task completion.
- [x] 1.3 Validate task writes are limited to added OpenSpec project checkouts.
- [x] 1.4 Preserve markdown task text and newline style while updating checkbox state.

## 2. UI

- [x] 2.1 Add task toggle controls in the change detail task board.
- [x] 2.2 Disable task toggles while a runtime write is in flight.
- [x] 2.3 Refresh task columns and progress from the runtime snapshot after writes.
- [x] 2.4 Render clicked task checkbox state immediately without using the global busy state.
- [x] 2.5 Keep task cards in their current column while writes are pending.
- [x] 2.6 Serialize background task writes without applying optimistic dashboard snapshots.
- [x] 2.7 Move Desktop task writes and snapshot refresh work off the WebView/native command thread.

## 3. Verification

- [x] 3.1 Add tests for task source metadata and runtime markdown updates.
- [x] 3.2 Run `pnpm typecheck`.
- [x] 3.3 Run `pnpm lint`.
- [x] 3.4 Run `pnpm test`.
- [x] 3.5 Run `pnpm spec:validate`.
- [x] 3.6 Run desktop compile checks.
- [x] 3.7 Run `pnpm build`.
