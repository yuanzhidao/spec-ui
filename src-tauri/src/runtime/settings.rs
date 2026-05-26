use std::{
    collections::HashSet,
    env, fs,
    io::{self, Read, Write},
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

use crate::runtime::types::{runtime_issue, RuntimeIssue, RuntimeProjectSetting, RuntimeSettings};

const SETTINGS_DIR_NAME: &str = ".spec-ui";
const SETTINGS_FILE_NAME: &str = "settings.json";

pub struct SettingsReadResult {
    pub settings: RuntimeSettings,
    pub issue: Option<RuntimeIssue>,
}

pub fn default_settings() -> RuntimeSettings {
    RuntimeSettings {
        version: 2,
        theme_mode: "light".to_string(),
        language: "en".to_string(),
        projects: Vec::new(),
        focused_project_id: None,
    }
}

pub fn read_settings() -> SettingsReadResult {
    let path = settings_path();
    let mut raw = String::new();
    match fs::File::open(&path).and_then(|mut file| file.read_to_string(&mut raw)) {
        Ok(_) => {}
        Err(error) if error.kind() == io::ErrorKind::NotFound => {
            return SettingsReadResult {
                settings: default_settings(),
                issue: None,
            };
        }
        Err(error) => {
            return SettingsReadResult {
                settings: default_settings(),
                issue: Some(runtime_issue(
                    "settings-invalid",
                    "Runtime settings could not be read. Defaults were loaded.",
                    Some(error.to_string()),
                )),
            };
        }
    }

    match serde_json::from_str::<RuntimeSettings>(&raw) {
        Ok(settings) if settings.version == 2 => SettingsReadResult {
            settings: normalize_settings(settings),
            issue: None,
        },
        _ => SettingsReadResult {
            settings: default_settings(),
            issue: Some(runtime_issue(
                "settings-invalid",
                "Runtime settings are invalid. Defaults were loaded.",
                Some("Expected spec-ui settings version 2.".to_string()),
            )),
        },
    }
}

pub fn write_settings(settings: &RuntimeSettings) -> Result<(), RuntimeIssue> {
    let settings = normalize_settings(settings.clone());
    let dir = settings_dir();
    fs::create_dir_all(&dir).map_err(|error| {
        runtime_issue(
            "settings-invalid",
            "Runtime settings directory could not be created.",
            Some(error.to_string()),
        )
    })?;

    let target = settings_path();
    let temporary = dir.join(format!(
        "{SETTINGS_FILE_NAME}.{}.{}.tmp",
        std::process::id(),
        unix_nanos()
    ));
    let content = serde_json::to_string_pretty(&settings)
        .map(|value| format!("{value}\n"))
        .map_err(|error| {
            runtime_issue(
                "settings-invalid",
                "Runtime settings could not be serialized.",
                Some(error.to_string()),
            )
        })?;

    fs::File::create(&temporary)
        .and_then(|mut file| file.write_all(content.as_bytes()))
        .and_then(|_| fs::rename(&temporary, target))
        .map_err(|error| {
            let _ = fs::remove_file(&temporary);
            runtime_issue(
                "settings-invalid",
                "Runtime settings could not be written.",
                Some(error.to_string()),
            )
        })
}

pub fn add_project_path(settings: RuntimeSettings, project_path: String) -> RuntimeSettings {
    if let Some(existing_id) = settings
        .projects
        .iter()
        .find(|project| project.path == project_path)
        .map(|project| project.id.clone())
    {
        return with_focused_project_id(settings, Some(existing_id));
    }

    let project = create_project_setting(project_path, &settings.projects);
    let focused_project_id = Some(project.id.clone());
    let mut projects = settings.projects.clone();
    projects.push(project);
    with_projects(settings, projects, focused_project_id)
}

pub fn remove_project_path(settings: RuntimeSettings, project_path: &str) -> RuntimeSettings {
    let removed = settings
        .projects
        .iter()
        .find(|project| project.path == project_path)
        .cloned();
    let projects = settings
        .projects
        .iter()
        .filter(|project| project.path != project_path)
        .cloned()
        .collect::<Vec<_>>();
    let focused_project_id = if removed
        .as_ref()
        .is_some_and(|project| settings.focused_project_id.as_deref() == Some(project.id.as_str()))
    {
        projects.first().map(|project| project.id.clone())
    } else {
        settings.focused_project_id.clone()
    };

    with_projects(settings, projects, focused_project_id)
}

pub fn update_project_path(
    settings: RuntimeSettings,
    project_id: &str,
    project_path: String,
) -> RuntimeSettings {
    let projects = settings
        .projects
        .iter()
        .map(|project| {
            if project.id == project_id {
                RuntimeProjectSetting {
                    path: project_path.clone(),
                    ..project.clone()
                }
            } else {
                project.clone()
            }
        })
        .collect();

    let focused_project_id = settings.focused_project_id.clone();
    with_projects(settings, projects, focused_project_id)
}

pub fn update_project_workspace_path(
    settings: RuntimeSettings,
    project_id: &str,
    workspace_path: Option<String>,
) -> RuntimeSettings {
    let projects = settings
        .projects
        .iter()
        .map(|project| {
            if project.id == project_id {
                RuntimeProjectSetting {
                    workspace_path: workspace_path.clone().filter(|value| !value.is_empty()),
                    ..project.clone()
                }
            } else {
                project.clone()
            }
        })
        .collect();

    let focused_project_id = settings.focused_project_id.clone();
    with_projects(settings, projects, focused_project_id)
}

pub fn update_project_worktrees_path(
    settings: RuntimeSettings,
    project_id: &str,
    worktrees_path: Option<String>,
) -> RuntimeSettings {
    let projects = settings
        .projects
        .iter()
        .map(|project| {
            if project.id == project_id {
                RuntimeProjectSetting {
                    worktrees_path: worktrees_path.clone().filter(|value| !value.is_empty()),
                    ..project.clone()
                }
            } else {
                project.clone()
            }
        })
        .collect();

    let focused_project_id = settings.focused_project_id.clone();
    with_projects(settings, projects, focused_project_id)
}

pub fn add_project_worktree_path(
    settings: RuntimeSettings,
    project_id: &str,
    worktree_path: String,
) -> RuntimeSettings {
    let projects = settings
        .projects
        .iter()
        .map(|project| {
            if project.id == project_id {
                let mut worktree_paths = project.worktree_paths.clone();
                worktree_paths.push(worktree_path.clone());
                RuntimeProjectSetting {
                    worktree_paths: unique_strings(worktree_paths),
                    ..project.clone()
                }
            } else {
                project.clone()
            }
        })
        .collect();

    let focused_project_id = settings.focused_project_id.clone();
    with_projects(settings, projects, focused_project_id)
}

pub fn remove_project_worktree_path(
    settings: RuntimeSettings,
    project_id: &str,
    worktree_path: &str,
) -> RuntimeSettings {
    let projects = settings
        .projects
        .iter()
        .map(|project| {
            if project.id == project_id {
                RuntimeProjectSetting {
                    worktree_paths: project
                        .worktree_paths
                        .iter()
                        .filter(|path| path.as_str() != worktree_path)
                        .cloned()
                        .collect(),
                    ..project.clone()
                }
            } else {
                project.clone()
            }
        })
        .collect();

    let focused_project_id = settings.focused_project_id.clone();
    with_projects(settings, projects, focused_project_id)
}

pub fn with_focused_project_id(
    settings: RuntimeSettings,
    focused_project_id: Option<String>,
) -> RuntimeSettings {
    normalize_settings(RuntimeSettings {
        focused_project_id,
        ..settings
    })
}

pub fn with_theme(settings: RuntimeSettings, theme_mode: String) -> RuntimeSettings {
    normalize_settings(RuntimeSettings {
        theme_mode,
        ..settings
    })
}

pub fn with_language(settings: RuntimeSettings, language: String) -> RuntimeSettings {
    normalize_settings(RuntimeSettings {
        language,
        ..settings
    })
}

pub fn project_setting_by_id<'a>(
    settings: &'a RuntimeSettings,
    project_id: &str,
) -> Option<&'a RuntimeProjectSetting> {
    settings
        .projects
        .iter()
        .find(|project| project.id == project_id)
}

