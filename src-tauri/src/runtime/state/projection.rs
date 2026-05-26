use std::{cmp::Ordering, collections::HashMap};

use crate::{
    runtime::openspec::{read_openspec_project, ProjectSpecData},
    runtime::project::{
        discover_project, discover_worktree_checkouts, invalid_project_binding,
        primary_checkout_from_binding, ProjectDiscoveryResult,
    },
    runtime::types::{
        not_run_validation, runtime_issue, DashboardProject, NormalizedChange,
        NormalizedCheckoutSource, NormalizedRequirement, NormalizedScopedChange, NormalizedSpec,
        ProjectBinding, ProjectCheckout, ProjectEvent, RealtimeState, RuntimeIssue,
        RuntimeProjectSetting, SpecScope, ValidationResult,
    },
};

pub(super) fn dashboard_project(
    setting: &RuntimeProjectSetting,
    validations: &HashMap<String, ValidationResult>,
    activity: Vec<ProjectEvent>,
) -> DashboardProject {
    let (binding, issue) = match discover_project(&setting.path) {
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
        ProjectDiscoveryResult::Err(issue) => (invalid_project_binding(setting), Some(issue)),
    };
    let primary = primary_checkout_from_binding(&binding);
    let (worktree_checkouts, worktree_issues) = discover_worktree_checkouts(setting, &binding);
    let checkouts = [vec![primary], worktree_checkouts].concat();
    let project_binding = ProjectBinding {
        checkouts: checkouts.clone(),
        worktree_issues,
        ..binding
    };
    let validation = validations
        .get(&setting.id)
        .cloned()
        .unwrap_or_else(not_run_validation);

    project_dashboard_data(project_binding, issue, validation, activity)
}

fn project_dashboard_data(
    binding: ProjectBinding,
    issue: Option<RuntimeIssue>,
    validation: ValidationResult,
    activity: Vec<ProjectEvent>,
) -> DashboardProject {
    let checkouts = if binding.checkouts.is_empty() {
        vec![fallback_primary_checkout(&binding)]
    } else {
        binding.checkouts.clone()
    };
    let mut checkout_projects = checkouts
        .iter()
        .map(|checkout| checkout_project_data(&binding, checkout))
        .collect::<Vec<_>>();

    let issue = checkout_projects
        .iter()
        .find_map(|project| project.issue.clone())
        .or(issue);
    let scopes = aggregate_checkout_scopes(&checkouts);
    let specs = checkout_projects
        .iter_mut()
        .flat_map(|project| std::mem::take(&mut project.specs))
        .collect();
    let changes = merge_checkout_changes(
        checkout_projects
            .iter_mut()
            .flat_map(|project| std::mem::take(&mut project.changes))
            .collect(),
    );
    let requirements = checkout_projects
        .iter_mut()
        .flat_map(|project| std::mem::take(&mut project.requirements))
        .collect();

    DashboardProject {
        project: binding,
        issue,
        validation,
        checkouts,
        scopes,
        specs,
        changes,
        requirements,
        activity,
        realtime: RealtimeState {
            watcher: "watching".to_string(),
            connection: "connected".to_string(),
            issue: None,
        },
    }
}

#[derive(Default)]
struct CheckoutProjectData {
    issue: Option<RuntimeIssue>,
    specs: Vec<NormalizedSpec>,
    changes: Vec<NormalizedChange>,
    requirements: Vec<NormalizedRequirement>,
}

fn checkout_project_data(
    project: &ProjectBinding,
    checkout: &ProjectCheckout,
) -> CheckoutProjectData {
    if checkout.dialect != "openspec" {
        return CheckoutProjectData {
            issue: Some(runtime_issue(
                "unsupported-dialect",
                if checkout.dialect == "none" {
                    "No supported spec dialect was detected."
                } else {
                    "The detected spec dialect is not supported yet."
                },
                Some(checkout.dialect.clone()),
            )),
            ..CheckoutProjectData::default()
        };
    }

    let binding = ProjectBinding {
        path: checkout.path.clone(),
        dialect: checkout.dialect.clone(),
        discovery: checkout.discovery.clone(),
        checkouts: vec![checkout.clone()],
        ..project.clone()
    };
    let data = read_openspec_project(&binding);
    tag_project_data(data, project, checkout)
}

