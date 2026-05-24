import type {
  DashboardProject,
  NormalizedChange,
  NormalizedCheckoutSource,
  NormalizedRequirement,
  NormalizedScopedChange,
  NormalizedSpec,
  ProjectBinding,
  ProjectCheckout,
  ProjectEvent,
  RuntimeIssue,
  SpecScope,
  ValidationResult,
} from "@/lib/dashboard-types";
import { openSpecAdapter } from "./openspec";

export async function projectDashboardData(
  binding: ProjectBinding,
  validation: ValidationResult,
  activity: ProjectEvent[],
): Promise<Omit<DashboardProject, "realtime">> {
  const checkouts = binding.checkouts.length > 0
    ? binding.checkouts
    : [fallbackPrimaryCheckout(binding)];
  const checkoutData = await Promise.all(
    checkouts.map((checkout) => checkoutProjectData(binding, checkout, validation, activity)),
  );
  const issues = checkoutData.flatMap((data) => data.issue ? [data.issue] : []);
  const scopes = aggregateCheckoutScopes(checkouts);
  const specs = checkoutData.flatMap((data) => data.specs);
  const changes = mergeCheckoutChanges(checkoutData.flatMap((data) => data.changes));
  const requirements = checkoutData.flatMap((data) => data.requirements);

  return {
    project: binding,
    issue: issues[0],
    validation,
    checkouts,
    scopes,
    specs,
    changes,
    requirements,
    activity,
  };
}

