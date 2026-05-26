use std::{collections::HashMap, fs, path::Path, time::SystemTime};

use time::{format_description::well_known::Rfc3339, OffsetDateTime};

use crate::runtime::types::{
    NormalizedChange, NormalizedChangeDeltaSpec, NormalizedChangeDetail, NormalizedChangeFile,
    NormalizedChangeProposal, NormalizedChangeTask, NormalizedRequirement, NormalizedScopedChange,
    NormalizedSpec, NormalizedSpecDetail, ProjectBinding, SpecScope, TaskSummary,
};

const REQUIREMENT_PREFIX: &str = "### Requirement:";

#[derive(Clone)]
pub struct ProjectSpecData {
    pub specs: Vec<NormalizedSpec>,
    pub changes: Vec<NormalizedChange>,
    pub requirements: Vec<NormalizedRequirement>,
}

#[derive(Clone)]
struct SpecWithRequirements {
    spec: NormalizedSpec,
    requirements: Vec<NormalizedRequirement>,
}

#[derive(Clone)]
struct ChangeWithRequirements {
    change: NormalizedChange,
    requirements: Vec<NormalizedRequirement>,
}

pub fn read_openspec_project(binding: &ProjectBinding) -> ProjectSpecData {
    let mut specs_with_requirements = Vec::new();
    let mut scoped_changes = Vec::new();

    for scope in &binding.discovery.scopes {
        let openspec_path = Path::new(&binding.path).join(&scope.path).join("openspec");
        specs_with_requirements.extend(read_specs(&openspec_path, scope));
        scoped_changes.extend(read_changes(&openspec_path, scope));
    }

    let specs = specs_with_requirements
        .iter()
        .map(|item| item.spec.clone())
        .collect::<Vec<_>>();
    let changes = aggregate_scoped_changes(&scoped_changes);
    let mut requirements = specs_with_requirements
        .into_iter()
        .flat_map(|item| item.requirements)
        .collect::<Vec<_>>();
    requirements.extend(
        scoped_changes
            .into_iter()
            .flat_map(|item| item.requirements)
            .collect::<Vec<_>>(),
    );

    ProjectSpecData {
        specs,
        changes,
        requirements,
    }
}

fn read_specs(openspec_path: &Path, scope: &SpecScope) -> Vec<SpecWithRequirements> {
    let specs_dir = openspec_path.join("specs");
    directory_entries(&specs_dir)
        .into_iter()
        .filter_map(|entry| {
            let spec_dir = specs_dir.join(&entry);
            let spec_path = spec_dir.join("spec.md");
            if !spec_path.is_file() {
                return None;
            }

            let text = fs::read_to_string(&spec_path).ok()?;
            let timestamps = path_timestamps(&spec_dir);
            let requirements = extract_requirements(
                &text,
                &spec_path,
                RequirementIds {
                    spec_id: Some(entry.clone()),
                    change_id: None,
                    scope: Some(scope.clone()),
                },
            );

            Some(SpecWithRequirements {
                spec: NormalizedSpec {
                    id: scoped_entity_id(scope, &entry),
                    display_id: Some(entry.clone()),
                    title: first_heading(&text).unwrap_or_else(|| entry.clone()),
                    source_path: path_string(&spec_path),
                    dialect: None,
                    created_at: timestamps.0,
                    updated_at: timestamps.1,
                    project_id: None,
                    project_path: None,
                    project_name: None,
                    scope_id: Some(scope.id.clone()),
                    scope_label: Some(scope.label.clone()),
                    scope_path: Some(scope.path.clone()),
                    checkout_id: None,
                    checkout_kind: None,
                    checkout_path: None,
                    checkout_label: None,
                    checkout_branch: None,
                    requirement_count: requirements.len(),
                    detail: Some(NormalizedSpecDetail { content: text }),
                },
                requirements,
            })
        })
        .collect()
}

fn read_changes(openspec_path: &Path, scope: &SpecScope) -> Vec<ChangeWithRequirements> {
    let changes_dir = openspec_path.join("changes");
    let active_entries = directory_entries(&changes_dir)
        .into_iter()
        .filter(|entry| entry != "archive")
        .collect::<Vec<_>>();
    let archived_dir = changes_dir.join("archive");
    let archived_entries = directory_entries(&archived_dir);

    let mut changes = read_change_entries(&changes_dir, active_entries, scope, "active");
    changes.extend(read_change_entries(
        &archived_dir,
        archived_entries,
        scope,
        "archived",
    ));
    changes
}

