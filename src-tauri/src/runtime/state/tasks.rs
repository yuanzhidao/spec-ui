use std::{fs, path::Path};

use crate::{
    runtime::project::{
        discover_project, discover_worktree_checkouts, primary_checkout_from_binding,
        ProjectDiscoveryResult,
    },
    runtime::types::{runtime_issue, RuntimeIssue, RuntimeProjectSetting, RuntimeSettings},
};

pub(super) fn validate_task_source_path(
    settings: &RuntimeSettings,
    source_path: &str,
) -> Result<(), RuntimeIssue> {
    let source = fs::canonicalize(source_path).map_err(|error| {
        runtime_issue(
            "missing-path",
            "The task file could not be read.",
            Some(error.to_string()),
        )
    })?;

    if !is_openspec_tasks_file(&source) {
        return Err(runtime_issue(
            "runtime-error",
            "Only OpenSpec tasks.md files can be updated.",
            Some(source_path.to_string()),
        ));
    }

    for setting in &settings.projects {
        for checkout_path in checkout_paths_for_setting(setting) {
            let Ok(root) = fs::canonicalize(&checkout_path) else {
                continue;
            };
            if source.starts_with(root) {
                return Ok(());
            }
        }
    }

    Err(runtime_issue(
        "runtime-error",
        "The task file does not belong to an added project checkout.",
        Some(source_path.to_string()),
    ))
}

fn checkout_paths_for_setting(setting: &RuntimeProjectSetting) -> Vec<String> {
    match discover_project(&setting.path) {
        ProjectDiscoveryResult::Ok { binding, .. } => {
            let primary = primary_checkout_from_binding(&binding);
            let (worktrees, _) = discover_worktree_checkouts(setting, &binding);
            [vec![primary], worktrees]
                .concat()
                .into_iter()
                .map(|checkout| checkout.path)
                .collect()
        }
        ProjectDiscoveryResult::Err(_) => vec![setting.path.clone()],
    }
}

pub(super) fn write_task_completion(
    source_path: &str,
    line_number: usize,
    completed: bool,
) -> Result<(), RuntimeIssue> {
    if line_number == 0 {
        return Err(runtime_issue(
            "runtime-error",
            "Task line number must be a positive integer.",
            Some(line_number.to_string()),
        ));
    }

    let content = fs::read_to_string(source_path).map_err(|error| {
        runtime_issue(
            "missing-path",
            "The task file could not be read.",
            Some(error.to_string()),
        )
    })?;
    let newline = if content.contains("\r\n") {
        "\r\n"
    } else {
        "\n"
    };
    let mut lines = content
        .split('\n')
        .map(|line| line.strip_suffix('\r').unwrap_or(line).to_string())
        .collect::<Vec<_>>();
    let Some(line) = lines.get_mut(line_number - 1) else {
        return Err(runtime_issue(
            "runtime-error",
            "The selected task no longer exists in tasks.md.",
            Some(format!("{source_path}:{line_number}")),
        ));
    };
    let Some(next_line) = set_task_line_completion(line, completed) else {
        return Err(runtime_issue(
            "runtime-error",
            "The selected line is no longer a markdown task.",
            Some(format!("{source_path}:{line_number}")),
        ));
    };

    *line = next_line;
    fs::write(source_path, lines.join(newline)).map_err(|error| {
        runtime_issue(
            "runtime-error",
            "The task file could not be updated.",
            Some(error.to_string()),
        )
    })
}

fn set_task_line_completion(line: &str, completed: bool) -> Option<String> {
    let checkbox_index = line.find('[')?;
    let before = &line[..checkbox_index];
    let trimmed_before = before.trim_start();
    if trimmed_before != "- " && trimmed_before != "* " {
        return None;
    }

    let suffix = line.get(checkbox_index..)?;
    if !(suffix.starts_with("[ ]") || suffix.starts_with("[x]") || suffix.starts_with("[X]")) {
        return None;
    }
    if suffix.get(3..)?.trim().is_empty() {
        return None;
    }

    let mut next = line.to_string();
    next.replace_range(
        checkbox_index + 1..checkbox_index + 2,
        if completed { "x" } else { " " },
    );
    Some(next)
}

fn is_openspec_tasks_file(source_path: &Path) -> bool {
    if source_path.file_name().and_then(|name| name.to_str()) != Some("tasks.md") {
        return false;
    }

    let parts = source_path
        .components()
        .map(|component| component.as_os_str().to_string_lossy().to_string())
        .collect::<Vec<_>>();
    parts
        .windows(2)
        .any(|pair| pair[0] == "openspec" && pair[1] == "changes")
}