fn tag_project_data(
    data: ProjectSpecData,
    project: &ProjectBinding,
    checkout: &ProjectCheckout,
) -> CheckoutProjectData {
    CheckoutProjectData {
        issue: checkout.issue.clone(),
        specs: data
            .specs
            .into_iter()
            .map(|spec| tag_spec(spec, project, checkout))
            .collect(),
        changes: data
            .changes
            .into_iter()
            .map(|change| tag_change(change, project, checkout))
            .collect(),
        requirements: data
            .requirements
            .into_iter()
            .map(|requirement| tag_requirement(requirement, project, checkout))
            .collect(),
    }
}

fn tag_spec(
    mut spec: NormalizedSpec,
    project: &ProjectBinding,
    checkout: &ProjectCheckout,
) -> NormalizedSpec {
    spec.id = checkout_entity_id(checkout, &spec.id);
    spec.dialect = Some(checkout.dialect.clone());
    spec.project_id = Some(project.id.clone());
    spec.project_path = Some(project.path.clone());
    spec.project_name = Some(project.name.clone());
    spec.checkout_id = Some(checkout.id.clone());
    spec.checkout_kind = Some(checkout.kind.clone());
    spec.checkout_path = Some(checkout.path.clone());
    spec.checkout_label = Some(checkout.label.clone());
    spec.checkout_branch = checkout.branch.clone();
    spec
}

fn tag_change(
    mut change: NormalizedChange,
    project: &ProjectBinding,
    checkout: &ProjectCheckout,
) -> NormalizedChange {
    change.dialect = Some(checkout.dialect.clone());
    change.project_id = Some(project.id.clone());
    change.project_path = Some(project.path.clone());
    change.project_name = Some(project.name.clone());
    change.scope_id = checkout_scope_id(checkout, change.scope_id.as_deref());
    change.scope_label = checkout_scope_label(checkout, change.scope_label.as_deref());
    change.checkout_id = Some(checkout.id.clone());
    change.checkout_kind = Some(checkout.kind.clone());
    change.checkout_path = Some(checkout.path.clone());
    change.checkout_label = Some(checkout.label.clone());
    change.checkout_branch = checkout.branch.clone();
    change.checkout_sources = Some(vec![checkout_source(
        checkout,
        Some(change.updated_at.clone()),
    )]);
    change.scoped_changes = change.scoped_changes.map(|scoped_changes| {
        scoped_changes
            .into_iter()
            .map(|scoped_change| tag_scoped_change(scoped_change, checkout))
            .collect()
    });
    change
}

fn tag_requirement(
    mut requirement: NormalizedRequirement,
    project: &ProjectBinding,
    checkout: &ProjectCheckout,
) -> NormalizedRequirement {
    requirement.dialect = Some(checkout.dialect.clone());
    requirement.project_id = Some(project.id.clone());
    requirement.project_path = Some(project.path.clone());
    requirement.project_name = Some(project.name.clone());
    requirement.scope_id = checkout_scope_id(checkout, requirement.scope_id.as_deref());
    requirement.scope_label = checkout_scope_label(checkout, requirement.scope_label.as_deref());
    requirement.checkout_id = Some(checkout.id.clone());
    requirement.checkout_kind = Some(checkout.kind.clone());
    requirement.checkout_path = Some(checkout.path.clone());
    requirement.checkout_label = Some(checkout.label.clone());
    requirement.checkout_branch = checkout.branch.clone();
    requirement
}

fn tag_scoped_change(
    mut change: NormalizedScopedChange,
    checkout: &ProjectCheckout,
) -> NormalizedScopedChange {
    change.dialect = Some(checkout.dialect.clone());
    change.scope_id =
        checkout_scope_id(checkout, Some(&change.scope_id)).unwrap_or(change.scope_id);
    change.scope_label =
        checkout_scope_label(checkout, Some(&change.scope_label)).unwrap_or(change.scope_label);
    change.checkout_id = Some(checkout.id.clone());
    change.checkout_kind = Some(checkout.kind.clone());
    change.checkout_path = Some(checkout.path.clone());
    change.checkout_label = Some(checkout.label.clone());
    change.checkout_branch = checkout.branch.clone();
    change
}

fn aggregate_checkout_scopes(checkouts: &[ProjectCheckout]) -> Vec<SpecScope> {
    let mut seen = HashMap::new();
    for checkout in checkouts
        .iter()
        .filter(|checkout| checkout.dialect == "openspec")
    {
        for scope in &checkout.discovery.scopes {
            let scope = SpecScope {
                id: checkout_scope_id(checkout, Some(&scope.id)).unwrap_or(scope.id.clone()),
                label: checkout_scope_label(checkout, Some(&scope.label))
                    .unwrap_or(scope.label.clone()),
                path: scope.path.clone(),
            };
            seen.entry(scope.id.clone()).or_insert(scope);
        }
    }

    seen.into_values().collect()
}

