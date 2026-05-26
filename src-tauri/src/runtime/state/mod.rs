use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    thread,
    time::{Duration, SystemTime},
};

use tauri::{AppHandle, Emitter, State};

use crate::{
    runtime::project::{discover_project, normalize_local_path, ProjectDiscoveryResult},
    runtime::settings::{
        add_project_path, add_project_worktree_path, default_settings, project_setting_by_id,
        project_setting_by_path, read_settings, remove_project_path, remove_project_worktree_path,
        update_project_path, update_project_workspace_path, update_project_worktrees_path,
        with_focused_project_id, with_language, with_theme, write_settings,
    },
    runtime::types::{
        not_run_validation, runtime_issue, DashboardData, ProjectEvent, RuntimeIssue,
        RuntimeSettings, RuntimeSnapshot, ValidationResult,
    },
};

mod activity;
mod fingerprint;
mod projection;
mod tasks;
mod validation;

use self::{
    activity::{fingerprint_activity_events, record_activity_events},
    fingerprint::{collect_project_fingerprint, ProjectFingerprint},
    projection::{dashboard_project, realtime_state},
    tasks::{validate_task_source_path, write_task_completion},
    validation::{mark_validations_stale, run_project_validation},
};

const RUNTIME_SNAPSHOT_EVENT: &str = "runtime-snapshot";
const WATCHER_POLL_INTERVAL: Duration = Duration::from_millis(1500);

type RuntimeResult<T> = Result<T, RuntimeIssue>;

#[derive(Clone, Default)]
pub struct RuntimeManager {
    inner: Arc<Mutex<RuntimeInner>>,
}

#[derive(Default)]
struct RuntimeInner {
    initialized: bool,
    settings: RuntimeSettings,
    settings_issue: Option<RuntimeIssue>,
    validations: HashMap<String, ValidationResult>,
    activity: HashMap<String, Vec<ProjectEvent>>,
    last_fingerprint: ProjectFingerprint,
}

impl Default for RuntimeSettings {
    fn default() -> Self {
        default_settings()
    }
}

impl RuntimeManager {
    pub fn initialize(&self) {
        let result = read_settings();
        let mut inner = self.inner.lock().expect("runtime state lock poisoned");
        inner.settings = result.settings;
        inner.settings_issue = result.issue;
        inner.initialized = true;
        inner.last_fingerprint = self.project_fingerprint_locked(&inner.settings);
    }

    pub fn start_watcher(&self, app: AppHandle) {
        let manager = self.clone();
        thread::spawn(move || loop {
            thread::sleep(WATCHER_POLL_INTERVAL);
            if manager.refresh_fingerprint() {
                manager.emit_snapshot(&app);
            }
        });
    }

    fn ensure_initialized(&self) {
        let should_initialize = {
            let inner = self.inner.lock().expect("runtime state lock poisoned");
            !inner.initialized
        };
        if should_initialize {
            self.initialize();
        }
    }

    fn snapshot(&self) -> RuntimeSnapshot {
        self.ensure_initialized();
        let (settings, settings_issue, validations, activity) = {
            let inner = self.inner.lock().expect("runtime state lock poisoned");
            (
                inner.settings.clone(),
                inner.settings_issue.clone(),
                inner.validations.clone(),
                inner.activity.clone(),
            )
        };

        let dashboard = self.dashboard_data(&settings, settings_issue, &validations, &activity);
        RuntimeSnapshot {
            settings,
            dashboard,
        }
    }

    fn update_settings(
        &self,
        update: impl FnOnce(RuntimeSettings) -> RuntimeSettings,
    ) -> RuntimeResult<RuntimeSnapshot> {
        self.ensure_initialized();
        {
            let mut inner = self.inner.lock().expect("runtime state lock poisoned");
            inner.settings = update(inner.settings.clone());
            write_settings(&inner.settings)?;
            inner.settings_issue = None;
            inner.last_fingerprint = self.project_fingerprint_locked(&inner.settings);
        }

        Ok(self.snapshot())
    }

    fn update_preferences(
        &self,
        update: impl FnOnce(RuntimeSettings) -> RuntimeSettings,
    ) -> RuntimeResult<()> {
        self.ensure_initialized();
        let next = {
            let inner = self.inner.lock().expect("runtime state lock poisoned");
            update(inner.settings.clone())
        };

        write_settings(&next)?;

        let mut inner = self.inner.lock().expect("runtime state lock poisoned");
        inner.settings = next;
        inner.settings_issue = None;
        Ok(())
    }

