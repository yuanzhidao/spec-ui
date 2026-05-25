use std::{
    collections::{HashMap, VecDeque},
    env, fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::Command as StdCommand,
    sync::{Arc, Mutex},
    thread,
    time::{SystemTime, UNIX_EPOCH},
};

use portable_pty::{native_pty_system, Child, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

const DEFAULT_ROWS: u16 = 24;
const DEFAULT_COLS: u16 = 80;
const OUTPUT_BUFFER_LIMIT: usize = 256 * 1024;
const TERMINAL_OUTPUT_EVENT: &str = "terminal-output";
const TERMINAL_EXIT_EVENT: &str = "terminal-exit";

type TerminalResult<T> = Result<T, TerminalIssue>;

#[derive(Clone, Default)]
pub struct TerminalManager {
    inner: Arc<Mutex<TerminalState>>,
}

#[derive(Default)]
struct TerminalState {
    next_session_number: u64,
    environment: Option<TerminalResult<HostTerminalEnvironment>>,
    sessions: HashMap<String, TerminalSession>,
}

struct TerminalSession {
    id: String,
    sequence: u64,
    label: String,
    cwd: PathBuf,
    shell_path: PathBuf,
    created_at: u64,
    rows: u16,
    cols: u16,
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
    buffer: VecDeque<u8>,
    exited: bool,
    exit_status: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostTerminalEnvironment {
    os_family: String,
    os_version: Option<String>,
    architecture: String,
    shell_path: String,
    shell_version: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalIssue {
    code: String,
    message: String,
    detail: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSnapshot {
    environment: Option<HostTerminalEnvironment>,
    issue: Option<TerminalIssue>,
    sessions: Vec<TerminalSessionInfo>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSessionInfo {
    id: String,
    label: String,
    cwd: String,
    shell_path: String,
    created_at: u64,
    rows: u16,
    cols: u16,
    buffer: Vec<u8>,
    exited: bool,
    exit_status: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalOutputEvent {
    session_id: String,
    bytes: Vec<u8>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalExitEvent {
    session_id: String,
    exit_status: Option<String>,
}

impl TerminalManager {
    pub fn close_all(&self) {
        let sessions = {
            let mut state = self.inner.lock().expect("terminal state lock poisoned");
            state
                .sessions
                .drain()
                .map(|(_, session)| session)
                .collect::<Vec<_>>()
        };

        for session in sessions {
            terminate_session(session);
        }
    }

    fn detect_environment(&self) -> TerminalResult<HostTerminalEnvironment> {
        let mut state = self.inner.lock().expect("terminal state lock poisoned");
        if let Some(environment) = &state.environment {
            return environment.clone();
        }

        let environment = detect_host_terminal_environment();
        state.environment = Some(environment.clone());
        environment
    }

    fn snapshot(&self) -> TerminalSnapshot {
        let environment = self.detect_environment();
        let (environment, issue) = match environment {
            Ok(environment) => (Some(environment), None),
            Err(issue) => (None, Some(issue)),
        };

        TerminalSnapshot {
            environment,
            issue,
            sessions: self.session_infos(),
        }
    }

    fn session_infos(&self) -> Vec<TerminalSessionInfo> {
        let state = self.inner.lock().expect("terminal state lock poisoned");
        let mut sessions = state.sessions.values().collect::<Vec<_>>();
        sessions.sort_by_key(|session| session.sequence);
        sessions.into_iter().map(session_info).collect()
    }

    fn mark_output(&self, session_id: &str, bytes: &[u8]) {
        let mut state = self.inner.lock().expect("terminal state lock poisoned");
        if let Some(session) = state.sessions.get_mut(session_id) {
            session.buffer.extend(bytes);
            trim_buffer(&mut session.buffer);
        }
    }

    fn mark_exited(&self, session_id: &str, status: Option<String>) {
        let mut state = self.inner.lock().expect("terminal state lock poisoned");
        if let Some(session) = state.sessions.get_mut(session_id) {
            session.exited = true;
            session.exit_status = status;
        }
    }
}

#[tauri::command]
pub fn terminal_detect_environment(
    manager: State<'_, TerminalManager>,
) -> TerminalResult<HostTerminalEnvironment> {
    manager.detect_environment()
}

#[tauri::command]
pub fn terminal_list_sessions(manager: State<'_, TerminalManager>) -> TerminalSnapshot {
    manager.snapshot()
}

#[tauri::command]
pub fn terminal_create_session(
    app: AppHandle,
    manager: State<'_, TerminalManager>,
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
    command.cwd(cwd.as_os_str());
    command.env("TERM", "xterm-256color");

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

    let (id, sequence, label, created_at) = {
        let mut state = manager.inner.lock().expect("terminal state lock poisoned");
        state.next_session_number += 1;
        (
            format!("terminal-{}", state.next_session_number),
            state.next_session_number,
            session_label(state.next_session_number, &cwd, &shell_path),
            unix_timestamp(),
        )
    };

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
    let info = session_info(&session);

    {
        let mut state = manager.inner.lock().expect("terminal state lock poisoned");
        state.sessions.insert(id.clone(), session);
    }

    spawn_output_reader(app.clone(), manager.inner().clone(), id.clone(), reader);
    spawn_exit_watcher(app, manager.inner().clone(), id, child);

    Ok(info)
}

#[tauri::command]
pub fn terminal_write(
    manager: State<'_, TerminalManager>,
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
pub fn terminal_resize(
    manager: State<'_, TerminalManager>,
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
pub fn terminal_close_session(
    manager: State<'_, TerminalManager>,
    session_id: String,
) -> TerminalResult<TerminalSnapshot> {
    let session = {
        let mut state = manager.inner.lock().expect("terminal state lock poisoned");
        state.sessions.remove(&session_id)
    };

    match session {
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

fn spawn_output_reader(
    app: AppHandle,
    manager: TerminalManager,
    session_id: String,
    mut reader: Box<dyn Read + Send>,
) {
    thread::spawn(move || {
        let mut buffer = [0_u8; 8192];

        loop {
            match reader.read(&mut buffer) {
                Ok(0) => {
                    break;
                }
                Ok(read) => {
                    let bytes = buffer[..read].to_vec();
                    manager.mark_output(&session_id, &bytes);
                    let _ = app.emit(
                        TERMINAL_OUTPUT_EVENT,
                        TerminalOutputEvent {
                            session_id: session_id.clone(),
                            bytes,
                        },
                    );
                }
                Err(_) => {
                    break;
                }
            }
        }
    });
}

fn spawn_exit_watcher(
    app: AppHandle,
    manager: TerminalManager,
    session_id: String,
    mut child: Box<dyn Child + Send + Sync>,
) {
    thread::spawn(move || {
        let status = match child.wait() {
            Ok(status) => Some(format_exit_status(status)),
            Err(error) => Some(format!("Terminal process wait failed: {error}")),
        };

        manager.mark_exited(&session_id, status.clone());
        let _ = app.emit(
            TERMINAL_EXIT_EVENT,
            TerminalExitEvent {
                session_id,
                exit_status: status,
            },
        );
    });
}

fn detect_host_terminal_environment() -> TerminalResult<HostTerminalEnvironment> {
    let shell_path = detect_shell_path()?;
    Ok(HostTerminalEnvironment {
        os_family: env::consts::OS.to_string(),
        os_version: detect_os_version(),
        architecture: env::consts::ARCH.to_string(),
        shell_version: detect_shell_version(&shell_path),
        shell_path: shell_path.display().to_string(),
    })
}

#[cfg(unix)]
fn detect_shell_path() -> TerminalResult<PathBuf> {
    if let Some(shell) = env::var_os("SHELL").map(PathBuf::from) {
        if is_executable_file(&shell) {
            return Ok(shell);
        }
    }

    ["/bin/zsh", "/bin/bash", "/bin/sh"]
        .iter()
        .map(PathBuf::from)
        .find(|path| is_executable_file(path))
        .ok_or_else(|| {
            TerminalIssue::new(
                "unsupported-shell",
                "No supported system shell could be resolved.",
                None,
            )
        })
}

#[cfg(windows)]
fn detect_shell_path() -> TerminalResult<PathBuf> {
    if let Some(shell) = env::var_os("COMSPEC").map(PathBuf::from) {
        if is_executable_file(&shell) {
            return Ok(shell);
        }
    }

    ["pwsh.exe", "powershell.exe", "cmd.exe"]
        .iter()
        .find_map(find_command_on_path)
        .ok_or_else(|| {
            TerminalIssue::new(
                "unsupported-shell",
                "No supported system shell could be resolved.",
                None,
            )
        })
}

#[cfg(unix)]
fn is_executable_file(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;

    fs::metadata(path)
        .map(|metadata| metadata.is_file() && metadata.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

#[cfg(windows)]
fn is_executable_file(path: &Path) -> bool {
    fs::metadata(path)
        .map(|metadata| metadata.is_file())
        .unwrap_or(false)
}

#[cfg(windows)]
fn find_command_on_path(program: &&str) -> Option<PathBuf> {
    let output = StdCommand::new("where").arg(program).output().ok()?;
    if !output.status.success() {
        return None;
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(PathBuf::from)
        .find(|path| is_executable_file(path))
}

fn detect_os_version() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        command_stdout("sw_vers", &["-productVersion"])
    }

    #[cfg(target_os = "linux")]
    {
        read_linux_os_release().or_else(|| command_stdout("uname", &["-sr"]))
    }

    #[cfg(windows)]
    {
        command_stdout("cmd", &["/C", "ver"])
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", windows)))]
    {
        None
    }
}

#[cfg(target_os = "linux")]
fn read_linux_os_release() -> Option<String> {
    let content = fs::read_to_string("/etc/os-release").ok()?;
    content.lines().find_map(|line| {
        let (key, value) = line.split_once('=')?;
        if key != "PRETTY_NAME" {
            return None;
        }

        Some(value.trim_matches('"').to_string())
    })
}

fn detect_shell_version(shell_path: &Path) -> Option<String> {
    let shell_name = shell_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    let args: Vec<&str> = if shell_name.contains("powershell") || shell_name == "pwsh.exe" {
        vec![
            "-NoLogo",
            "-NoProfile",
            "-Command",
            "$PSVersionTable.PSVersion.ToString()",
        ]
    } else if shell_name == "cmd.exe" {
        vec!["/C", "ver"]
    } else {
        vec!["--version"]
    };

    command_stdout(shell_path, &args)
}

fn command_stdout<S: AsRef<std::ffi::OsStr>>(program: S, args: &[&str]) -> Option<String> {
    let output = StdCommand::new(program).args(args).output().ok()?;
    if !output.status.success() {
        return None;
    }

    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if text.is_empty() {
        None
    } else {
        Some(text.lines().next().unwrap_or_default().trim().to_string())
    }
}

fn resolve_session_cwd(requested: Option<String>) -> TerminalResult<PathBuf> {
    if let Some(path) = requested.filter(|path| !path.trim().is_empty()) {
        let path = PathBuf::from(path);
        if path.is_dir() {
            return Ok(path);
        }

        return Err(TerminalIssue::new(
            "invalid-cwd",
            "Terminal working directory is not available.",
            Some(path.display().to_string()),
        ));
    }

    home_dir().ok_or_else(|| {
        TerminalIssue::new(
            "home-unavailable",
            "Home directory could not be resolved for terminal startup.",
            None,
        )
    })
}

fn home_dir() -> Option<PathBuf> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .filter(|path| path.is_dir())
        .or_else(|| {
            env::var_os("USERPROFILE")
                .map(PathBuf::from)
                .filter(|path| path.is_dir())
        })
        .or_else(|| {
            let drive = env::var_os("HOMEDRIVE")?;
            let path = env::var_os("HOMEPATH")?;
            let mut home = PathBuf::from(drive);
            home.push(path);
            home.is_dir().then_some(home)
        })
}

fn session_label(number: u64, cwd: &Path, shell_path: &Path) -> String {
    let cwd_name = cwd.file_name().and_then(|name| name.to_str());
    let shell_name = shell_path.file_name().and_then(|name| name.to_str());

    match (cwd_name, shell_name) {
        (Some(cwd_name), Some(shell_name)) => format!("{cwd_name} · {shell_name}"),
        (Some(cwd_name), None) => cwd_name.to_string(),
        (None, Some(shell_name)) => shell_name.to_string(),
        (None, None) => format!("Terminal {number}"),
    }
}

fn terminate_session(mut session: TerminalSession) {
    let _ = session.killer.kill();
}

fn format_exit_status(status: portable_pty::ExitStatus) -> String {
    if status.success() {
        format!("Exited {}", status.exit_code())
    } else if let Some(signal) = status.signal() {
        format!("Exited by {signal}")
    } else {
        format!("Exited {}", status.exit_code())
    }
}

fn session_info(session: &TerminalSession) -> TerminalSessionInfo {
    TerminalSessionInfo {
        id: session.id.clone(),
        label: session.label.clone(),
        cwd: session.cwd.display().to_string(),
        shell_path: session.shell_path.display().to_string(),
        created_at: session.created_at,
        rows: session.rows,
        cols: session.cols,
        buffer: session.buffer.iter().copied().collect(),
        exited: session.exited,
        exit_status: session.exit_status.clone(),
    }
}

fn trim_buffer(buffer: &mut VecDeque<u8>) {
    while buffer.len() > OUTPUT_BUFFER_LIMIT {
        buffer.pop_front();
    }
}

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn terminal_issue(
    code: impl Into<String>,
    message: impl Into<String>,
    error: impl std::fmt::Display,
) -> TerminalIssue {
    TerminalIssue::new(code, message, Some(error.to_string()))
}

impl TerminalIssue {
    fn new(code: impl Into<String>, message: impl Into<String>, detail: Option<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            detail,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn explicit_existing_directory_is_used_as_cwd() {
        let cwd = resolve_session_cwd(Some(env::temp_dir().display().to_string()))
            .expect("temp directory should be valid cwd");

        assert_eq!(cwd, env::temp_dir());
    }

    #[test]
    fn missing_explicit_directory_returns_recoverable_issue() {
        let missing = env::temp_dir().join("spec-ui-missing-terminal-cwd");
        let issue = resolve_session_cwd(Some(missing.display().to_string()))
            .expect_err("missing cwd should be rejected");

        assert_eq!(issue.code, "invalid-cwd");
    }

    #[test]
    fn empty_cwd_falls_back_to_home_directory_when_available() {
        if let Some(home) = home_dir() {
            let cwd = resolve_session_cwd(None).expect("home directory should be valid cwd");

            assert_eq!(cwd, home);
        }
    }

    #[test]
    fn output_buffer_is_bounded() {
        let mut buffer = VecDeque::from(vec![0_u8; OUTPUT_BUFFER_LIMIT + 8]);

        trim_buffer(&mut buffer);

        assert_eq!(buffer.len(), OUTPUT_BUFFER_LIMIT);
    }

    #[test]
    fn session_label_uses_cwd_and_shell_names() {
        let label = session_label(1, Path::new("/workspace/spec-ui"), Path::new("/bin/zsh"));

        assert_eq!(label, "spec-ui · zsh");
    }
}