async function checkoutProjectData(
  project: ProjectBinding,
  checkout: ProjectCheckout,
  validation: ValidationResult,
  activity: ProjectEvent[],
): Promise<Omit<DashboardProject, "realtime">> {
  const binding = checkoutBinding(project, checkout);

  if (checkout.dialect === "openspec") {
    try {
      return withProjectIdentity(
        await openSpecAdapter.projectData(binding, {
          validation,
          activity: activity.filter((event) => !event.checkoutId || event.checkoutId === checkout.id),
        }),
        project,
        checkout,
      );
    } catch (error) {
      return {
        ...emptyProjectData(binding, validation, []),
        project,
        issue: adapterIssue(error),
      };
    }
  }

  return {
    ...emptyProjectData(binding, validation, activity),
    project,
    issue:
      checkout.dialect === "none"
        ? {
            code: "unsupported-dialect",
            message: "No supported spec dialect was detected.",
            detail: "This directory is bound and ready for a future adapter.",
          }
        : {
            code: "unsupported-dialect",
            message: "The detected spec dialect is not supported yet.",
            detail: checkout.dialect,
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
    checkouts: project.checkouts,
    scopes: project.discovery.scopes,
    specs: [],
    changes: [],
    requirements: [],
    activity,
  };
}

function withProjectIdentity(
  data: Omit<DashboardProject, "realtime">,
  project: ProjectBinding,
  checkout: ProjectCheckout,
): Omit<DashboardProject, "realtime"> {
  return {
    ...data,
    project,
    checkouts: project.checkouts,
    scopes: data.scopes.map((scope) => tagScope(scope, checkout)),
    specs: data.specs.map((spec) => tagSpec(spec, project, checkout)),
    changes: data.changes.map((change) => tagChange(change, project, checkout)),
    requirements: data.requirements.map((requirement) =>
      tagRequirement(requirement, project, checkout),
    ),
  };
}

function tagSpec(
  spec: NormalizedSpec,
  project: ProjectBinding,
  checkout: ProjectCheckout,
): NormalizedSpec {
  return {
    ...spec,
    id: checkoutEntityId(checkout, spec.id),
    dialect: checkout.dialect,
    projectId: project.id,
    projectPath: project.path,
    projectName: project.name,
    checkoutId: checkout.id,
    checkoutKind: checkout.kind,
    checkoutPath: checkout.path,
    checkoutLabel: checkout.label,
    checkoutBranch: checkout.branch,
  };
}

function tagChange(
  change: NormalizedChange,
  project: ProjectBinding,
  checkout: ProjectCheckout,
): NormalizedChange {
  return {
    ...change,
    dialect: checkout.dialect,
    projectId: project.id,
    projectPath: project.path,
    projectName: project.name,
    scopeId: checkoutScopeId(checkout, change.scopeId),
    scopeLabel: checkoutScopeLabel(checkout, change.scopeLabel),
    checkoutId: checkout.id,
    checkoutKind: checkout.kind,
    checkoutPath: checkout.path,
    checkoutLabel: checkout.label,
    checkoutBranch: checkout.branch,
    checkoutSources: [checkoutSource(checkout, change.updatedAt)],
    scopedChanges: change.scopedChanges?.map((scopedChange) =>
      tagScopedChange(scopedChange, checkout),
    ),
  };
}

function tagRequirement(
  requirement: NormalizedRequirement,
  project: ProjectBinding,
  checkout: ProjectCheckout,
): NormalizedRequirement {
  return {
    ...requirement,
    dialect: checkout.dialect,
    projectId: project.id,
    projectPath: project.path,
    projectName: project.name,
    scopeId: checkoutScopeId(checkout, requirement.scopeId),
    scopeLabel: checkoutScopeLabel(checkout, requirement.scopeLabel),
    checkoutId: checkout.id,
    checkoutKind: checkout.kind,
    checkoutPath: checkout.path,
    checkoutLabel: checkout.label,
    checkoutBranch: checkout.branch,
  };
}

function tagScopedChange(
  change: NormalizedScopedChange,
  checkout: ProjectCheckout,
): NormalizedScopedChange {
  return {
    ...change,
    dialect: checkout.dialect,
    scopeId: checkoutScopeId(checkout, change.scopeId) || change.scopeId,
    scopeLabel: checkoutScopeLabel(checkout, change.scopeLabel) || change.scopeLabel,
    checkoutId: checkout.id,
    checkoutKind: checkout.kind,
    checkoutPath: checkout.path,
    checkoutLabel: checkout.label,
    checkoutBranch: checkout.branch,
  };
}

function tagScope(scope: SpecScope, checkout: ProjectCheckout): SpecScope {
  return {
    ...scope,
    id: checkoutScopeId(checkout, scope.id) || scope.id,
    label: checkoutScopeLabel(checkout, scope.label) || scope.label,
  };
}

function aggregateCheckoutScopes(checkouts: ProjectCheckout[]): SpecScope[] {
  const scopes = checkouts
    .filter((checkout) => checkout.dialect === "openspec")
    .flatMap((checkout) => checkout.discovery.scopes.map((scope) => tagScope(scope, checkout)));
  return Array.from(new Map(scopes.map((scope) => [scope.id, scope])).values());
}

function mergeCheckoutChanges(changes: NormalizedChange[]): NormalizedChange[] {
  const groups = new Map<string, NormalizedChange[]>();
  for (const change of changes) {
    const key = `${change.lifecycle}:${change.id}`;
    groups.set(key, [...(groups.get(key) || []), change]);
  }

  return Array.from(groups.values()).map((group) => {
    const sorted = [...group].sort(compareChangesByUpdatedAt);
    const primary = sorted[0];
    return {
      ...primary,
      checkoutSources: sorted.map((change) =>
        checkoutSourceFromChange(change, change.updatedAt),
      ),
    };
  });
}

function compareChangesByUpdatedAt(first: NormalizedChange, second: NormalizedChange): number {
  const byUpdatedAt = Date.parse(second.updatedAt) - Date.parse(first.updatedAt);
  if (byUpdatedAt !== 0) {
    return byUpdatedAt;
  }
  if (first.checkoutKind === "worktree" && second.checkoutKind !== "worktree") {
    return -1;
  }
  if (second.checkoutKind === "worktree" && first.checkoutKind !== "worktree") {
    return 1;
  }
  return 0;
}

function checkoutBinding(project: ProjectBinding, checkout: ProjectCheckout): ProjectBinding {
  return {
    ...project,
    path: checkout.path,
    dialect: checkout.dialect,
    discovery: checkout.discovery,
    checkouts: [checkout],
  };
}

function fallbackPrimaryCheckout(project: ProjectBinding): ProjectCheckout {
  return {
    id: "primary",
    kind: "primary",
    source: "primary",
    path: project.path,
    label: project.name,
    dialect: project.dialect,
    discovery: project.discovery,
  };
}

function checkoutEntityId(checkout: ProjectCheckout, entityId: string): string {
  return checkout.kind === "primary" ? entityId : `${checkout.id}__${entityId}`;
}

function checkoutScopeId(
  checkout: ProjectCheckout,
  scopeId: string | undefined,
): string | undefined {
  if (!scopeId || checkout.kind === "primary") {
    return scopeId;
  }
  return `${checkout.id}__${scopeId}`;
}

function checkoutScopeLabel(
  checkout: ProjectCheckout,
  scopeLabel: string | undefined,
): string | undefined {
  if (!scopeLabel || checkout.kind === "primary") {
    return scopeLabel;
  }
  return `${checkout.label} / ${scopeLabel}`;
}

function checkoutSource(
  checkout: ProjectCheckout,
  updatedAt?: string,
): NormalizedCheckoutSource {
  return {
    checkoutId: checkout.id,
    checkoutKind: checkout.kind,
    checkoutPath: checkout.path,
    checkoutLabel: checkout.label,
    checkoutBranch: checkout.branch,
    updatedAt,
  };
}

function checkoutSourceFromChange(
  change: NormalizedChange,
  updatedAt?: string,
): NormalizedCheckoutSource {
  return {
    checkoutId: change.checkoutId || "primary",
    checkoutKind: change.checkoutKind || "primary",
    checkoutPath: change.checkoutPath || change.projectPath || "",
    checkoutLabel: change.checkoutLabel || change.projectName || "primary",
    checkoutBranch: change.checkoutBranch,
    updatedAt,
  };
}

function adapterIssue(error: unknown): RuntimeIssue {
  return {
    code: "adapter-error",
    message: "The active adapter could not project project data.",
    detail: error instanceof Error ? error.message : String(error),
  };
}
