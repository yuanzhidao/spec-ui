use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use crate::{
    runtime::settings::expand_user_path,
    runtime::types::{
        runtime_issue, DiscoveryFlags, ProjectBinding, ProjectCheckout, RuntimeIssue,
        RuntimeProjectSetting, SpecScope,
    },
};

pub enum ProjectDiscoveryResult {
    Ok {
        binding: ProjectBinding,
        issue: Option<RuntimeIssue>,
    },
    Err(RuntimeIssue),
}

pub fn discover_project(input: &str) -> ProjectDiscoveryResult {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return ProjectDiscoveryResult::Err(runtime_issue(
            "missing-path",
            "Enter a local project directory path.",
            None,
        ));
    }

    let project_path = normalize_local_path(trimmed);
    let metadata = match fs::metadata(&project_path) {
        Ok(metadata) => metadata,
        Err(error) => {
            let code = if error.kind() == std::io::ErrorKind::NotFound {
                "invalid-path"
            } else {
                "unreadable-path"
            };
            let message = if code == "invalid-path" {
                "The selected directory does not exist."
            } else {
                "The selected directory is not readable."
            };
            return ProjectDiscoveryResult::Err(runtime_issue(
                code,
                message,
                Some(project_path.to_string_lossy().into_owned()),
            ));
        }
    };

    if !metadata.is_dir() {
        return ProjectDiscoveryResult::Err(runtime_issue(
            "not-directory",
            "The selected path is not a directory.",
            Some(project_path.to_string_lossy().into_owned()),
        ));
    }

    let discovery = detect_openspec(&project_path);
    let dialect = resolve_dialect(&discovery);
    let name = project_path
        .file_name()
        .and_then(|name| name.to_str())
        .map(str::to_string)
        .unwrap_or_else(|| project_path.to_string_lossy().into_owned());

    let issue = if dialect == "none" {
        Some(runtime_issue(
            "unsupported-dialect",
            "No supported spec structure was detected.",
            Some("The directory is readable and remains bound as a blank project.".to_string()),
        ))
    } else {
        None
    };

    ProjectDiscoveryResult::Ok {
        binding: ProjectBinding {
            id: String::new(),
            path: project_path.to_string_lossy().into_owned(),
            workspace_path: None,
            name,
            dialect,
            discovery,
            worktrees_path: None,
            worktree_paths: Vec::new(),
            checkouts: Vec::new(),
            worktree_issues: Vec::new(),
        },
        issue,
    }
}

