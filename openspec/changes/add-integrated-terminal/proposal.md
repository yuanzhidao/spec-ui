# Add Integrated Terminal

## Why

spec-ui is moving toward a desktop-first workflow where users manage local spec-driven projects from one workbench. Users need a terminal that stays attached to the desktop app, starts in the focused project directory, and remains available while navigating or refreshing the UI.

## What Changes

- Add a desktop-only integrated terminal launcher in the app chrome, anchored near the lower-right area.
- Open an integrated terminal panel that is backed by the user's system shell through a PTY owned by the Tauri Rust process.
- Detect the host terminal environment before session creation, including platform information and the selected shell.
- Create new terminal sessions with `cwd` set to the currently focused project directory, falling back to the user's home directory when no project is focused.
- Support multiple terminal sessions with tab-style switching, creating, closing, and renaming or readable labels.
- Allow the terminal panel to be resized with low-visibility edge rails and maximized/restored inside the app workspace.
- Keep terminal sessions alive while the Tauri Rust process remains alive, including route changes, panel minimization, and webview refreshes.
- Allow users to minimize or restore the terminal UI without terminating running shell processes.
- Terminate a shell process only when the user explicitly closes that terminal session or exits the app.

## Non-Goals

- Do not support terminal sessions in browser-only Web mode.
- Do not open external terminal applications such as Terminal.app, iTerm2, Windows Terminal, or GNOME Terminal in this change.
- Do not implement a shell, command parser, or terminal emulator from scratch.
- Do not persist terminal processes across full app restarts.
- Do not add first-open safety confirmation in this change.
- Do not add remote terminal access, SSH management, shared terminals, or cloud execution.
- Do not add terminal command history indexing, transcript search, or AI terminal assistance in this change.
