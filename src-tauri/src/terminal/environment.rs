use std::{
    env,
    ffi::OsString,
    fs,
    path::{Path, PathBuf},
    process::Command as StdCommand,
};

use super::types::{HostTerminalEnvironment, TerminalIssue, TerminalResult};

pub(super) fn detect_host_terminal_environment() -> TerminalResult<HostTerminalEnvironment> {
    let shell_path = detect_shell_path()?;
    Ok(HostTerminalEnvironment::new(
        env::consts::OS.to_string(),
        detect_os_version(),
        env::consts::ARCH.to_string(),
        shell_path.display().to_string(),
        detect_shell_version(&shell_path),
    ))
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

pub(super) fn shell_startup_args(shell_path: &Path) -> Vec<&'static str> {
    shell_name(shell_path)
        .filter(|name| {
            matches!(
                name.as_str(),
                "bash" | "csh" | "fish" | "ksh" | "mksh" | "tcsh" | "zsh"
            )
        })
        .map(|_| vec!["-l"])
        .unwrap_or_default()
}

pub(super) fn terminal_session_path() -> Option<OsString> {
    build_terminal_session_path(env::var_os("PATH"), home_dir().as_deref())
}

fn build_terminal_session_path(
    existing_path: Option<OsString>,
    home: Option<&Path>,
) -> Option<OsString> {
    let mut entries = Vec::new();

    if let Some(home) = home {
        push_user_tool_paths(&mut entries, home);
    }

    push_platform_tool_paths(&mut entries);

    if let Some(existing_path) = existing_path {
        for entry in env::split_paths(&existing_path) {
            push_path_entry(&mut entries, entry);
        }
    }

    push_system_fallback_paths(&mut entries);

    env::join_paths(entries).ok()
}

#[cfg(unix)]
fn push_user_tool_paths(entries: &mut Vec<PathBuf>, home: &Path) {
    for entry in [
        home.join(".local").join("bin"),
        home.join("bin"),
        home.join(".cargo").join("bin"),
        home.join(".bun").join("bin"),
        home.join(".deno").join("bin"),
        home.join(".volta").join("bin"),
        home.join(".npm-global").join("bin"),
        home.join(".npm-packages").join("bin"),
        home.join(".yarn").join("bin"),
        home.join(".config")
            .join("yarn")
            .join("global")
            .join("node_modules")
            .join(".bin"),
    ] {
        push_path_entry(entries, entry);
    }

    #[cfg(target_os = "macos")]
    push_path_entry(entries, home.join("Library").join("pnpm"));

    #[cfg(target_os = "linux")]
    push_path_entry(entries, home.join(".local").join("share").join("pnpm"));
}

#[cfg(windows)]
fn push_user_tool_paths(entries: &mut Vec<PathBuf>, home: &Path) {
    for entry in [
        home.join(".cargo").join("bin"),
        home.join(".bun").join("bin"),
        home.join(".deno").join("bin"),
        home.join(".volta").join("bin"),
        home.join("AppData").join("Local").join("pnpm"),
        home.join("AppData").join("Roaming").join("npm"),
        home.join("scoop").join("shims"),
    ] {
        push_path_entry(entries, entry);
    }
}

#[cfg(target_os = "macos")]
fn push_platform_tool_paths(entries: &mut Vec<PathBuf>) {
    for entry in [
        "/opt/homebrew/bin",
        "/opt/homebrew/sbin",
        "/usr/local/bin",
        "/usr/local/sbin",
    ] {
        push_path_entry(entries, PathBuf::from(entry));
    }
}

#[cfg(target_os = "linux")]
fn push_platform_tool_paths(entries: &mut Vec<PathBuf>) {
    for entry in [
        "/home/linuxbrew/.linuxbrew/bin",
        "/home/linuxbrew/.linuxbrew/sbin",
        "/usr/local/bin",
        "/usr/local/sbin",
        "/snap/bin",
    ] {
        push_path_entry(entries, PathBuf::from(entry));
    }
}

#[cfg(windows)]
fn push_platform_tool_paths(_entries: &mut Vec<PathBuf>) {}

#[cfg(unix)]
fn push_system_fallback_paths(entries: &mut Vec<PathBuf>) {
    for entry in ["/usr/bin", "/bin", "/usr/sbin", "/sbin"] {
        push_path_entry(entries, PathBuf::from(entry));
    }
}

#[cfg(windows)]
fn push_system_fallback_paths(_entries: &mut Vec<PathBuf>) {
    // Windows user and system PATH values are provided by the process environment.
}

fn push_path_entry(entries: &mut Vec<PathBuf>, entry: PathBuf) {
    if entry.as_os_str().is_empty() || entries.iter().any(|existing| existing == &entry) {
        return;
    }

    entries.push(entry);
}

fn shell_name(shell_path: &Path) -> Option<String> {
    shell_path
        .file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.trim_end_matches(".exe").to_ascii_lowercase())
}

pub(super) fn resolve_session_cwd(requested: Option<String>) -> TerminalResult<PathBuf> {
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

pub(super) fn session_label(number: u64, cwd: &Path, shell_path: &Path) -> String {
    let cwd_name = cwd.file_name().and_then(|name| name.to_str());
    let shell_name = shell_path.file_name().and_then(|name| name.to_str());

    match (cwd_name, shell_name) {
        (Some(cwd_name), Some(shell_name)) => format!("{cwd_name} · {shell_name}"),
        (Some(cwd_name), None) => cwd_name.to_string(),
        (None, Some(shell_name)) => shell_name.to_string(),
        (None, None) => format!("Terminal {number}"),
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
    fn session_label_uses_cwd_and_shell_names() {
        let label = session_label(1, Path::new("/workspace/spec-ui"), Path::new("/bin/zsh"));

        assert_eq!(label, "spec-ui · zsh");
    }

    #[test]
    fn known_unix_shells_start_as_login_shells() {
        assert_eq!(shell_startup_args(Path::new("/bin/zsh")), vec!["-l"]);
        assert_eq!(
            shell_startup_args(Path::new("/usr/local/bin/fish")),
            vec!["-l"]
        );
    }

    #[test]
    fn unknown_shells_do_not_receive_login_flags() {
        assert!(shell_startup_args(Path::new("/usr/local/bin/nu")).is_empty());
    }

    #[test]
    fn terminal_session_path_includes_user_tool_dirs_and_existing_path() {
        let home = Path::new("/Users/example");
        let existing_path =
            env::join_paths([PathBuf::from("/usr/bin"), PathBuf::from("/bin")]).unwrap();
        let session_path = build_terminal_session_path(Some(existing_path), Some(home))
            .expect("session path should be joinable");
        let entries = env::split_paths(&session_path).collect::<Vec<_>>();

        assert!(entries.contains(&home.join(".local").join("bin")));
        assert!(entries.contains(&home.join(".cargo").join("bin")));
        assert!(entries.contains(&PathBuf::from("/usr/bin")));
        assert!(entries.contains(&PathBuf::from("/bin")));

        #[cfg(target_os = "macos")]
        {
            assert!(entries.contains(&home.join("Library").join("pnpm")));
            assert!(entries.contains(&PathBuf::from("/opt/homebrew/bin")));
        }

        #[cfg(target_os = "linux")]
        {
            assert!(entries.contains(&home.join(".local").join("share").join("pnpm")));
            assert!(entries.contains(&PathBuf::from("/home/linuxbrew/.linuxbrew/bin")));
        }
    }
}
