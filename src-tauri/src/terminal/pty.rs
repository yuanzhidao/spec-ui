use std::{io::Read, thread};

use portable_pty::Child;
use tauri::{AppHandle, Emitter};

use super::{
    session::TerminalManager,
    types::{TerminalExitEvent, TerminalOutputEvent, TERMINAL_EXIT_EVENT, TERMINAL_OUTPUT_EVENT},
};

pub(super) fn spawn_output_reader(
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

pub(super) fn spawn_exit_watcher(
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

fn format_exit_status(status: portable_pty::ExitStatus) -> String {
    if status.success() {
        format!("Exited {}", status.exit_code())
    } else if let Some(signal) = status.signal() {
        format!("Exited by {signal}")
    } else {
        format!("Exited {}", status.exit_code())
    }
}
