use std::{
    net::{SocketAddr, TcpStream},
    time::{Duration, Instant},
};

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

mod runtime;
mod terminal;

const HOST: &str = "127.0.0.1";
const DEV_RENDERER_PORT: u16 = 1420;
const STARTUP_TIMEOUT: Duration = Duration::from_secs(30);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(runtime::state::RuntimeManager::default())
        .manage(terminal::TerminalManager::default())
        .invoke_handler(tauri::generate_handler![
            runtime::state::runtime_snapshot,
            runtime::state::runtime_add_project,
            runtime::state::runtime_focus_project,
            runtime::state::runtime_remove_project,
            runtime::state::runtime_clear_projects,
            runtime::state::runtime_relocate_project,
            runtime::state::runtime_update_project_workspace_directory,
            runtime::state::runtime_update_project_worktrees_directory,
            runtime::state::runtime_add_project_worktree_path,
            runtime::state::runtime_remove_project_worktree_path,
            runtime::state::runtime_refresh_project,
            runtime::state::runtime_set_change_task_completed,
            runtime::state::runtime_set_theme,
            runtime::state::runtime_set_language,
            runtime::state::runtime_run_validation,
            terminal::commands::terminal_detect_environment,
            terminal::commands::terminal_list_sessions,
            terminal::commands::terminal_create_session,
            terminal::commands::terminal_write,
            terminal::commands::terminal_resize,
            terminal::commands::terminal_close_session,
        ])
        .setup(|app| {
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            let runtime = app.state::<runtime::state::RuntimeManager>();
            runtime.initialize();
            runtime.start_watcher(app.handle().clone());

            if cfg!(debug_assertions) {
                wait_for_port(DEV_RENDERER_PORT, STARTUP_TIMEOUT)?;
                create_dev_window(app, DEV_RENDERER_PORT)?;
            } else {
                create_static_window(app)?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                window.state::<terminal::TerminalManager>().close_all();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn create_dev_window(app: &tauri::App, web_port: u16) -> Result<(), Box<dyn std::error::Error>> {
    let url = format!("http://{HOST}:{web_port}");
    WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url.parse()?))
        .on_navigation(move |url| is_allowed_app_navigation(url, web_port))
        .title("spec-ui")
        .inner_size(1280.0, 860.0)
        .min_inner_size(1024.0, 720.0)
        .resizable(true)
        .build()?;
    Ok(())
}

fn create_static_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("spec-ui")
        .inner_size(1280.0, 860.0)
        .min_inner_size(1024.0, 720.0)
        .resizable(true)
        .build()?;
    Ok(())
}

fn is_allowed_app_navigation(url: &tauri::Url, web_port: u16) -> bool {
    url.scheme() == "http"
        && url.host_str() == Some(HOST)
        && url.port_or_known_default() == Some(web_port)
}

fn wait_for_port(port: u16, timeout: Duration) -> Result<(), Box<dyn std::error::Error>> {
    let address: SocketAddr = format!("{HOST}:{port}").parse()?;
    let deadline = Instant::now() + timeout;

    while Instant::now() < deadline {
        if TcpStream::connect_timeout(&address, Duration::from_millis(250)).is_ok() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(250));
    }

    Err(format!("Timed out waiting for local service on {address}").into())
}
