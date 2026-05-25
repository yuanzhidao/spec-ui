# Design

## Decision: Desktop-only integrated terminal

The terminal SHALL be available only in the desktop app. Browser-only Web mode SHALL hide or disable the terminal entry because the browser cannot safely spawn local shells.

The terminal bridge SHALL be exposed only through Tauri desktop commands/events and desktop capabilities. The browser-only Web runtime SHALL NOT expose terminal HTTP routes, WebSocket routes, or client-callable APIs that can start a local shell. UI hiding is a presentation rule, not the security boundary.

The terminal SHALL use an integrated terminal UI inside spec-ui, backed by the user's system shell through a managed PTY. This matches the expected VS Code-style model: the shell is the user's real shell, while the terminal surface is owned by the app. External terminal applications are intentionally out of scope because they cannot provide reliable multi-session tabs, minimization, lifecycle control, and UI persistence inside spec-ui.

## Decision: Rust-owned terminal sessions

Terminal sessions SHALL be owned by the Tauri Rust process, not by React component state and not by the browser-accessible Node/Hono runtime. This keeps terminal process management in the desktop app boundary and leaves room to move more local runtime responsibilities into Rust over time.

The Rust terminal manager SHALL own PTY child processes, session IDs, session metadata, output buffers, input writes, resize events, and close operations. UI panels may mount, unmount, minimize, restore, route-change, or webview-refresh without terminating shell processes.

The desktop bridge SHALL use Tauri commands/events for terminal operations. The existing Node/Hono runtime MAY still provide focused-project metadata, but it SHALL NOT own terminal sessions or expose shell execution capabilities.

Terminal Tauri capabilities SHALL be granted only to the main loopback webview. The desktop window SHALL also reject navigation outside the app's selected loopback origin before exposing terminal commands, so the remote capability rule and window navigation guard form the desktop security boundary.

## Decision: System shell and project cwd

Before creating a terminal session, the Rust terminal manager SHALL detect the host terminal environment:

- OS family and version when available.
- Architecture.
- Selected shell executable path.
- Shell version when it can be queried without starting an interactive shell.

Detection failures SHALL be surfaced as recoverable terminal issues. Unsupported platforms SHALL keep terminal creation unavailable rather than falling back to an unknown shell.

New terminal sessions SHALL start the user's default system shell for the current platform:

- macOS/Linux: the user's configured shell when available, falling back to a standard shell.
- Windows: PowerShell or the system default shell chosen by the implementation.

When a focused project exists, new terminal sessions SHALL start in that project's root directory. Existing sessions SHALL keep their original working directory when the focused project changes. When no focused project exists, new terminal sessions SHALL start in the user's home directory. If the home directory cannot be resolved, terminal creation SHALL be disabled with a visible recoverable issue.

## Decision: Multi-session terminal panel

The UI SHALL provide a persistent terminal launcher near the lower-right app chrome. Opening it SHALL reveal a terminal panel with session tabs or an equivalent session switcher. Users SHALL be able to:

- Create a new session.
- Switch between sessions.
- Close a session tab, which terminates only that session's PTY child process.
- Resize the floating panel using subtle edge rails.
- Maximize the panel inside the app workspace and restore it to the previous floating size.
- Minimize the panel without closing sessions.
- Restore minimized sessions.

Minimizing the terminal panel SHALL NOT terminate terminal sessions. Only closing a session tab, explicit process exit inside the shell, or app shutdown terminates a managed terminal session.

Session labels SHOULD make the project or shell context readable. If labels are editable, editing is a UI-only convenience and SHALL NOT change the process working directory.

The terminal panel and app sidebar SHALL share the same low-visibility resize affordance style: thin edge rails that stay visually quiet until hover or active drag. Resize handles SHALL not render as prominent decorative controls.

## Decision: Terminal renderer and PTY dependency

The UI SHALL use `@xterm/xterm` as the terminal renderer. The Rust terminal manager SHOULD use `portable-pty` for cross-platform PTY process management, unless implementation validation finds a blocking packaging or platform issue.

The dependency decision is intentionally Rust-first: PTY ownership stays in the Tauri process instead of adding a Node PTY sidecar. Before implementation, dependency installation SHALL verify maintenance status, platform support, license, native packaging behavior, and compatibility with Tauri desktop CI.

## Decision: Refresh and reconnect behavior

The Rust terminal manager SHALL keep a bounded recent-output buffer for each live terminal session. After a webview refresh, the UI SHALL reconnect through the desktop bridge, restore session metadata, and replay the buffered output before continuing live streaming.

The output buffer is an in-memory app-process buffer only. It SHALL NOT persist across full app restarts and SHALL NOT be written to project files or settings.

## Risks

- PTY libraries can have native packaging requirements that affect macOS, Windows, and Linux CI.
- Terminal process lifecycle bugs can leave orphaned shell processes.
- Incorrect cwd handling can run commands in the wrong project.
- Terminal rendering and resize behavior can be fragile in constrained panels.
- Desktop-only behavior must not leak terminal controls into unsupported Web mode.
