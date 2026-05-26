use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeIssue {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecScope {
    pub id: String,
    pub label: String,
    pub path: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveryFlags {
    pub has_open_spec_dir: bool,
    pub has_config: bool,
    pub has_specs_dir: bool,
    pub has_changes_dir: bool,
    pub is_empty_open_spec: bool,
    pub scopes: Vec<SpecScope>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectBinding {
    pub id: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_path: Option<String>,
    pub name: String,
    pub dialect: String,
    pub discovery: DiscoveryFlags,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub worktrees_path: Option<String>,
    #[serde(default)]
    pub worktree_paths: Vec<String>,
    #[serde(default)]
    pub checkouts: Vec<ProjectCheckout>,
    #[serde(default)]
    pub worktree_issues: Vec<RuntimeIssue>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectCheckout {
    pub id: String,
    pub kind: String,
    pub source: String,
    pub path: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,
    pub dialect: String,
    pub discovery: DiscoveryFlags,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue: Option<RuntimeIssue>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedCheckoutSource {
    pub checkout_id: String,
    pub checkout_kind: String,
    pub checkout_path: String,
    pub checkout_label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_branch: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stdout: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stderr: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ended_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedRequirement {
    pub id: String,
    pub title: String,
    pub source_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dialect: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spec_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub change_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_branch: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedSpecDetail {
    pub content: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedSpec {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_id: Option<String>,
    pub title: String,
    pub source_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dialect: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_branch: Option<String>,
    pub requirement_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<NormalizedSpecDetail>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedChangeTask {
    pub id: String,
    pub text: String,
    pub completed: bool,
    pub source_path: String,
    pub line_number: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedChangeDeltaSpec {
    pub spec_id: String,
    pub source_path: String,
    pub content: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedChangeFile {
    pub path: String,
    pub source_path: String,
    pub content: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedChangeProposal {
    pub content: String,
    pub why: String,
    pub what_changes: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedChangeDetail {
    pub proposal: NormalizedChangeProposal,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub design: Option<String>,
    pub tasks: Vec<NormalizedChangeTask>,
    pub delta_specs: Vec<NormalizedChangeDeltaSpec>,
    pub files: Vec<NormalizedChangeFile>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskSummary {
    pub total: usize,
    pub completed: usize,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedScopedChange {
    pub id: String,
    pub title: String,
    pub source_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dialect: Option<String>,
    pub lifecycle: String,
    pub created_at: String,
    pub updated_at: String,
    pub scope_id: String,
    pub scope_label: String,
    pub scope_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_branch: Option<String>,
    pub has_proposal: bool,
    pub has_design: bool,
    pub has_tasks: bool,
    pub task_summary: TaskSummary,
    pub requirement_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<NormalizedChangeDetail>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedChange {
    pub id: String,
    pub title: String,
    pub source_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dialect: Option<String>,
    pub lifecycle: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_branch: Option<String>,
    pub has_proposal: bool,
    pub has_design: bool,
    pub has_tasks: bool,
    pub task_summary: TaskSummary,
    pub requirement_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<NormalizedChangeDetail>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scoped_changes: Option<Vec<NormalizedScopedChange>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_sources: Option<Vec<NormalizedCheckoutSource>>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectEvent {
    pub project_path: String,
    pub dialect: String,
    pub event_type: String,
    pub file_path: String,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_branch: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entity_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_path: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RealtimeState {
    pub watcher: String,
    pub connection: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue: Option<RuntimeIssue>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardProject {
    pub project: ProjectBinding,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue: Option<RuntimeIssue>,
    pub validation: ValidationResult,
    pub checkouts: Vec<ProjectCheckout>,
    pub scopes: Vec<SpecScope>,
    pub specs: Vec<NormalizedSpec>,
    pub changes: Vec<NormalizedChange>,
    pub requirements: Vec<NormalizedRequirement>,
    pub activity: Vec<ProjectEvent>,
    pub realtime: RealtimeState,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardData {
    pub projects: Vec<DashboardProject>,
    pub focused_project_id: Option<String>,
    pub focused_project_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project: Option<ProjectBinding>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue: Option<RuntimeIssue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settings_issue: Option<RuntimeIssue>,
    pub validation: ValidationResult,
    pub specs: Vec<NormalizedSpec>,
    pub changes: Vec<NormalizedChange>,
    pub requirements: Vec<NormalizedRequirement>,
    pub activity: Vec<ProjectEvent>,
    pub realtime: RealtimeState,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeProjectSetting {
    pub id: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub worktrees_path: Option<String>,
    #[serde(default)]
    pub worktree_paths: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeSettings {
    pub version: u8,
    pub theme_mode: String,
    pub language: String,
    pub projects: Vec<RuntimeProjectSetting>,
    pub focused_project_id: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeSnapshot {
    pub settings: RuntimeSettings,
    pub dashboard: DashboardData,
}

pub fn runtime_issue(code: &str, message: &str, detail: Option<String>) -> RuntimeIssue {
    RuntimeIssue {
        code: code.to_string(),
        message: message.to_string(),
        detail,
    }
}

pub fn not_run_validation() -> ValidationResult {
    ValidationResult {
        status: "not-run".to_string(),
        command: None,
        stdout: None,
        stderr: None,
        exit_code: None,
        started_at: None,
        ended_at: None,
        message: None,
    }
}
