use std::{
    net::{SocketAddr, TcpListener, TcpStream},
    path::PathBuf,
    sync::Mutex,
    time::{Duration, Instant},
};

use tauri::{path::BaseDirectory, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

mod terminal;

const HOST: &str = "127.0.0.1";
const DEV_WEB_PORT: u16 = 3000;
const STARTUP_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Default)]
struct ManagedProcesses {
    children: Mutex<Vec<CommandChild>>,
}

impl ManagedProcesses {
    fn push(&self, child: CommandChild) {
        self.children
            .lock()
            .expect("managed process lock poisoned")
            .push(child);
    }

    fn kill_all(&self) {
        let mut children = self.children.lock().expect("managed process lock poisoned");
        for child in children.drain(..) {
            let _ = child.kill();
        }
    }
}

impl Drop for ManagedProcesses {
    fn drop(&mut self) {
        self.kill_all();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ManagedProcesses::default())
        .manage(terminal::TerminalManager::default())
        .invoke_handler(tauri::generate_handler![
            terminal::terminal_detect_environment,
            terminal::terminal_list_sessions,
            terminal::terminal_create_session,
            terminal::terminal_write,
            terminal::terminal_resize,
            terminal::terminal_close_session,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
                wait_for_port(DEV_WEB_PORT, STARTUP_TIMEOUT)?;
                create_main_window(app, DEV_WEB_PORT)?;
                return Ok(());
            }

            let (web_port, runtime_port) = available_ports()?;
            start_desktop_runtime(app, web_port, runtime_port)?;
            wait_for_port(runtime_port, STARTUP_TIMEOUT)?;
            wait_for_port(web_port, STARTUP_TIMEOUT)?;
            create_main_window(app, web_port)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                window.state::<ManagedProcesses>().kill_all();
                window.state::<terminal::TerminalManager>().close_all();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn start_desktop_runtime(
    app: &tauri::App,
    web_port: u16,
    runtime_port: u16,
) -> Result<(), Box<dyn std::error::Error>> {
    let web_dir = resolve_resource(app, "desktop-runtime/web")?;
    let web_server = web_dir.join("server.js");
    let runtime_server = resolve_resource(app, "desktop-runtime/runtime/server.mjs")?;
    let runtime_http = format!("http://{HOST}:{runtime_port}");
    let runtime_ws = format!("ws://{HOST}:{runtime_port}");
    let web_origin = format!("http://{HOST}:{web_port}");
    let allowed_origins = format!("{web_origin},http://localhost:{web_port}");

    let runtime_child = spawn_node(
        app,
        "runtime",
        &runtime_server,
        resolve_resource(app, "desktop-runtime/runtime")?,
        [
            ("SPEC_UI_RUNTIME_HOST", HOST.to_string()),
            ("SPEC_UI_RUNTIME_PORT", runtime_port.to_string()),
            ("SPEC_UI_RUNTIME_ALLOWED_ORIGINS", allowed_origins.clone()),
        ],
    )?;
    app.state::<ManagedProcesses>().push(runtime_child);

    let web_child = spawn_node(
        app,
        "web",
        &web_server,
        web_dir,
        [
            ("HOSTNAME", HOST.to_string()),
            ("PORT", web_port.to_string()),
            ("SPEC_UI_RUNTIME_HTTP", runtime_http),
            ("SPEC_UI_RUNTIME_WS", runtime_ws),
        ],
    )?;
    app.state::<ManagedProcesses>().push(web_child);

    Ok(())
}

fn spawn_node<const N: usize>(
    app: &tauri::App,
    label: &'static str,
    script: &PathBuf,
    current_dir: PathBuf,
    envs: [(&str, String); N],
) -> Result<CommandChild, Box<dyn std::error::Error>> {
    let mut command = app
        .shell()
        .sidecar("spec-ui-node")?
        .arg(script)
        .current_dir(current_dir);

    for (key, value) in envs {
        command = command.env(key, value);
    }

    let (mut receiver, child) = command.spawn()?;
    tauri::async_runtime::spawn(async move {
        while let Some(event) = receiver.recv().await {
            match event {
                CommandEvent::Stdout(line) => log_process_line(label, "stdout", line),
                CommandEvent::Stderr(line) => log_process_line(label, "stderr", line),
                CommandEvent::Terminated(status) => {
                    println!("[spec-ui:{label}] terminated: {status:?}");
                }
                _ => {}
            }
        }
    });

    Ok(child)
}

fn log_process_line(label: &str, stream: &str, line: Vec<u8>) {
    let text = String::from_utf8_lossy(&line);
    print!("[spec-ui:{label}:{stream}] {text}");
}

fn create_main_window(app: &tauri::App, web_port: u16) -> Result<(), Box<dyn std::error::Error>> {
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

fn is_allowed_app_navigation(url: &tauri::Url, web_port: u16) -> bool {
    url.scheme() == "http"
        && url.host_str() == Some(HOST)
        && url.port_or_known_default() == Some(web_port)
}

fn resolve_resource(
    app: &tauri::App,
    resource: &str,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(app.path().resolve(resource, BaseDirectory::Resource)?)
}

fn available_ports() -> Result<(u16, u16), Box<dyn std::error::Error>> {
    let web_listener = TcpListener::bind((HOST, 0))?;
    let runtime_listener = TcpListener::bind((HOST, 0))?;

    Ok((
        web_listener.local_addr()?.port(),
        runtime_listener.local_addr()?.port(),
    ))
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
