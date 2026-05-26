use std::{collections::HashMap, path::Path, process::Command};

use crate::runtime::types::{not_run_validation, ProjectBinding, SpecScope, ValidationResult};

use super::{now_iso, projection::fallback_primary_checkout};

pub(super) fn run_project_validation(binding: &ProjectBinding) -> ValidationResult {
    let targets = validation_targets_for_project(binding);
    let started_at = now_iso();
    if targets.is_empty() {
        return ValidationResult {
            status: "failing".to_string(),
            started_at: Some(started_at.clone()),
            ended_at: Some(now_iso()),
            message: Some(
                "Validation is only implemented for OpenSpec projects in the MVP.".to_string(),
            ),
            ..not_run_validation()
        };
    }

    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    let mut failing_exit_code = None;
    let mut message = None;

    for target in &targets {
        let result = run_openspec_validation(&target.cwd);
        if !result.stdout.trim().is_empty() {
            stdout.push(format!("[{}]\n{}", target.label, result.stdout.trim()));
        }
        if !result.stderr.trim().is_empty() {
            stderr.push(format!("[{}]\n{}", target.label, result.stderr.trim()));
        }
        if result.exit_code != Some(0) && failing_exit_code.is_none() {
            failing_exit_code = result.exit_code;
        }
        if message.is_none() {
            message = result.message;
        }
    }

    ValidationResult {
        status: if failing_exit_code.is_some() {
            "failing"
        } else {
            "passing"
        }
        .to_string(),
        command: Some(if targets.len() > 1 {
            format!("openspec validate --all ({} targets)", targets.len())
        } else {
            "openspec validate --all".to_string()
        }),
        stdout: Some(stdout.join("\n")).filter(|value| !value.is_empty()),
        stderr: Some(stderr.join("\n")).filter(|value| !value.is_empty()),
        exit_code: Some(failing_exit_code.unwrap_or(0)),
        started_at: Some(started_at),
        ended_at: Some(now_iso()),
        message,
    }
}

struct ValidationTarget {
    label: String,
    cwd: String,
}

fn validation_targets_for_project(binding: &ProjectBinding) -> Vec<ValidationTarget> {
    let checkouts = if binding.checkouts.is_empty() {
        vec![fallback_primary_checkout(binding)]
    } else {
        binding.checkouts.clone()
    };
    let openspec_checkouts = checkouts
        .into_iter()
        .filter(|checkout| checkout.dialect == "openspec")
        .collect::<Vec<_>>();
    let multiple_checkouts = openspec_checkouts.len() > 1;

    openspec_checkouts
        .iter()
        .flat_map(|checkout| {
            let scopes = if checkout.discovery.scopes.is_empty() {
                vec![SpecScope {
                    id: "root".to_string(),
                    label: "root".to_string(),
                    path: String::new(),
                }]
            } else {
                checkout.discovery.scopes.clone()
            };
            let multiple_scopes = scopes.len() > 1;
            scopes.into_iter().map(move |scope| ValidationTarget {
                label: validation_target_label(
                    &checkout.label,
                    &scope,
                    multiple_checkouts,
                    multiple_scopes,
                ),
                cwd: if scope.path.is_empty() {
                    checkout.path.clone()
                } else {
                    Path::new(&checkout.path)
                        .join(&scope.path)
                        .to_string_lossy()
                        .into_owned()
                },
            })
        })
        .collect()
}

fn validation_target_label(
    checkout_label: &str,
    scope: &SpecScope,
    multiple_checkouts: bool,
    multiple_scopes: bool,
) -> String {
    if multiple_checkouts && multiple_scopes {
        format!("{checkout_label} / {}", scope.label)
    } else if multiple_checkouts {
        checkout_label.to_string()
    } else {
        scope.label.clone()
    }
}

struct ValidationCommandResult {
    stdout: String,
    stderr: String,
    exit_code: Option<i32>,
    message: Option<String>,
}

fn run_openspec_validation(cwd: &str) -> ValidationCommandResult {
    match Command::new("openspec")
        .args(["validate", "--all"])
        .current_dir(cwd)
        .output()
    {
        Ok(output) => ValidationCommandResult {
            stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
            exit_code: output.status.code(),
            message: None,
        },
        Err(error) => ValidationCommandResult {
            stdout: String::new(),
            stderr: String::new(),
            exit_code: None,
            message: Some(error.to_string()),
        },
    }
}

pub(super) fn mark_validations_stale(validations: &mut HashMap<String, ValidationResult>) {
    for validation in validations.values_mut() {
        if matches!(validation.status.as_str(), "passing" | "failing") {
            validation.status = "stale".to_string();
        }
    }
}
