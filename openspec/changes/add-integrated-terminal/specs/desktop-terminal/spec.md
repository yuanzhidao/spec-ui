# desktop-terminal Specification

## ADDED Requirements

### Requirement: Desktop-only terminal availability

The system SHALL provide an integrated terminal only in the desktop app.

#### Scenario: Desktop user opens terminal launcher

- **WHEN** a user runs the desktop app
- **THEN** a terminal launcher is available near the lower-right app chrome
- **AND** activating it opens the integrated terminal panel

#### Scenario: Browser-only web mode does not expose terminal

- **WHEN** a user runs spec-ui in browser-only Web mode
- **THEN** terminal controls are hidden or disabled
- **AND** no local shell process can be started from the browser-only UI

#### Scenario: Browser runtime cannot call terminal APIs

- **WHEN** spec-ui runs outside the Tauri desktop context
- **THEN** terminal commands, event streams, and session creation APIs are unavailable
- **AND** the browser-accessible runtime exposes no shell execution endpoint

### Requirement: Integrated terminal uses system shell

The terminal SHALL present an integrated terminal UI backed by the user's system shell through a PTY managed by the Tauri Rust process.

#### Scenario: New terminal starts system shell

- **WHEN** a desktop user creates a terminal session
- **THEN** the Tauri Rust process starts a system shell process through a PTY
- **AND** terminal input is sent to that shell process
- **AND** shell output is rendered in the integrated terminal UI

#### Scenario: Packaged desktop terminal resolves user CLI tools

- **WHEN** a desktop user creates a terminal session from an installed app bundle
- **THEN** the shell starts with login-shell initialization when supported
- **AND** the session PATH includes common user and package-manager binary directories before standard system fallback directories
- **AND** locally installed CLI tools such as `codex` or `claude` can be resolved when they are available in the user's normal terminal environment

#### Scenario: External terminal app is not opened

- **WHEN** a desktop user creates a terminal session
- **THEN** spec-ui does not open an external terminal application window
- **AND** session switching, minimization, and session closing remain controlled by spec-ui

### Requirement: Host terminal environment detection

The system SHALL detect the host terminal environment before starting terminal sessions.

#### Scenario: Supported host environment is detected

- **WHEN** the desktop app starts or the first terminal session is created
- **THEN** the Tauri Rust process detects the OS family, OS version when available, architecture, selected shell executable, and shell version when available
- **AND** terminal session creation uses the detected shell

#### Scenario: Host shell cannot be resolved

- **WHEN** the Tauri Rust process cannot resolve a supported shell for the current system
- **THEN** terminal session creation is unavailable
- **AND** the UI shows a recoverable terminal issue instead of starting an unknown command

### Requirement: New terminal uses project or home cwd

New terminal sessions SHALL start in the currently focused project directory, or in the user's home directory when no project is focused.

#### Scenario: Focused project exists

- **WHEN** project `/repo/app` is focused
- **AND** the user creates a new terminal session
- **THEN** the shell process starts with cwd `/repo/app`

#### Scenario: Focus changes after session creation

- **WHEN** a terminal session was created while project `/repo/app` was focused
- **AND** the user later focuses project `/repo/api`
- **THEN** the existing terminal session keeps cwd `/repo/app`
- **AND** a newly created terminal session starts with cwd `/repo/api`

#### Scenario: No focused project exists

- **WHEN** no project is focused
- **AND** the user creates a new terminal session
- **THEN** the shell process starts with cwd set to the user's home directory

#### Scenario: Home directory cannot be resolved

- **WHEN** no project is focused
- **AND** the Tauri Rust process cannot resolve the user's home directory
- **THEN** terminal session creation is unavailable
- **AND** the UI shows a recoverable terminal issue

### Requirement: Multiple terminal sessions

The system SHALL support multiple terminal sessions in one desktop app process.

#### Scenario: User creates multiple sessions

- **WHEN** a user creates more than one terminal session
- **THEN** each session has independent shell process state
- **AND** the terminal panel provides a way to switch between sessions
- **AND** the active session's output and input focus are shown

#### Scenario: User closes a session

- **WHEN** a user closes one terminal session
- **THEN** the Tauri Rust process terminates that session's shell process
- **AND** other terminal sessions remain running

#### Scenario: User minimizes terminal panel

- **WHEN** a user minimizes the terminal panel without closing a session tab
- **THEN** all terminal shell processes keep running
- **AND** the user can reopen the panel and continue using the same sessions

### Requirement: Terminal sessions survive UI navigation

Terminal sessions SHALL stay alive while the Tauri Rust process remains alive.

#### Scenario: Terminal panel is minimized

- **WHEN** a terminal session is running
- **AND** the user minimizes the terminal panel
- **THEN** the shell process keeps running
- **AND** the user can restore the panel and continue using the same session

#### Scenario: User navigates between routes

- **WHEN** a terminal session is running
- **AND** the user navigates to another route inside spec-ui
- **THEN** the shell process keeps running
- **AND** the terminal session remains available from the terminal launcher

#### Scenario: Webview refreshes while Tauri Rust process survives

- **WHEN** the desktop webview refreshes
- **AND** the Tauri Rust process remains alive
- **THEN** existing terminal sessions remain alive
- **AND** the UI reconnects to available session metadata
- **AND** the UI replays the session's bounded recent-output buffer before continuing live output streaming

#### Scenario: App exits

- **WHEN** the user exits the desktop app
- **THEN** the Tauri Rust process terminates managed terminal shell processes
- **AND** no terminal session process is intentionally left orphaned

### Requirement: Terminal resizing

The terminal SHALL propagate UI size changes to the PTY session.

#### Scenario: User resizes terminal panel

- **WHEN** the user drags the terminal panel's resize rail
- **THEN** the active PTY receives updated rows and columns
- **AND** terminal output remains readable without requiring a new session

#### Scenario: User maximizes terminal panel

- **WHEN** the user activates the terminal maximize control
- **THEN** the terminal panel expands inside the app workspace
- **AND** the active PTY receives updated rows and columns
- **AND** restoring the panel returns it to the previous floating size