    fn set_settings_issue(&self, issue: RuntimeIssue) -> RuntimeSnapshot {
        self.ensure_initialized();
        {
            let mut inner = self.inner.lock().expect("runtime state lock poisoned");
            inner.settings_issue = Some(issue);
        }
        self.snapshot()
    }

    fn dashboard_data(
        &self,
        settings: &RuntimeSettings,
        settings_issue: Option<RuntimeIssue>,
        validations: &HashMap<String, ValidationResult>,
        activity: &HashMap<String, Vec<ProjectEvent>>,
    ) -> DashboardData {
        let projects = settings
            .projects
            .iter()
            .map(|project| {
                dashboard_project(
                    project,
                    validations,
                    activity.get(&project.id).cloned().unwrap_or_default(),
                )
            })
            .collect::<Vec<_>>();
        let focused_project_id = settings.focused_project_id.clone();
        let focused = focused_project_id
            .as_ref()
            .and_then(|id| projects.iter().find(|project| project.project.id == *id));
        let focused_project_path = focused.map(|project| {
            project
                .project
                .workspace_path
                .clone()
                .unwrap_or_else(|| project.project.path.clone())
        });
        let project = focused.map(|project| project.project.clone());
        let issue = focused.and_then(|project| project.issue.clone());
        let validation = focused
            .map(|project| project.validation.clone())
            .unwrap_or_else(not_run_validation);
        let visible_projects = focused
            .map(|project| vec![project.clone()])
            .unwrap_or_else(|| projects.clone());
        let realtime = realtime_state(&projects);

        DashboardData {
            projects,
            focused_project_id,
            focused_project_path,
            project,
            issue,
            settings_issue,
            validation,
            specs: visible_projects
                .iter()
                .flat_map(|project| project.specs.clone())
                .collect(),
            changes: visible_projects
                .iter()
                .flat_map(|project| project.changes.clone())
                .collect(),
            requirements: visible_projects
                .iter()
                .flat_map(|project| project.requirements.clone())
                .collect(),
            activity: visible_projects
                .iter()
                .flat_map(|project| project.activity.clone())
                .collect(),
            realtime,
        }
    }

    fn refresh_fingerprint(&self) -> bool {
        self.ensure_initialized();
        let mut inner = self.inner.lock().expect("runtime state lock poisoned");
        let next = self.project_fingerprint_locked(&inner.settings);
        if next == inner.last_fingerprint {
            return false;
        }

        let events = fingerprint_activity_events(&inner.last_fingerprint, &next);
        record_activity_events(&mut inner.activity, events);
        mark_validations_stale(&mut inner.validations);
        inner.last_fingerprint = next;
        true
    }

    fn project_fingerprint_locked(&self, settings: &RuntimeSettings) -> ProjectFingerprint {
        let mut fingerprint = HashMap::new();
        for project in &settings.projects {
            collect_project_fingerprint(project, &mut fingerprint);
        }
        fingerprint
    }

    fn emit_snapshot(&self, app: &AppHandle) {
        let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, self.snapshot());
    }
}

async fn run_runtime_blocking<T>(
    message: &'static str,
    task: impl FnOnce() -> RuntimeResult<T> + Send + 'static,
) -> RuntimeResult<T>
where
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|error| runtime_issue("runtime-error", message, Some(error.to_string())))?
}

#[tauri::command]
pub async fn runtime_snapshot(
    manager: State<'_, RuntimeManager>,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    run_runtime_blocking("The runtime snapshot worker failed.", move || {
        Ok(manager.snapshot())
    })
    .await
}

#[tauri::command]
pub async fn runtime_add_project(
    app: AppHandle,
    manager: State<'_, RuntimeManager>,
    path: String,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    let snapshot = run_runtime_blocking("The project add worker failed.", move || {
        add_project_blocking(&manager, path)
    })
    .await?;
    let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
    Ok(snapshot)
}

fn add_project_blocking(manager: &RuntimeManager, path: String) -> RuntimeResult<RuntimeSnapshot> {
    let project_path = normalize_local_path(&path).to_string_lossy().into_owned();
    match discover_project(&project_path) {
        ProjectDiscoveryResult::Ok { .. } => {
            manager.update_settings(|settings| add_project_path(settings, project_path))
        }
        ProjectDiscoveryResult::Err(issue) => Ok(manager.set_settings_issue(issue)),
    }
}

