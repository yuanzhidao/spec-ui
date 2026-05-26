use std::{collections::HashMap, fs, path::Path, time::SystemTime};

use crate::{
    runtime::project::{
        discover_project, discover_worktree_checkouts, primary_checkout_from_binding,
        ProjectDiscoveryResult,
    },
    runtime::types::{ProjectBinding, ProjectCheckout, RuntimeProjectSetting, SpecScope},
};

use super::projection::{checkout_scope_id, checkout_scope_label};

pub(super) type ProjectFingerprint = HashMap<String, FingerprintEntry>;

#[derive(Clone, Debug, PartialEq, Eq)]
pub(super) struct FingerprintEntry {
    pub(super) modified: u128,
    pub(super) event: Option<FingerprintEvent>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(super) struct FingerprintEvent {
    pub(super) project_id: String,
    pub(super) project_path: String,
    pub(super) dialect: String,
    pub(super) file_path: String,
    pub(super) checkout_id: String,
    pub(super) checkout_kind: String,
    pub(super) checkout_path: String,
    pub(super) checkout_label: String,
    pub(super) checkout_branch: Option<String>,
    pub(super) entity_id: Option<String>,
    pub(super) scope_id: Option<String>,
    pub(super) scope_label: Option<String>,
    pub(super) scope_path: Option<String>,
}

pub(super) fn collect_project_fingerprint(
    setting: &RuntimeProjectSetting,
    fingerprint: &mut ProjectFingerprint,
) {
    let (binding, _) = match discover_project(&setting.path) {
        ProjectDiscoveryResult::Ok { binding, issue } => (
            ProjectBinding {
                id: setting.id.clone(),
                workspace_path: setting.workspace_path.clone(),
                worktrees_path: setting.worktrees_path.clone(),
                worktree_paths: setting.worktree_paths.clone(),
                ..binding
            },
            issue,
        ),
        ProjectDiscoveryResult::Err(_) => {
            return;
        }
    };

    if let Some(worktrees_path) = &setting.worktrees_path {
        collect_worktrees_directory_fingerprint(setting, Path::new(worktrees_path), fingerprint);
    }

    let primary = primary_checkout_from_binding(&binding);
    let (worktree_checkouts, _) = discover_worktree_checkouts(setting, &binding);
    for checkout in [vec![primary], worktree_checkouts].concat() {
        collect_checkout_fingerprint(&binding, &checkout, fingerprint);
    }
}

fn collect_worktrees_directory_fingerprint(
    setting: &RuntimeProjectSetting,
    path: &Path,
    fingerprint: &mut ProjectFingerprint,
) {
    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let modified = entry_modified_millis(&path);
        fingerprint.insert(
            format!("{}:worktree-entry:{}", setting.id, path.to_string_lossy()),
            FingerprintEntry {
                modified,
                event: None,
            },
        );
    }
}

fn collect_checkout_fingerprint(
    project: &ProjectBinding,
    checkout: &ProjectCheckout,
    fingerprint: &mut ProjectFingerprint,
) {
    if checkout.dialect != "openspec" {
        return;
    }

    let scopes = if checkout.discovery.scopes.is_empty() {
        vec![SpecScope {
            id: "root".to_string(),
            label: "root".to_string(),
            path: String::new(),
        }]
    } else {
        checkout.discovery.scopes.clone()
    };

    for scope in scopes {
        let openspec_dir = Path::new(&checkout.path).join(&scope.path).join("openspec");
        collect_scope_fingerprint(project, checkout, &scope, &openspec_dir, fingerprint);
    }
}

fn collect_scope_fingerprint(
    project: &ProjectBinding,
    checkout: &ProjectCheckout,
    scope: &SpecScope,
    path: &Path,
    fingerprint: &mut ProjectFingerprint,
) {
    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_scope_fingerprint(project, checkout, scope, &path, fingerprint);
            continue;
        }

        if !path.is_file() {
            continue;
        }

        let file_path = path.to_string_lossy().into_owned();
        let relative_path = relative_checkout_path(checkout, &path);
        let scoped_path = relative_scope_path(&relative_path, &scope.path);
        fingerprint.insert(
            format!("{}:{}", project.id, file_path),
            FingerprintEntry {
                modified: entry_modified_millis(&path),
                event: Some(FingerprintEvent {
                    project_id: project.id.clone(),
                    project_path: checkout.path.clone(),
                    dialect: checkout.dialect.clone(),
                    file_path,
                    checkout_id: checkout.id.clone(),
                    checkout_kind: checkout.kind.clone(),
                    checkout_path: checkout.path.clone(),
                    checkout_label: checkout.label.clone(),
                    checkout_branch: checkout.branch.clone(),
                    entity_id: entity_id_from_relative_path(&scoped_path),
                    scope_id: checkout_scope_id(checkout, Some(&scope.id)),
                    scope_label: checkout_scope_label(checkout, Some(&scope.label)),
                    scope_path: Some(scope.path.clone()),
                }),
            },
        );
    }
}

fn relative_checkout_path(checkout: &ProjectCheckout, path: &Path) -> String {
    path.strip_prefix(&checkout.path)
        .map(posix_path_from_path)
        .unwrap_or_else(|_| path.to_string_lossy().into_owned())
}

fn relative_scope_path(relative_path: &str, scope_path: &str) -> String {
    if scope_path.is_empty() {
        return relative_path.to_string();
    }

    relative_path
        .strip_prefix(&format!("{scope_path}/"))
        .unwrap_or(relative_path)
        .to_string()
}

fn entity_id_from_relative_path(relative_path: &str) -> Option<String> {
    let parts = relative_path.split('/').collect::<Vec<_>>();
    if parts.len() < 3 || parts.first() != Some(&"openspec") {
        return None;
    }

    match parts[1] {
        "changes" | "specs" => Some(parts[2].to_string()),
        _ => None,
    }
}

fn entry_modified_millis(path: &Path) -> u128 {
    path.metadata()
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|time| time.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn posix_path_from_path(path: &Path) -> String {
    path.components()
        .map(|component| component.as_os_str().to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join("/")
}