pub fn invalid_project_binding(project: &RuntimeProjectSetting) -> ProjectBinding {
    ProjectBinding {
        id: project.id.clone(),
        path: project.path.clone(),
        workspace_path: project.workspace_path.clone(),
        name: Path::new(&project.path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(project.path.as_str())
            .to_string(),
        dialect: "none".to_string(),
        discovery: empty_discovery(),
        worktrees_path: project.worktrees_path.clone(),
        worktree_paths: project.worktree_paths.clone(),
        checkouts: Vec::new(),
        worktree_issues: Vec::new(),
    }
}

pub fn primary_checkout_from_binding(binding: &ProjectBinding) -> ProjectCheckout {
    let git_info = git_info_for_path(&binding.path).ok();
    ProjectCheckout {
        id: "primary".to_string(),
        kind: "primary".to_string(),
        source: "primary".to_string(),
        path: binding.path.clone(),
        label: git_info
            .as_ref()
            .and_then(|info| info.branch.clone())
            .unwrap_or_else(|| binding.name.clone()),
        branch: git_info.and_then(|info| info.branch),
        dialect: binding.dialect.clone(),
        discovery: binding.discovery.clone(),
        issue: None,
    }
}

pub fn discover_worktree_checkouts(
    setting: &RuntimeProjectSetting,
    primary: &ProjectBinding,
) -> (Vec<ProjectCheckout>, Vec<RuntimeIssue>) {
    let (sources, mut issues) = worktree_candidate_sources(setting);
    if sources.is_empty() {
        return (Vec::new(), issues);
    }

    let primary_git_info = match git_info_for_path(&primary.path) {
        Ok(info) => info,
        Err(_) => {
            issues.push(runtime_issue(
                "worktree-error",
                "Worktree discovery requires the primary project to be a git working tree.",
                Some(primary.path.clone()),
            ));
            return (Vec::new(), issues);
        }
    };

    let mut seen = HashSet::from([primary.path.clone()]);
    let mut checkouts = Vec::new();

    for source in sources {
        let candidate_path = normalize_local_path(&source.path);
        let candidate = candidate_path.to_string_lossy().into_owned();
        if !seen.insert(candidate.clone()) {
            continue;
        }

        let git_info =
            match validate_worktree_candidate(&candidate_path, &primary_git_info, &source.source) {
                Ok(info) => info,
                Err(issue) => {
                    if source.source == "manual" {
                        issues.push(issue);
                    }
                    continue;
                }
            };

        let (binding, issue) = match discover_project(&candidate) {
            ProjectDiscoveryResult::Ok { binding, issue } => (binding, issue),
            ProjectDiscoveryResult::Err(issue) => {
                if source.source == "manual" {
                    issues.push(issue);
                }
                continue;
            }
        };

        checkouts.push(ProjectCheckout {
            id: checkout_id(&candidate),
            kind: "worktree".to_string(),
            source: source.source,
            path: candidate.clone(),
            label: git_info.branch.clone().unwrap_or_else(|| {
                candidate_path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .unwrap_or("worktree")
                    .to_string()
            }),
            branch: git_info.branch,
            dialect: binding.dialect,
            discovery: binding.discovery,
            issue,
        });
    }

    (checkouts, issues)
}

pub fn normalize_local_path(input: &str) -> PathBuf {
    let expanded = expand_user_path(input.trim());
    let path = PathBuf::from(expanded);
    if path.is_absolute() {
        normalize_components(path)
    } else {
        normalize_components(
            std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join(path),
        )
    }
}

fn detect_openspec(project_path: &Path) -> DiscoveryFlags {
    let scopes = discover_openspec_scopes(project_path);
    if scopes.is_empty() {
        return empty_discovery();
    }

    let flags = scopes
        .iter()
        .map(|scope| detect_scope_openspec(project_path, scope))
        .collect::<Vec<_>>();

    DiscoveryFlags {
        has_open_spec_dir: true,
        has_config: flags.iter().any(|flag| flag.has_config),
        has_specs_dir: flags.iter().any(|flag| flag.has_specs_dir),
        has_changes_dir: flags.iter().any(|flag| flag.has_changes_dir),
        is_empty_open_spec: flags.iter().any(|flag| flag.is_empty_open_spec),
        scopes,
    }
}

fn detect_scope_openspec(project_path: &Path, scope: &SpecScope) -> DiscoveryFlags {
    let openspec_dir = project_path.join(&scope.path).join("openspec");
    let entries = fs::read_dir(&openspec_dir)
        .map(|entries| entries.count())
        .unwrap_or_default();

    DiscoveryFlags {
        has_open_spec_dir: true,
        has_config: openspec_dir.join("config.yaml").is_file(),
        has_specs_dir: openspec_dir.join("specs").is_dir(),
        has_changes_dir: openspec_dir.join("changes").is_dir(),
        is_empty_open_spec: entries == 0,
        scopes: vec![scope.clone()],
    }
}

fn discover_openspec_scopes(project_path: &Path) -> Vec<SpecScope> {
    let mut scopes = Vec::new();
    visit_for_openspec(project_path, project_path, &mut Vec::new(), &mut scopes);
    scopes.sort_by(compare_scopes);
    scopes.dedup_by(|a, b| a.path == b.path);
    scopes
}

fn visit_for_openspec(
    root: &Path,
    current: &Path,
    ignored_names: &mut Vec<String>,
    scopes: &mut Vec<SpecScope>,
) {
    let mut local_ignored = read_gitignore_names(current);
    ignored_names.append(&mut local_ignored);

    let entries = match fs::read_dir(current) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if !path.is_dir() || is_ignored_dir(&name, ignored_names) {
            continue;
        }

        if name == "openspec" {
            let scope_path = path
                .parent()
                .and_then(|parent| parent.strip_prefix(root).ok())
                .map(posix_path)
                .unwrap_or_default();
            scopes.push(scope_from_path(&scope_path));
            continue;
        }

        visit_for_openspec(root, &path, &mut ignored_names.clone(), scopes);
    }
}