#[tauri::command]
pub async fn runtime_focus_project(
    app: AppHandle,
    manager: State<'_, RuntimeManager>,
    path: Option<String>,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    let snapshot = run_runtime_blocking("The project focus worker failed.", move || {
        manager.update_settings(|settings| {
            let focused_project_id = path
                .as_ref()
                .and_then(|project_path| project_setting_by_path(&settings, project_path))
                .map(|project| project.id.clone());
            with_focused_project_id(settings, focused_project_id)
        })
    })
    .await?;
    let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
    Ok(snapshot)
}

#[tauri::command]
pub async fn runtime_remove_project(
    app: AppHandle,
    manager: State<'_, RuntimeManager>,
    path: String,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    let snapshot = run_runtime_blocking("The project remove worker failed.", move || {
        manager.update_settings(|settings| remove_project_path(settings, &path))
    })
    .await?;
    let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
    Ok(snapshot)
}

#[tauri::command]
pub async fn runtime_clear_projects(
    app: AppHandle,
    manager: State<'_, RuntimeManager>,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    let snapshot = run_runtime_blocking("The project clear worker failed.", move || {
        manager.update_settings(|mut settings| {
            settings.projects = Vec::new();
            settings.focused_project_id = None;
            settings
        })
    })
    .await?;
    let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
    Ok(snapshot)
}

#[tauri::command]
pub async fn runtime_relocate_project(
    app: AppHandle,
    manager: State<'_, RuntimeManager>,
    project_id: String,
    path: String,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    let snapshot = run_runtime_blocking("The project relocate worker failed.", move || {
        relocate_project_blocking(&manager, project_id, path)
    })
    .await?;
    let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
    Ok(snapshot)
}

fn relocate_project_blocking(
    manager: &RuntimeManager,
    project_id: String,
    path: String,
) -> RuntimeResult<RuntimeSnapshot> {
    let project_path = normalize_local_path(&path).to_string_lossy().into_owned();
    {
        let inner = manager.inner.lock().expect("runtime state lock poisoned");
        if project_setting_by_id(&inner.settings, &project_id).is_none() {
            return Ok(manager.set_settings_issue(runtime_issue(
                "missing-path",
                "The project is not available.",
                None,
            )));
        }
    }

    if let ProjectDiscoveryResult::Err(issue) = discover_project(&project_path) {
        return Ok(manager.set_settings_issue(issue));
    }

    manager.update_settings(|settings| update_project_path(settings, &project_id, project_path))
}

#[tauri::command]
pub async fn runtime_update_project_worktrees_directory(
    app: AppHandle,
    manager: State<'_, RuntimeManager>,
    project_id: String,
    path: Option<String>,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    let snapshot = run_runtime_blocking("The worktree directory worker failed.", move || {
        let normalized =
            path.map(|value| normalize_local_path(&value).to_string_lossy().into_owned());
        manager.update_settings(|settings| {
            update_project_worktrees_path(settings, &project_id, normalized)
        })
    })
    .await?;
    let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
    Ok(snapshot)
}

#[tauri::command]
pub async fn runtime_update_project_workspace_directory(
    app: AppHandle,
    manager: State<'_, RuntimeManager>,
    project_id: String,
    path: Option<String>,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    let snapshot = run_runtime_blocking("The workspace directory worker failed.", move || {
        let normalized =
            path.map(|value| normalize_local_path(&value).to_string_lossy().into_owned());
        manager.update_settings(|settings| {
            update_project_workspace_path(settings, &project_id, normalized)
        })
    })
    .await?;
    let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
    Ok(snapshot)
}

#[tauri::command]
pub async fn runtime_add_project_worktree_path(
    app: AppHandle,
    manager: State<'_, RuntimeManager>,
    project_id: String,
    path: String,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    let snapshot = run_runtime_blocking("The worktree add worker failed.", move || {
        let normalized = normalize_local_path(&path).to_string_lossy().into_owned();
        manager.update_settings(|settings| {
            add_project_worktree_path(settings, &project_id, normalized)
        })
    })
    .await?;
    let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
    Ok(snapshot)
}

#[tauri::command]
pub async fn runtime_remove_project_worktree_path(
    app: AppHandle,
    manager: State<'_, RuntimeManager>,
    project_id: String,
    path: String,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    let snapshot = run_runtime_blocking("The worktree remove worker failed.", move || {
        manager
            .update_settings(|settings| remove_project_worktree_path(settings, &project_id, &path))
    })
    .await?;
    let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
    Ok(snapshot)
}

#[tauri::command]
pub async fn runtime_refresh_project(
    app: AppHandle,
    manager: State<'_, RuntimeManager>,
    _project_id: Option<String>,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    let snapshot = run_runtime_blocking("The project refresh worker failed.", move || {
        manager.refresh_fingerprint();
        Ok(manager.snapshot())
    })
    .await?;
    let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
    Ok(snapshot)
}