pub fn project_setting_by_path<'a>(
    settings: &'a RuntimeSettings,
    project_path: &str,
) -> Option<&'a RuntimeProjectSetting> {
    settings
        .projects
        .iter()
        .find(|project| project.path == project_path)
}

pub fn normalize_settings(settings: RuntimeSettings) -> RuntimeSettings {
    let projects = unique_projects(settings.projects);
    let focused_project_id = settings.focused_project_id.filter(|focused_id| {
        projects
            .iter()
            .any(|project| project.id.as_str() == focused_id.as_str())
    });

    RuntimeSettings {
        version: 2,
        theme_mode: if matches!(settings.theme_mode.as_str(), "light" | "dark" | "system") {
            settings.theme_mode
        } else {
            "light".to_string()
        },
        language: if matches!(settings.language.as_str(), "en" | "zh") {
            settings.language
        } else {
            "en".to_string()
        },
        projects,
        focused_project_id,
    }
}

pub fn expand_user_path(input: &str) -> String {
    if input == "~" {
        return home_dir()
            .map(|path| path.to_string_lossy().into_owned())
            .unwrap_or_else(|| input.to_string());
    }

    if let Some(rest) = input.strip_prefix("~/") {
        if let Some(home) = home_dir() {
            return home.join(rest).to_string_lossy().into_owned();
        }
    }

    input.to_string()
}

fn with_projects(
    settings: RuntimeSettings,
    projects: Vec<RuntimeProjectSetting>,
    focused_project_id: Option<String>,
) -> RuntimeSettings {
    normalize_settings(RuntimeSettings {
        projects,
        focused_project_id,
        ..settings
    })
}

fn create_project_setting(
    project_path: String,
    existing: &[RuntimeProjectSetting],
) -> RuntimeProjectSetting {
    let existing_ids = existing
        .iter()
        .map(|project| project.id.as_str())
        .collect::<HashSet<_>>();
    let mut id = create_project_id();
    while existing_ids.contains(id.as_str()) {
        id = create_project_id();
    }

    RuntimeProjectSetting {
        id,
        path: project_path,
        workspace_path: None,
        worktrees_path: None,
        worktree_paths: Vec::new(),
    }
}

