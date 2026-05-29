use std::{collections::VecDeque, io::Write, path::PathBuf};

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use tauri::{AppHandle, State};

use super::{
    environment::{resolve_session_cwd, shell_startup_args, terminal_session_path},
    pty::{spawn_exit_watcher, spawn_output_reader},
    session::{terminate_session, TerminalManager},
    types::{
        terminal_issue, HostTerminalEnvironment, TerminalIssue, TerminalResult, TerminalSession,
        TerminalSessionInfo, TerminalSnapshot, DEFAULT_COLS, DEFAULT_ROWS,
    },
};

#[tauri::command]
pub async fn terminal_detect_environment(
    manager: State<'_, TerminalManager>,
) -> TerminalResult<HostTerminalEnvironment> {
    let manager = manager.inner().clone();
    run_terminal_blocking("The terminal environment worker failed.", move || {
        manager.detect_environment()
    })
    .await
}

#[tauri::command]
pub async fn terminal_list_sessions(
    manager: State<'_, TerminalManager>,
) -> TerminalResult<TerminalSnapshot> {
    let manager = manager.inner().clone();
    run_terminal_blocking("The terminal snapshot worker failed.", move || {
        Ok(manager.snapshot())
    })
    .await
}

#[tauri::command]
pub async fn terminal_create_session(
    app: AppHandle,
    manager: State<'_, TerminalManager>,
    cwd: Option<String>,
    rows: Option<u16>,
    cols: Option<u16>,
) -> TerminalResult<TerminalSessionInfo> {
    let manager = manager.inner().clone();
    run_terminal_blocking("The terminal session worker failed.", move || {
        create_session_blocking(app, manager, cwd, rows, cols)
    })
    .await
}

fn create_session_blocking(
    app: AppHandle,
    manager: TerminalManager,
    cwd: Option<String>,
    rows: Option<u16>,
    cols: Option<u16>,
) -> TerminalResult<TerminalSessionInfo> {
    let environment = manager.detect_environment()?;
    let cwd = resolve_session_cwd(cwd)?;
    let size = PtySize {
        rows: rows.unwrap_or(DEFAULT_ROWS).max(1),
        cols: cols.unwrap_or(DEFAULT_COLS).max(1),
        pixel_width: 0,
        pixel_height: 0,
    };

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(size)
        .map_err(|error| terminal_issue("pty-open-failed", "Failed to open PTY.", error))?;

    let shell_path = PathBuf::from(&environment.shell_path);
    let mut command = CommandBuilder::new(&shell_path);
    command.args(shell_startup_args(&shell_path));
    command.cwd(cwd.as_os_str());
    command.env("TERM", "xterm-256color");
    command.env("SHELL", shell_path.as_os_str());
    if let Some(path) = terminal_session_path() {
        command.env("PATH", path);
    }

    let reader = pair.master.try_clone_reader().map_err(|error| {
        terminal_issue(
            "pty-reader-failed",
            "Failed to attach the PTY output stream.",
            error,
        )
    })?;
    let child = pair
        .slave
        .spawn_command(command)
        .map_err(|error| terminal_issue("shell-start-failed", "Failed to start shell.", error))?;
    let killer = child.clone_killer();
    let writer = pair.master.take_writer().map_err(|error| {
        terminal_issue(
            "pty-writer-failed",
            "Failed to attach the PTY input stream.",
            error,
        )
    })?;

    let (id, sequence, label, created_at) = manager.allocate_session_identity(&cwd, &shell_path);
    let session = TerminalSession {
        id: id.clone(),
        sequence,
        label,
        cwd,
        shell_path,
        created_at,
        rows: size.rows,
        cols: size.cols,
        master: pair.master,
        writer,
        killer,
        buffer: VecDeque::new(),
        exited: false,
        exit_status: None,
    };
    let info = TerminalSessionInfo::from_session(&session);

    manager.insert_session(id.clone(), session);

    spawn_output_reader(app.clone(), manager.clone(), id.clone(), reader);
    spawn_exit_watcher(app, manager, id, child);

    Ok(info)
}

#[tauri::command]
pub async fn terminal_write(
    manager: State<'_, TerminalManager>,
    session_id: String,
    data: String,
) -> TerminalResult<()> {
    let manager = manager.inner().clone();
    run_terminal_blocking("The terminal write worker failed.", move || {
        write_terminal_blocking(&manager, session_id, data)
    })
    .await
}

fn write_terminal_blocking(
    manager: &TerminalManager,
    session_id: String,
    data: String,
) -> TerminalResult<()> {
    let mut state = manager.inner.lock().expect("terminal state lock poisoned");
    let session = state.sessions.get_mut(&session_id).ok_or_else(|| {
        TerminalIssue::new(
            "session-not-found",
            "Terminal session was not found.",
            Some(session_id.clone()),
        )
    })?;

    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|error| terminal_issue("pty-write-failed", "Failed to write to PTY.", error))?;
    session
        .writer
        .flush()
        .map_err(|error| terminal_issue("pty-write-failed", "Failed to flush PTY input.", error))?;
    Ok(())
}

#[tauri::command]
pub async fn terminal_resize(
    manager: State<'_, TerminalManager>,
    session_id: String,
    rows: u16,
    cols: u16,
) -> TerminalResult<()> {
    let manager = manager.inner().clone();
    run_terminal_blocking("The terminal resize worker failed.", move || {
        resize_terminal_blocking(&manager, session_id, rows, cols)
    })
    .await
}

fn resize_terminal_blocking(
    manager: &TerminalManager,
    session_id: String,
    rows: u16,
    cols: u16,
) -> TerminalResult<()> {
    let mut state = manager.inner.lock().expect("terminal state lock poisoned");
    let session = state.sessions.get_mut(&session_id).ok_or_else(|| {
        TerminalIssue::new(
            "session-not-found",
            "Terminal session was not found.",
            Some(session_id.clone()),
        )
    })?;

    let rows = rows.max(1);
    let cols = cols.max(1);
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| terminal_issue("pty-resize-failed", "Failed to resize PTY.", error))?;
    session.rows = rows;
    session.cols = cols;
    Ok(())
}

#[tauri::command]
pub async fn terminal_close_session(
    manager: State<'_, TerminalManager>,
    session_id: String,
) -> TerminalResult<TerminalSnapshot> {
    let manager = manager.inner().clone();
    run_terminal_blocking("The terminal close worker failed.", move || {
        close_terminal_blocking(&manager, session_id)
    })
    .await
}

fn close_terminal_blocking(
    manager: &TerminalManager,
    session_id: String,
) -> TerminalResult<TerminalSnapshot> {
    match manager.remove_session(&session_id) {
        Some(session) => {
            terminate_session(session);
            Ok(manager.snapshot())
        }
        None => Err(TerminalIssue::new(
            "session-not-found",
            "Terminal session was not found.",
            Some(session_id),
        )),
    }
}

async fn run_terminal_blocking<T>(
    message: &'static str,
    task: impl FnOnce() -> TerminalResult<T> + Send + 'static,
) -> TerminalResult<T>
where
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|error| TerminalIssue::new("terminal-error", message, Some(error.to_string())))?
}
