## 1. OpenSpec

- [x] 1.1 Define desktop-only integrated terminal scope and non-goals.
- [x] 1.2 Capture terminal lifecycle, cwd, multi-session, minimization, and refresh behavior.
- [x] 1.3 Review dependency and packaging risks before implementation.
- [x] 1.4 Validate `add-integrated-terminal`.

## 2. Runtime And Desktop Bridge

- [x] 2.1 Install and verify `@xterm/xterm` and Rust `portable-pty` through approved package tooling.
- [x] 2.2 Add a Tauri Rust terminal session manager outside React component state and outside the browser-accessible Node/Hono runtime.
- [x] 2.3 Detect host OS, architecture, shell path, and shell version when available before session creation.
- [x] 2.4 Start shell sessions with cwd from the focused project at creation time, or the user's home directory when no project is focused.
- [x] 2.5 Stream PTY output to the UI and send UI input to the PTY.
- [x] 2.6 Keep a bounded recent-output buffer per live terminal session for webview refresh reconnect.
- [x] 2.7 Support terminal resize events.
- [x] 2.8 Terminate sessions on explicit session-tab close and app shutdown.
- [x] 2.9 Ensure UI navigation, panel minimization, and webview refresh do not terminate sessions.
- [x] 2.10 Ensure terminal commands/events are unavailable outside the Tauri desktop context.
- [x] 2.11 Start packaged desktop shells with login initialization and a user-tool PATH so installed CLI tools can be resolved.

## 3. UI

- [x] 3.1 Add a lower-right terminal launcher to desktop app chrome.
- [x] 3.2 Add terminal panel open, minimize, and restore controls.
- [x] 3.3 Add multi-session creation, switching, and closing controls.
- [x] 3.4 Render terminal output and input using the approved terminal renderer.
- [x] 3.5 Hide or disable terminal controls in browser-only Web mode.
- [x] 3.6 Preserve panel/session UI state across route changes.
- [x] 3.7 Add subtle resize rails and maximize/restore controls for the terminal panel.
- [x] 3.8 Align sidebar resizing with the same low-visibility rail interaction.

## 4. Verification

- [ ] 4.1 Test host terminal environment detection and unsupported-shell issue handling.
- [x] 4.2 Test session creation with focused project cwd.
- [ ] 4.3 Test session creation uses the user's home directory when no project is focused.
- [ ] 4.4 Test multiple sessions remain independent.
- [ ] 4.5 Test minimize/restore does not kill a shell process.
- [ ] 4.6 Test route changes and webview refresh reconnect to running sessions and replay bounded buffered output.
- [x] 4.7 Test explicit session close terminates only that session.
- [ ] 4.8 Test desktop app shutdown terminates managed sessions.
- [ ] 4.9 Test browser-only Web mode cannot access terminal commands/events.
- [x] 4.10 Run typecheck, lint, unit tests, OpenSpec validation, Rust checks, and desktop compile checks.
