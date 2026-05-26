use std::{
    collections::VecDeque,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

use super::{
    environment::{detect_host_terminal_environment, session_label},
    types::{
        HostTerminalEnvironment, TerminalResult, TerminalSession, TerminalSessionInfo,
        TerminalSnapshot, TerminalState, OUTPUT_BUFFER_LIMIT,
    },
};

#[derive(Clone, Default)]
pub struct TerminalManager {
    pub(super) inner: Arc<Mutex<TerminalState>>,
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

    pub(super) fn detect_environment(&self) -> TerminalResult<HostTerminalEnvironment> {
        let mut state = self.inner.lock().expect("terminal state lock poisoned");
        if let Some(environment) = &state.environment {
            return environment.clone();
        }

        let environment = detect_host_terminal_environment();
        state.environment = Some(environment.clone());
        environment
    }

    pub(super) fn snapshot(&self) -> TerminalSnapshot {
        let environment = self.detect_environment();
        let (environment, issue) = match environment {
            Ok(environment) => (Some(environment), None),
            Err(issue) => (None, Some(issue)),
        };

        TerminalSnapshot::new(environment, issue, self.session_infos())
    }

    pub(super) fn allocate_session_identity(
        &self,
        cwd: &std::path::Path,
        shell_path: &std::path::Path,
    ) -> (String, u64, String, u64) {
        let mut state = self.inner.lock().expect("terminal state lock poisoned");
        state.next_session_number += 1;
        (
            format!("terminal-{}", state.next_session_number),
            state.next_session_number,
            session_label(state.next_session_number, cwd, shell_path),
            unix_timestamp(),
        )
    }

    pub(super) fn insert_session(&self, id: String, session: TerminalSession) {
        let mut state = self.inner.lock().expect("terminal state lock poisoned");
        state.sessions.insert(id, session);
    }

    pub(super) fn remove_session(&self, session_id: &str) -> Option<TerminalSession> {
        let mut state = self.inner.lock().expect("terminal state lock poisoned");
        state.sessions.remove(session_id)
    }

    pub(super) fn mark_output(&self, session_id: &str, bytes: &[u8]) {
        let mut state = self.inner.lock().expect("terminal state lock poisoned");
        if let Some(session) = state.sessions.get_mut(session_id) {
            session.buffer.extend(bytes);
            trim_buffer(&mut session.buffer);
        }
    }

    pub(super) fn mark_exited(&self, session_id: &str, status: Option<String>) {
        let mut state = self.inner.lock().expect("terminal state lock poisoned");
        if let Some(session) = state.sessions.get_mut(session_id) {
            session.exited = true;
            session.exit_status = status;
        }
    }

    fn session_infos(&self) -> Vec<TerminalSessionInfo> {
        let state = self.inner.lock().expect("terminal state lock poisoned");
        let mut sessions = state.sessions.values().collect::<Vec<_>>();
        sessions.sort_by_key(|session| session.sequence);
        sessions
            .into_iter()
            .map(TerminalSessionInfo::from_session)
            .collect()
    }
}

pub(super) fn terminate_session(mut session: TerminalSession) {
    let _ = session.killer.kill();
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn output_buffer_is_bounded() {
        let mut buffer = VecDeque::from(vec![0_u8; OUTPUT_BUFFER_LIMIT + 8]);

        trim_buffer(&mut buffer);

        assert_eq!(buffer.len(), OUTPUT_BUFFER_LIMIT);
    }
}