fn read_gitignore_names(current: &Path) -> Vec<String> {
    let content = fs::read_to_string(current.join(".gitignore")).unwrap_or_default();
    content
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#') && !line.starts_with('!'))
        .filter_map(|line| {
            let normalized = line.trim_start_matches('/').trim_end_matches('/');
            if normalized.is_empty() || normalized.contains('*') {
                return None;
            }
            normalized
                .split('/')
                .next_back()
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .collect()
}

fn is_ignored_dir(name: &str, ignored_names: &[String]) -> bool {
    const BUILT_IN: &[&str] = &[
        ".git",
        "node_modules",
        ".next",
        "dist",
        "build",
        "coverage",
        ".turbo",
        ".worktree",
        ".worktrees",
    ];

    name.starts_with('.')
        || BUILT_IN.contains(&name)
        || ignored_names.iter().any(|item| item == name)
}

fn scope_from_path(scope_path: &str) -> SpecScope {
    let label = if scope_path.is_empty() {
        "root".to_string()
    } else {
        scope_path.to_string()
    };

    SpecScope {
        id: scope_id_from_path(scope_path),
        label,
        path: scope_path.to_string(),
    }
}

fn scope_id_from_path(scope_path: &str) -> String {
    let slug = scope_path
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '_' })
        .collect::<String>()
        .trim_matches('_')
        .to_string();

    if slug.is_empty() {
        "root".to_string()
    } else {
        slug
    }
}

fn resolve_dialect(discovery: &DiscoveryFlags) -> String {
    if !discovery.has_open_spec_dir {
        return "none".to_string();
    }

    if discovery.has_config
        || discovery.has_specs_dir
        || discovery.has_changes_dir
        || discovery.is_empty_open_spec
    {
        return "openspec".to_string();
    }

    "unsupported".to_string()
}

fn empty_discovery() -> DiscoveryFlags {
    DiscoveryFlags {
        has_open_spec_dir: false,
        has_config: false,
        has_specs_dir: false,
        has_changes_dir: false,
        is_empty_open_spec: false,
        scopes: Vec::new(),
    }
}

struct CandidateSource {
    path: String,
    source: String,
}

fn worktree_candidate_sources(
    setting: &RuntimeProjectSetting,
) -> (Vec<CandidateSource>, Vec<RuntimeIssue>) {
    let mut sources = setting
        .worktree_paths
        .iter()
        .map(|path| CandidateSource {
            path: path.clone(),
            source: "manual".to_string(),
        })
        .collect::<Vec<_>>();

    let Some(worktrees_path) = setting.worktrees_path.as_ref() else {
        return (sources, Vec::new());
    };
    let normalized = normalize_local_path(worktrees_path);

    let entries = match fs::read_dir(&normalized) {
        Ok(entries) => entries,
        Err(error) => {
            let message = if error.kind() == std::io::ErrorKind::NotFound {
                "The saved worktrees directory does not exist."
            } else {
                "The saved worktrees directory is not readable."
            };
            return (
                sources,
                vec![runtime_issue(
                    "worktree-error",
                    message,
                    Some(normalized.to_string_lossy().into_owned()),
                )],
            );
        }
    };

    sources.extend(entries.flatten().filter_map(|entry| {
        let path = entry.path();
        path.is_dir().then(|| CandidateSource {
            path: path.to_string_lossy().into_owned(),
            source: "worktrees-directory".to_string(),
        })
    }));

    (sources, Vec::new())
}