fn read_change_entries(
    root: &Path,
    entries: Vec<String>,
    scope: &SpecScope,
    lifecycle: &str,
) -> Vec<ChangeWithRequirements> {
    entries
        .into_iter()
        .map(|entry| {
            let change_path = root.join(&entry);
            let proposal = read_optional_file(&change_path.join("proposal.md"));
            let design = read_optional_file(&change_path.join("design.md"));
            let tasks_path = change_path.join("tasks.md");
            let tasks = read_optional_file(&tasks_path);
            let parsed_tasks = tasks
                .as_ref()
                .map(|content| parse_tasks(content, &tasks_path))
                .unwrap_or_default();
            let proposal_content = proposal.clone().unwrap_or_default();
            let proposal_sections = parse_proposal_sections(&proposal_content);
            let requirements = read_change_requirements(&change_path, &entry, scope);
            let timestamps = path_timestamps(&change_path);
            let title = first_heading(
                [proposal.as_deref(), design.as_deref(), tasks.as_deref()]
                    .into_iter()
                    .flatten()
                    .next()
                    .unwrap_or(""),
            )
            .unwrap_or_else(|| entry.clone());

            ChangeWithRequirements {
                change: NormalizedChange {
                    id: entry.clone(),
                    title,
                    source_path: path_string(&change_path),
                    dialect: None,
                    lifecycle: lifecycle.to_string(),
                    created_at: timestamps.0,
                    updated_at: timestamps.1,
                    project_id: None,
                    project_path: None,
                    project_name: None,
                    scope_id: Some(scope.id.clone()),
                    scope_label: Some(scope.label.clone()),
                    scope_path: Some(scope.path.clone()),
                    checkout_id: None,
                    checkout_kind: None,
                    checkout_path: None,
                    checkout_label: None,
                    checkout_branch: None,
                    has_proposal: proposal.is_some(),
                    has_design: design.is_some(),
                    has_tasks: tasks.is_some(),
                    task_summary: TaskSummary {
                        total: parsed_tasks.len(),
                        completed: parsed_tasks.iter().filter(|task| task.completed).count(),
                    },
                    requirement_count: requirements.len(),
                    detail: Some(NormalizedChangeDetail {
                        proposal: NormalizedChangeProposal {
                            content: proposal_content,
                            why: proposal_sections.0,
                            what_changes: proposal_sections.1,
                        },
                        design,
                        tasks: parsed_tasks,
                        delta_specs: read_delta_specs(&change_path),
                        files: read_markdown_files(&change_path),
                    }),
                    scoped_changes: None,
                    checkout_sources: None,
                },
                requirements,
            }
        })
        .collect()
}

fn read_change_requirements(
    change_path: &Path,
    change_id: &str,
    scope: &SpecScope,
) -> Vec<NormalizedRequirement> {
    let specs_root = change_path.join("specs");
    directory_entries(&specs_root)
        .into_iter()
        .flat_map(|entry| {
            let spec_path = specs_root.join(&entry).join("spec.md");
            let Some(text) = read_optional_file(&spec_path) else {
                return Vec::new();
            };

            extract_requirements(
                &text,
                &spec_path,
                RequirementIds {
                    spec_id: Some(entry),
                    change_id: Some(change_id.to_string()),
                    scope: Some(scope.clone()),
                },
            )
        })
        .collect()
}

fn aggregate_scoped_changes(changes: &[ChangeWithRequirements]) -> Vec<NormalizedChange> {
    let mut groups: HashMap<String, Vec<ChangeWithRequirements>> = HashMap::new();
    for change in changes {
        let key = format!("{}:{}", change.change.lifecycle, change.change.id);
        groups.entry(key).or_default().push(change.clone());
    }

    groups
        .into_values()
        .map(aggregate_change_group)
        .collect::<Vec<_>>()
}

fn aggregate_change_group(mut group: Vec<ChangeWithRequirements>) -> NormalizedChange {
    group.sort_by(compare_scoped_changes);
    let primary = group
        .iter()
        .find(|item| item.change.scope_id.as_deref() == Some("root"))
        .unwrap_or(&group[0])
        .change
        .clone();
    let scoped_changes = group
        .iter()
        .map(|item| to_scoped_change(&item.change))
        .collect::<Vec<_>>();
    let single = group.len() == 1;

    NormalizedChange {
        id: primary.id,
        title: primary.title,
        source_path: primary.source_path,
        dialect: None,
        lifecycle: primary.lifecycle,
        created_at: earliest_timestamp(group.iter().map(|item| item.change.created_at.as_str())),
        updated_at: latest_timestamp(group.iter().map(|item| item.change.updated_at.as_str())),
        project_id: None,
        project_path: None,
        project_name: None,
        scope_id: single.then(|| primary.scope_id.clone()).flatten(),
        scope_label: single.then(|| primary.scope_label.clone()).flatten(),
        scope_path: single.then(|| primary.scope_path.clone()).flatten(),
        checkout_id: None,
        checkout_kind: None,
        checkout_path: None,
        checkout_label: None,
        checkout_branch: None,
        has_proposal: group.iter().any(|item| item.change.has_proposal),
        has_design: group.iter().any(|item| item.change.has_design),
        has_tasks: group.iter().any(|item| item.change.has_tasks),
        task_summary: TaskSummary {
            total: group
                .iter()
                .map(|item| item.change.task_summary.total)
                .sum(),
            completed: group
                .iter()
                .map(|item| item.change.task_summary.completed)
                .sum(),
        },
        requirement_count: group.iter().map(|item| item.change.requirement_count).sum(),
        detail: primary.detail,
        scoped_changes: Some(scoped_changes),
        checkout_sources: None,
    }
}

