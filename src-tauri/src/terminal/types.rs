use std::{
    collections::{HashMap, VecDeque},
    io::Write,
    path::PathBuf,
};

use portable_pty::{ChildKiller, MasterPty};
use serde::Serialize;

pub(super) const DEFAULT_ROWS: u16 = 24;
pub(super) const DEFAULT_COLS: u16 = 80;
pub(super) const OUTPUT_BUFFER_LIMIT: usize = 256 * 1024;
pub(super) const TERMINAL_OUTPUT_EVENT: &str = "terminal-output";
pub(super) const TERMINAL_EXIT_EVENT: &str = "terminal-exit";

pub type TerminalResult<T> = Result<T, TerminalIssue>;

#[derive(Default)]
pub(super) struct TerminalState {
    pub(super) next_session_number: u64,
    pub(super) environment: Option<TerminalResult<HostTerminalEnvironment>>,
    pub(super) sessions: HashMap<String, TerminalSession>,
}

pub(super) struct TerminalSession {
    pub(super) id: String,
    pub(super) sequence: u64,
    pub(super) label: String,
    pub(super) cwd: PathBuf,
    pub(super) shell_path: PathBuf,
    pub(super) created_at: u64,
    pub(super) rows: u16,
    pub(super) cols: u16,
    pub(super) master: Box<dyn MasterPty + Send>,
    pub(super) writer: Box<dyn Write + Send>,
    pub(super) killer: Box<dyn ChildKiller + Send + Sync>,
    pub(super) buffer: VecDeque<u8>,
    pub(super) exited: bool,
    pub(super) exit_status: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostTerminalEnvironment {
    os_family: String,
    os_version: Option<String>,
    architecture: String,
    pub(super) shell_path: String,
    shell_version: Option<String>,
}

impl HostTerminalEnvironment {
    pub(super) fn new(
        os_family: String,
        os_version: Option<String>,
        architecture: String,
        shell_path: String,
        shell_version: Option<String>,
    ) -> Self {
        Self {
            os_family,
            os_version,
            architecture,
            shell_path,
            shell_version,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalIssue {
    pub(super) code: String,
    message: String,
    detail: Option<String>,
}

impl TerminalIssue {
    pub(super) fn new(
        code: impl Into<String>,
        message: impl Into<String>,
        detail: Option<String>,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            detail,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSnapshot {
    environment: Option<HostTerminalEnvironment>,
    issue: Option<TerminalIssue>,
    sessions: Vec<TerminalSessionInfo>,
}

impl TerminalSnapshot {
    pub(super) fn new(
        environment: Option<HostTerminalEnvironment>,
        issue: Option<TerminalIssue>,
        sessions: Vec<TerminalSessionInfo>,
    ) -> Self {
        Self {
            environment,
            issue,
            sessions,
        }
    }
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

impl TerminalSessionInfo {
    pub(super) fn from_session(session: &TerminalSession) -> Self {
        Self {
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
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TerminalOutputEvent {
    pub(super) session_id: String,
    pub(super) bytes: Vec<u8>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TerminalExitEvent {
    pub(super) session_id: String,
    pub(super) exit_status: Option<String>,
}

pub(super) fn terminal_issue(
    code: impl Into<String>,
    message: impl Into<String>,
    error: impl std::fmt::Display,
) -> TerminalIssue {
    TerminalIssue::new(code, message, Some(error.to_string()))
}
