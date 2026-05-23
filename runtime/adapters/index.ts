import type {
  DashboardProject,
  NormalizedChange,
  NormalizedRequirement,
  NormalizedSpec,
  ProjectBinding,
  ProjectEvent,
  RuntimeIssue,
  ValidationResult,
} from "@/lib/dashboard-types";
import { openSpecAdapter } from "./openspec";

export async function projectDashboardData(
  binding: ProjectBinding,
  validation: ValidationResult,
  activity: ProjectEvent[],
): Promise<Omit<DashboardProject, "realtime">> {
  if (binding.dialect === "openspec") {
    try {
      return withProjectIdentity(
        await openSpecAdapter.projectData(binding, { validation, activity }),
      );
    } catch (error) {
      return {
        ...emptyProjectData(binding, validation, activity),
        project: binding,
        issue: adapterIssue(error),
      };
    }
  }

  return {
    ...emptyProjectData(binding, validation, activity),
    project: binding,
    issue:
      binding.dialect === "none"
        ? {
            code: "unsupported-dialect",
            message: "No supported spec dialect was detected.",
            detail: "This directory is bound and ready for a future adapter.",
          }
        : {
            code: "unsupported-dialect",
            message: "The detected spec dialect is not supported yet.",
            detail: binding.dialect,
          },
  };
}

function emptyProjectData(
  project: ProjectBinding,
  validation: ValidationResult,
  activity: ProjectEvent[],
): Omit<DashboardProject, "realtime"> {
  return {
    project,
    validation,
    scopes: project.discovery.scopes,
    specs: [],
    changes: [],
    requirements: [],
    activity,
  };
}

function withProjectIdentity(
  data: Omit<DashboardProject, "realtime">,
): Omit<DashboardProject, "realtime"> {
  return {
    ...data,
    specs: data.specs.map((spec) => tagSpec(spec, data.project)),
    changes: data.changes.map((change) => tagChange(change, data.project)),
    requirements: data.requirements.map((requirement) =>
      tagRequirement(requirement, data.project),
    ),
  };
}

function tagSpec(spec: NormalizedSpec, project: ProjectBinding): NormalizedSpec {
  return {
    ...spec,
    projectId: project.id,
    projectPath: project.path,
    projectName: project.name,
  };
}

function tagChange(change: NormalizedChange, project: ProjectBinding): NormalizedChange {
  return {
    ...change,
    projectId: project.id,
    projectPath: project.path,
    projectName: project.name,
  };
}

function tagRequirement(
  requirement: NormalizedRequirement,
  project: ProjectBinding,
): NormalizedRequirement {
  return {
    ...requirement,
    projectId: project.id,
    projectPath: project.path,
    projectName: project.name,
  };
}

function adapterIssue(error: unknown): RuntimeIssue {
  return {
    code: "adapter-error",
    message: "The active adapter could not project project data.",
    detail: error instanceof Error ? error.message : String(error),
  };
}
