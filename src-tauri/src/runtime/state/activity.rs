use std::collections::HashMap;

use crate::runtime::types::ProjectEvent;

use super::{
    fingerprint::{FingerprintEvent, ProjectFingerprint},
    now_iso,
};

const PROJECT_ACTIVITY_LIMIT: usize = 50;

pub(super) fn fingerprint_activity_events(
    previous: &ProjectFingerprint,
    next: &ProjectFingerprint,
) -> Vec<(String, ProjectEvent)> {
    let timestamp = now_iso();
    let mut events = Vec::new();

    for (key, next_entry) in next {
        match previous.get(key) {
            None => {
                if let Some(event) =
                    project_event_from_fingerprint(next_entry.event.as_ref(), "create", &timestamp)
                {
                    events.push(event);
                }
            }
            Some(previous_entry) if previous_entry.modified != next_entry.modified => {
                if let Some(event) =
                    project_event_from_fingerprint(next_entry.event.as_ref(), "update", &timestamp)
                {
                    events.push(event);
                }
            }
            Some(_) => {}
        }
    }

    for (key, previous_entry) in previous {
        if next.contains_key(key) {
            continue;
        }
        if let Some(event) =
            project_event_from_fingerprint(previous_entry.event.as_ref(), "delete", &timestamp)
        {
            events.push(event);
        }
    }

    events.sort_by(|first, second| first.1.file_path.cmp(&second.1.file_path));
    events
}

fn project_event_from_fingerprint(
    event: Option<&FingerprintEvent>,
    event_type: &str,
    timestamp: &str,
) -> Option<(String, ProjectEvent)> {
    event.map(|event| {
        (
            event.project_id.clone(),
            ProjectEvent {
                project_path: event.project_path.clone(),
                dialect: event.dialect.clone(),
                event_type: event_type.to_string(),
                file_path: event.file_path.clone(),
                timestamp: timestamp.to_string(),
                checkout_id: Some(event.checkout_id.clone()),
                checkout_kind: Some(event.checkout_kind.clone()),
                checkout_path: Some(event.checkout_path.clone()),
                checkout_label: Some(event.checkout_label.clone()),
                checkout_branch: event.checkout_branch.clone(),
                entity_id: event.entity_id.clone(),
                scope_id: event.scope_id.clone(),
                scope_label: event.scope_label.clone(),
                scope_path: event.scope_path.clone(),
            },
        )
    })
}

pub(super) fn record_activity_events(
    activity: &mut HashMap<String, Vec<ProjectEvent>>,
    mut events: Vec<(String, ProjectEvent)>,
) {
    events.reverse();
    for (project_id, event) in events {
        let project_activity = activity.entry(project_id).or_default();
        project_activity.insert(0, event);
        project_activity.truncate(PROJECT_ACTIVITY_LIMIT);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runtime::state::fingerprint::FingerprintEntry;

    #[test]
    fn fingerprint_activity_events_include_worktree_metadata() {
        let mut previous = ProjectFingerprint::new();
        let mut next = ProjectFingerprint::new();
        let event = test_fingerprint_event();
        let key = "project-1:/worktree/openspec/changes/demo/tasks.md".to_string();

        previous.insert(
            key.clone(),
            FingerprintEntry {
                modified: 1,
                event: Some(event.clone()),
            },
        );
        next.insert(
            key,
            FingerprintEntry {
                modified: 2,
                event: Some(event),
            },
        );

        let events = fingerprint_activity_events(&previous, &next);

        assert_eq!(events.len(), 1);
        assert_eq!(events[0].0, "project-1");
        assert_eq!(events[0].1.event_type, "update");
        assert_eq!(events[0].1.checkout_kind.as_deref(), Some("worktree"));
        assert_eq!(events[0].1.checkout_label.as_deref(), Some("feature-x"));
        assert_eq!(events[0].1.scope_label.as_deref(), Some("web"));
    }

    #[test]
    fn fingerprint_activity_events_ignore_directory_markers() {
        let previous = ProjectFingerprint::new();
        let mut next = ProjectFingerprint::new();
        next.insert(
            "project-1:worktree-entry:/worktrees/feature-x".to_string(),
            FingerprintEntry {
                modified: 1,
                event: None,
            },
        );

        let events = fingerprint_activity_events(&previous, &next);

        assert!(events.is_empty());
    }

    fn test_fingerprint_event() -> FingerprintEvent {
        FingerprintEvent {
            project_id: "project-1".to_string(),
            project_path: "/worktree".to_string(),
            dialect: "openspec".to_string(),
            file_path: "/worktree/openspec/changes/demo/tasks.md".to_string(),
            checkout_id: "checkout-1".to_string(),
            checkout_kind: "worktree".to_string(),
            checkout_path: "/worktree".to_string(),
            checkout_label: "feature-x".to_string(),
            checkout_branch: Some("feature-x".to_string()),
            entity_id: Some("demo".to_string()),
            scope_id: Some("checkout-1__web".to_string()),
            scope_label: Some("web".to_string()),
            scope_path: Some("web".to_string()),
        }
    }
}