fn validate_worktree_candidate(
    candidate_path: &Path,
    primary_git_info: &GitInfo,
    source: &str,
) -> Result<GitInfo, RuntimeIssue> {
    match fs::metadata(candidate_path) {
        Ok(metadata) if metadata.is_dir() => {}
        Ok(_) => {
            return Err(runtime_issue(
                "worktree-error",
                "The saved worktree path is not a directory.",
                Some(candidate_path.to_string_lossy().into_owned()),
            ));
        }
        Err(error) => {
            let message = if error.kind() == std::io::ErrorKind::NotFound {
                "The saved worktree path does not exist."
            } else {
                "The saved worktree path is not readable."
            };
            return Err(runtime_issue(
                "worktree-error",
                message,
                Some(candidate_path.to_string_lossy().into_owned()),
            ));
        }
    }

    let git_info = git_info_for_path(candidate_path.to_string_lossy().as_ref()).map_err(|_| {
        runtime_issue(
            "worktree-error",
            if source == "manual" {
                "The saved worktree path is not a git working tree."
            } else {
                "The detected directory is not a git working tree."
            },
            Some(candidate_path.to_string_lossy().into_owned()),
        )
    })?;

    if normalize_components(PathBuf::from(&git_info.common_dir))
        != normalize_components(PathBuf::from(&primary_git_info.common_dir))
    {
        return Err(runtime_issue(
            "worktree-error",
            "The worktree belongs to a different git repository.",
            Some(candidate_path.to_string_lossy().into_owned()),
        ));
    }

    Ok(git_info)
}

#[derive(Clone)]
struct GitInfo {
    common_dir: String,
    branch: Option<String>,
}

fn git_info_for_path(checkout_path: &str) -> Result<GitInfo, ()> {
    let common_dir = git_output(
        checkout_path,
        &["rev-parse", "--path-format=absolute", "--git-common-dir"],
    )?;
    let branch = git_output(checkout_path, &["branch", "--show-current"])
        .ok()
        .filter(|value| !value.is_empty());

    Ok(GitInfo { common_dir, branch })
}

fn git_output(cwd: &str, args: &[&str]) -> Result<String, ()> {
    let output = Command::new("git")
        .arg("-C")
        .arg(cwd)
        .args(args)
        .output()
        .map_err(|_| ())?;

    if !output.status.success() {
        return Err(());
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn checkout_id(checkout_path: &str) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in checkout_path.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("wt_{:010x}", hash & 0xffffffffff)
}

fn compare_scopes(first: &SpecScope, second: &SpecScope) -> std::cmp::Ordering {
    match (first.path.is_empty(), second.path.is_empty()) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => first.path.cmp(&second.path),
    }
}

fn normalize_components(path: PathBuf) -> PathBuf {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        normalized.push(component.as_os_str());
    }
    normalized
}

fn posix_path(path: &Path) -> String {
    path.components()
        .filter_map(|component| component.as_os_str().to_str())
        .collect::<Vec<_>>()
        .join("/")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        env, fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_project(name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or_default();
        let path = env::temp_dir().join(format!("spec-ui-{name}-{suffix}"));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).expect("temp project directory should be created");
        path
    }

    #[test]
    fn discover_project_detects_root_and_nested_openspec_scopes() {
        let root = temp_project("multi-scope");
        fs::create_dir_all(root.join("openspec/specs/root-spec"))
            .expect("root openspec should be created");
        fs::write(root.join("openspec/config.yaml"), "project: test\n")
            .expect("root config should be written");
        fs::create_dir_all(root.join("apps/web/openspec/changes/add-web"))
            .expect("nested openspec should be created");

        let ProjectDiscoveryResult::Ok { binding, issue } =
            discover_project(root.to_string_lossy().as_ref())
        else {
            panic!("temp project should be discoverable");
        };

        assert!(issue.is_none());
        assert_eq!(binding.dialect, "openspec");
        assert_eq!(
            binding
                .discovery
                .scopes
                .iter()
                .map(|scope| scope.path.as_str())
                .collect::<Vec<_>>(),
            vec!["", "apps/web"]
        );

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn discover_project_respects_nested_gitignore_names() {
        let root = temp_project("gitignore");
        fs::create_dir_all(root.join("openspec")).expect("root openspec should be created");
        fs::create_dir_all(root.join("apps/generated/openspec"))
            .expect("ignored openspec should be created");
        fs::write(root.join("apps/.gitignore"), "generated\n")
            .expect("nested gitignore should be written");

        let ProjectDiscoveryResult::Ok { binding, .. } =
            discover_project(root.to_string_lossy().as_ref())
        else {
            panic!("temp project should be discoverable");
        };

        assert_eq!(
            binding
                .discovery
                .scopes
                .iter()
                .map(|scope| scope.path.as_str())
                .collect::<Vec<_>>(),
            vec![""]
        );

        let _ = fs::remove_dir_all(root);
    }
}