fn to_scoped_change(change: &NormalizedChange) -> NormalizedScopedChange {
    NormalizedScopedChange {
        id: change.id.clone(),
        title: change.title.clone(),
        source_path: change.source_path.clone(),
        dialect: None,
        lifecycle: change.lifecycle.clone(),
        created_at: change.created_at.clone(),
        updated_at: change.updated_at.clone(),
        scope_id: change
            .scope_id
            .clone()
            .unwrap_or_else(|| "root".to_string()),
        scope_label: change
            .scope_label
            .clone()
            .unwrap_or_else(|| "root".to_string()),
        scope_path: change.scope_path.clone().unwrap_or_default(),
        checkout_id: None,
        checkout_kind: None,
        checkout_path: None,
        checkout_label: None,
        checkout_branch: None,
        has_proposal: change.has_proposal,
        has_design: change.has_design,
        has_tasks: change.has_tasks,
        task_summary: change.task_summary.clone(),
        requirement_count: change.requirement_count,
        detail: change.detail.clone(),
    }
}

struct RequirementIds {
    spec_id: Option<String>,
    change_id: Option<String>,
    scope: Option<SpecScope>,
}

fn extract_requirements(
    text: &str,
    source_path: &Path,
    ids: RequirementIds,
) -> Vec<NormalizedRequirement> {
    text.lines()
        .map(str::trim)
        .filter(|line| line.starts_with(REQUIREMENT_PREFIX))
        .map(|line| {
            let title = line[REQUIREMENT_PREFIX.len()..].trim().to_string();
            NormalizedRequirement {
                id: slug(
                    [
                        ids.change_id.as_deref(),
                        ids.spec_id.as_deref(),
                        Some(&title),
                    ]
                    .into_iter()
                    .flatten()
                    .collect::<Vec<_>>()
                    .join("-")
                    .as_str(),
                ),
                title,
                source_path: path_string(source_path),
                dialect: None,
                project_id: None,
                project_path: None,
                project_name: None,
                scope_id: ids.scope.as_ref().map(|scope| scope.id.clone()),
                scope_label: ids.scope.as_ref().map(|scope| scope.label.clone()),
                scope_path: ids.scope.as_ref().map(|scope| scope.path.clone()),
                spec_id: ids.spec_id.clone(),
                change_id: ids.change_id.clone(),
                checkout_id: None,
                checkout_kind: None,
                checkout_path: None,
                checkout_label: None,
                checkout_branch: None,
            }
        })
        .collect()
}

fn parse_tasks(text: &str, source_path: &Path) -> Vec<NormalizedChangeTask> {
    let mut section: Option<String> = None;
    let mut tasks = Vec::new();

    for (line_index, raw_line) in text.lines().enumerate() {
        let line = raw_line.trim();
        if let Some(heading) = line.strip_prefix("#") {
            let heading = heading.trim_start_matches('#').trim();
            if !heading.is_empty() {
                section = Some(heading.to_string());
                continue;
            }
        }

        let task_line = raw_line.trim_start();
        let Some(rest) = task_line
            .strip_prefix("- [")
            .or_else(|| task_line.strip_prefix("* ["))
        else {
            continue;
        };
        let Some((marker, text)) = rest.split_once("]") else {
            continue;
        };
        if marker != " " && !marker.eq_ignore_ascii_case("x") {
            continue;
        }

        let task_text = text.trim().to_string();
        if task_text.is_empty() {
            continue;
        }

        tasks.push(NormalizedChangeTask {
            id: format!("task-{}", tasks.len() + 1),
            text: task_text,
            completed: marker.eq_ignore_ascii_case("x"),
            source_path: path_string(source_path),
            line_number: line_index + 1,
            section: section.clone(),
        });
    }

    tasks
}