fn merge_checkout_changes(changes: Vec<NormalizedChange>) -> Vec<NormalizedChange> {
    let mut groups: HashMap<String, Vec<NormalizedChange>> = HashMap::new();
    for change in changes {
        groups
            .entry(format!("{}:{}", change.lifecycle, change.id))
            .or_default()
            .push(change);
    }

    groups
        .into_values()
        .map(|mut group| {
            group.sort_by(compare_changes_by_updated_at);
            let mut primary = group[0].clone();
            primary.checkout_sources = Some(
                group
                    .iter()
                    .map(|change| {
                        checkout_source_from_change(change, Some(change.updated_at.clone()))
                    })
                    .collect(),
            );
            primary
        })
        .collect()
}

fn compare_changes_by_updated_at(first: &NormalizedChange, second: &NormalizedChange) -> Ordering {
    second.updated_at.cmp(&first.updated_at).then_with(|| {
        match (
            first.checkout_kind.as_deref() == Some("worktree"),
            second.checkout_kind.as_deref() == Some("worktree"),
        ) {
            (true, false) => Ordering::Less,
            (false, true) => Ordering::Greater,
            _ => Ordering::Equal,
        }
    })
}

pub(super) fn realtime_state(projects: &[DashboardProject]) -> RealtimeState {
    let error_project = projects
        .iter()
        .find(|project| project.realtime.watcher == "error");
    let watching = projects
        .iter()
        .any(|project| project.realtime.watcher == "watching");

    RealtimeState {
        watcher: if error_project.is_some() {
            "error"
        } else if watching {
            "watching"
        } else {
            "idle"
        }
        .to_string(),
        connection: "connected".to_string(),
        issue: error_project.and_then(|project| project.realtime.issue.clone()),
    }
}

pub(super) fn fallback_primary_checkout(project: &ProjectBinding) -> ProjectCheckout {
    ProjectCheckout {
        id: "primary".to_string(),
        kind: "primary".to_string(),
        source: "primary".to_string(),
        path: project.path.clone(),
        label: project.name.clone(),
        branch: None,
        dialect: project.dialect.clone(),
        discovery: project.discovery.clone(),
        issue: None,
    }
}

fn checkout_entity_id(checkout: &ProjectCheckout, entity_id: &str) -> String {
    if checkout.kind == "primary" {
        entity_id.to_string()
    } else {
        format!("{}__{}", checkout.id, entity_id)
    }
}

pub(super) fn checkout_scope_id(
    checkout: &ProjectCheckout,
    scope_id: Option<&str>,
) -> Option<String> {
    scope_id.map(|value| {
        if checkout.kind == "primary" {
            value.to_string()
        } else {
            format!("{}__{}", checkout.id, value)
        }
    })
}

pub(super) fn checkout_scope_label(
    checkout: &ProjectCheckout,
    scope_label: Option<&str>,
) -> Option<String> {
    scope_label.map(|value| {
        if checkout.kind == "primary" {
            value.to_string()
        } else {
            format!("{} / {}", checkout.label, value)
        }
    })
}

fn checkout_source(
    checkout: &ProjectCheckout,
    updated_at: Option<String>,
) -> NormalizedCheckoutSource {
    NormalizedCheckoutSource {
        checkout_id: checkout.id.clone(),
        checkout_kind: checkout.kind.clone(),
        checkout_path: checkout.path.clone(),
        checkout_label: checkout.label.clone(),
        checkout_branch: checkout.branch.clone(),
        updated_at,
    }
}

fn checkout_source_from_change(
    change: &NormalizedChange,
    updated_at: Option<String>,
) -> NormalizedCheckoutSource {
    NormalizedCheckoutSource {
        checkout_id: change
            .checkout_id
            .clone()
            .unwrap_or_else(|| "primary".to_string()),
        checkout_kind: change
            .checkout_kind
            .clone()
            .unwrap_or_else(|| "primary".to_string()),
        checkout_path: change
            .checkout_path
            .clone()
            .or_else(|| change.project_path.clone())
            .unwrap_or_default(),
        checkout_label: change
            .checkout_label
            .clone()
            .or_else(|| change.project_name.clone())
            .unwrap_or_else(|| "primary".to_string()),
        checkout_branch: change.checkout_branch.clone(),
        updated_at,
    }
}