#[tauri::command]
pub async fn runtime_set_change_task_completed(
    manager: State<'_, RuntimeManager>,
    source_path: String,
    line_number: usize,
    completed: bool,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    run_runtime_blocking("The task update worker failed.", move || {
        set_change_task_completed_blocking(&manager, source_path, line_number, completed)
    })
    .await
}

fn set_change_task_completed_blocking(
    manager: &RuntimeManager,
    source_path: String,
    line_number: usize,
    completed: bool,
) -> RuntimeResult<RuntimeSnapshot> {
    manager.ensure_initialized();
    let settings = {
        let inner = manager.inner.lock().expect("runtime state lock poisoned");
        inner.settings.clone()
    };

    if let Err(issue) = validate_task_source_path(&settings, &source_path) {
        return Ok(manager.set_settings_issue(issue));
    }

    if let Err(issue) = write_task_completion(&source_path, line_number, completed) {
        return Ok(manager.set_settings_issue(issue));
    }

    {
        let mut inner = manager.inner.lock().expect("runtime state lock poisoned");
        inner.settings_issue = None;
        mark_validations_stale(&mut inner.validations);
        inner.last_fingerprint = manager.project_fingerprint_locked(&inner.settings);
    }

    Ok(manager.snapshot())
}

#[tauri::command]
pub async fn runtime_set_theme(
    manager: State<'_, RuntimeManager>,
    theme_mode: String,
) -> RuntimeResult<()> {
    let manager = manager.inner().clone();
    run_runtime_blocking("The preference update worker failed.", move || {
        manager.update_preferences(|settings| with_theme(settings, theme_mode))
    })
    .await
}

#[tauri::command]
pub async fn runtime_set_language(
    manager: State<'_, RuntimeManager>,
    language: String,
) -> RuntimeResult<()> {
    let manager = manager.inner().clone();
    run_runtime_blocking("The preference update worker failed.", move || {
        manager.update_preferences(|settings| with_language(settings, language))
    })
    .await
}

#[tauri::command]
pub async fn runtime_run_validation(
    app: AppHandle,
    manager: State<'_, RuntimeManager>,
) -> RuntimeResult<RuntimeSnapshot> {
    let manager = manager.inner().clone();
    run_runtime_blocking("The validation worker failed.", move || {
        run_validation_blocking(&app, &manager)
    })
    .await
}

fn run_validation_blocking(
    app: &AppHandle,
    manager: &RuntimeManager,
) -> RuntimeResult<RuntimeSnapshot> {
    manager.ensure_initialized();
    let (focused_id, focused_setting) = {
        let inner = manager.inner.lock().expect("runtime state lock poisoned");
        let focused_id = inner.settings.focused_project_id.clone();
        let focused_setting = focused_id
            .as_ref()
            .and_then(|id| project_setting_by_id(&inner.settings, id))
            .cloned();
        (focused_id, focused_setting)
    };

    let Some(project_id) = focused_id else {
        let snapshot = manager.set_settings_issue(runtime_issue(
            "missing-path",
            "Focus a local project before running validation.",
            None,
        ));
        let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
        return Ok(snapshot);
    };
    let Some(project_setting) = focused_setting else {
        let snapshot = manager.set_settings_issue(runtime_issue(
            "missing-path",
            "The focused project is not available.",
            None,
        ));
        let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
        return Ok(snapshot);
    };

    {
        let mut inner = manager.inner.lock().expect("runtime state lock poisoned");
        inner.validations.insert(
            project_id.clone(),
            ValidationResult {
                status: "running".to_string(),
                started_at: Some(now_iso()),
                command: Some("openspec validate --all".to_string()),
                stdout: None,
                stderr: None,
                exit_code: None,
                ended_at: None,
                message: None,
            },
        );
    }
    manager.emit_snapshot(app);

    let dashboard_project = dashboard_project(
        &project_setting,
        &HashMap::from([(project_id.clone(), not_run_validation())]),
        Vec::new(),
    );
    let validation = run_project_validation(&dashboard_project.project);
    {
        let mut inner = manager.inner.lock().expect("runtime state lock poisoned");
        inner.validations.insert(project_id, validation);
    }

    let snapshot = manager.snapshot();
    let _ = app.emit(RUNTIME_SNAPSHOT_EVENT, snapshot.clone());
    Ok(snapshot)
}

pub(super) fn now_iso() -> String {
    time::OffsetDateTime::from(SystemTime::now())
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}