fn parse_proposal_sections(text: &str) -> (String, String) {
    let mut current: Option<&str> = None;
    let mut why = Vec::new();
    let mut what_changes = Vec::new();

    for raw_line in text.lines() {
        if let Some(heading) = raw_line.strip_prefix("## ") {
            let title = heading.trim().to_lowercase();
            current = if title.contains("why") {
                Some("why")
            } else if title.contains("what") || title.contains("change") {
                Some("what")
            } else {
                None
            };
            continue;
        }

        match current {
            Some("why") => why.push(raw_line),
            Some("what") => what_changes.push(raw_line),
            _ => {}
        }
    }

    (
        why.join("\n").trim().to_string(),
        what_changes.join("\n").trim().to_string(),
    )
}

fn read_delta_specs(change_path: &Path) -> Vec<NormalizedChangeDeltaSpec> {
    let specs_root = change_path.join("specs");
    directory_entries(&specs_root)
        .into_iter()
        .filter_map(|entry| {
            let source_path = specs_root.join(&entry).join("spec.md");
            let content = read_optional_file(&source_path)?;
            Some(NormalizedChangeDeltaSpec {
                spec_id: entry,
                source_path: path_string(&source_path),
                content,
            })
        })
        .collect()
}

fn read_markdown_files(change_path: &Path) -> Vec<NormalizedChangeFile> {
    let mut files = Vec::new();
    collect_markdown_files(change_path, change_path, &mut files);
    files.sort_by(|a, b| a.path.cmp(&b.path));
    files
}

fn collect_markdown_files(root: &Path, current: &Path, files: &mut Vec<NormalizedChangeFile>) {
    let entries = match fs::read_dir(current) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }

        if path.is_dir() {
            collect_markdown_files(root, &path, files);
            continue;
        }

        if path.extension().and_then(|ext| ext.to_str()) != Some("md") {
            continue;
        }

        let Some(content) = read_optional_file(&path) else {
            continue;
        };
        files.push(NormalizedChangeFile {
            path: path
                .strip_prefix(root)
                .map(posix_path)
                .unwrap_or_else(|_| path_string(&path)),
            source_path: path_string(&path),
            content,
        });
    }
}

fn first_heading(text: &str) -> Option<String> {
    text.lines()
        .map(str::trim)
        .find_map(|line| line.strip_prefix("# ").map(str::trim).map(str::to_string))
        .filter(|value| !value.is_empty())
}

fn directory_entries(target: &Path) -> Vec<String> {
    let mut entries = fs::read_dir(target)
        .map(|entries| {
            entries
                .flatten()
                .filter(|entry| entry.path().is_dir())
                .filter_map(|entry| {
                    let name = entry.file_name().to_string_lossy().into_owned();
                    (!name.starts_with('.')).then_some(name)
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    entries.sort();
    entries
}

fn read_optional_file(target: &Path) -> Option<String> {
    fs::read_to_string(target).ok()
}

fn path_timestamps(target: &Path) -> (String, String) {
    let metadata = fs::metadata(target).ok();
    let created = metadata
        .as_ref()
        .and_then(|metadata| metadata.created().ok())
        .unwrap_or_else(SystemTime::now);
    let modified = metadata
        .and_then(|metadata| metadata.modified().ok())
        .unwrap_or_else(SystemTime::now);

    (format_system_time(created), format_system_time(modified))
}

fn format_system_time(time: SystemTime) -> String {
    OffsetDateTime::from(time)
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

fn earliest_timestamp<'a>(timestamps: impl Iterator<Item = &'a str>) -> String {
    timestamps
        .min()
        .unwrap_or("1970-01-01T00:00:00Z")
        .to_string()
}

fn latest_timestamp<'a>(timestamps: impl Iterator<Item = &'a str>) -> String {
    timestamps
        .max()
        .unwrap_or("1970-01-01T00:00:00Z")
        .to_string()
}

fn compare_scoped_changes(
    first: &ChangeWithRequirements,
    second: &ChangeWithRequirements,
) -> std::cmp::Ordering {
    let first_path = first.change.scope_path.as_deref().unwrap_or("");
    let second_path = second.change.scope_path.as_deref().unwrap_or("");
    match (first_path.is_empty(), second_path.is_empty()) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => first_path.cmp(second_path),
    }
}

fn slug(input: &str) -> String {
    let mut output = String::new();
    let mut previous_dash = false;

    for ch in input.to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            output.push(ch);
            previous_dash = false;
        } else if !previous_dash {
            output.push('-');
            previous_dash = true;
        }
    }

    output.trim_matches('-').to_string()
}

fn scoped_entity_id(scope: &SpecScope, id: &str) -> String {
    if scope.id == "root" {
        id.to_string()
    } else {
        format!("{}__{}", scope.id, id)
    }
}

fn path_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn posix_path(path: &Path) -> String {
    path.components()
        .filter_map(|component| component.as_os_str().to_str())
        .collect::<Vec<_>>()
        .join("/")
}
