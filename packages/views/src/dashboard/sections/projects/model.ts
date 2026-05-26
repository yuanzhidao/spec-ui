import type { DashboardData } from "@spec-ui/core/dashboard/types";

export type BoardMode = "board" | "list";
export type ProjectItem = DashboardData["projects"][number];

export function filterProjects(projects: ProjectItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return normalizedQuery
    ? projects.filter((project) =>
        [project.project.name, project.project.path, project.project.dialect]
          .some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
    : projects;
}

export function projectChangeProgress(project: ProjectItem) {
  const activeChanges = projectActiveChanges(project);
  const total = activeChanges.length;
  const completed = activeChanges.filter(
    (change) =>
      change.taskSummary.total > 0 &&
      change.taskSummary.completed >= change.taskSummary.total,
  ).length;

  return {
    total,
    completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function projectActiveChanges(project: ProjectItem) {
  return project.changes.filter((change) => change.lifecycle === "active");
}