fn create_project_id() -> String {
    let mut seed = unix_nanos() ^ ((std::process::id() as u128) << 48);
    let alphabet = b"abcdefghijklmnopqrstuvwxyz0123456789";
    let mut suffix = String::new();

    for _ in 0..8 {
        let index = (seed % alphabet.len() as u128) as usize;
        suffix.push(alphabet[index] as char);
        seed = seed / alphabet.len() as u128 + 17;
    }

    format!("prj_{suffix}")
}

fn unique_projects(projects: Vec<RuntimeProjectSetting>) -> Vec<RuntimeProjectSetting> {
    let mut seen_ids = HashSet::new();
    let mut seen_paths = HashSet::new();
    let mut result = Vec::new();

    for project in projects {
        if project.id.is_empty()
            || project.path.is_empty()
            || !seen_ids.insert(project.id.clone())
            || !seen_paths.insert(project.path.clone())
        {
            continue;
        }

        result.push(RuntimeProjectSetting {
            workspace_path: project.workspace_path.filter(|value| !value.is_empty()),
            worktrees_path: project.worktrees_path.filter(|value| !value.is_empty()),
            worktree_paths: unique_strings(project.worktree_paths),
            ..project
        });
    }

    result
}

fn unique_strings(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    values
        .into_iter()
        .filter(|value| !value.is_empty())
        .filter(|value| seen.insert(value.clone()))
        .collect()
}

fn settings_dir() -> PathBuf {
    home_dir()
        .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
        .join(SETTINGS_DIR_NAME)
}

fn settings_path() -> PathBuf {
    settings_dir().join(SETTINGS_FILE_NAME)
}

fn home_dir() -> Option<PathBuf> {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

fn unix_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn project(id: &str, path: &str) -> RuntimeProjectSetting {
        RuntimeProjectSetting {
            id: id.to_string(),
            path: path.to_string(),
            workspace_path: None,
            worktrees_path: None,
            worktree_paths: Vec::new(),
        }
    }

    #[test]
    fn normalize_settings_drops_invalid_values_and_duplicate_projects() {
        let settings = RuntimeSettings {
            version: 99,
            theme_mode: "solarized".to_string(),
            language: "fr".to_string(),
            focused_project_id: Some("missing".to_string()),
            projects: vec![
                project("prj_alpha", "/tmp/spec-ui-alpha"),
                project("prj_alpha", "/tmp/spec-ui-duplicate-id"),
                project("prj_beta", "/tmp/spec-ui-alpha"),
                project("", "/tmp/spec-ui-empty-id"),
            ],
        };

        let normalized = normalize_settings(settings);

        assert_eq!(normalized.version, 2);
        assert_eq!(normalized.theme_mode, "light");
        assert_eq!(normalized.language, "en");
        assert_eq!(normalized.focused_project_id, None);
        assert_eq!(normalized.projects.len(), 1);
        assert_eq!(normalized.projects[0].id, "prj_alpha");
    }

    #[test]
    fn remove_project_reassigns_focus_to_the_first_remaining_project() {
        let settings = RuntimeSettings {
            focused_project_id: Some("prj_alpha".to_string()),
            projects: vec![
                project("prj_alpha", "/tmp/spec-ui-alpha"),
                project("prj_beta", "/tmp/spec-ui-beta"),
            ],
            ..default_settings()
        };

        let next = remove_project_path(settings, "/tmp/spec-ui-alpha");

        assert_eq!(next.focused_project_id, Some("prj_beta".to_string()));
        assert_eq!(next.projects.len(), 1);
        assert_eq!(next.projects[0].id, "prj_beta");
    }

    #[test]
    fn worktree_paths_are_unique_and_non_empty() {
        let mut settings = RuntimeSettings {
            projects: vec![project("prj_alpha", "/tmp/spec-ui-alpha")],
            ..default_settings()
        };

        settings = add_project_worktree_path(settings, "prj_alpha", "/tmp/worktree-a".into());
        settings = add_project_worktree_path(settings, "prj_alpha", "/tmp/worktree-a".into());
        settings = add_project_worktree_path(settings, "prj_alpha", "".into());

        assert_eq!(
            settings.projects[0].worktree_paths,
            vec!["/tmp/worktree-a".to_string()]
        );
    }

    #[test]
    fn workspace_path_can_be_saved_and_cleared() {
        let mut settings = RuntimeSettings {
            projects: vec![project("prj_alpha", "/tmp/spec-ui-alpha")],
            ..default_settings()
        };

        settings = update_project_workspace_path(
            settings,
            "prj_alpha",
            Some("/tmp/spec-ui-workspace".to_string()),
        );
        assert_eq!(
            settings.projects[0].workspace_path,
            Some("/tmp/spec-ui-workspace".to_string())
        );

        settings = update_project_workspace_path(settings, "prj_alpha", None);
        assert_eq!(settings.projects[0].workspace_path, None);
    }
}
