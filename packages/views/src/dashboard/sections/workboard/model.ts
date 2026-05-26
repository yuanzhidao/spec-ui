import type {
  DashboardData,
  NormalizedChange,
  NormalizedChangeLifecycle,
  NormalizedSpec,
} from "@spec-ui/core/dashboard/types";

export type BoardMode = "board" | "list";
export type WorkboardSortMode = "createdAt" | "updatedAt" | "name";
export type WorkboardKind = "specs" | "changes";
export type WorkboardItem = NormalizedSpec | NormalizedChange;

export type WorkboardColumn = {
  project: DashboardData["projects"][number];
  items: WorkboardItem[];
};

export type WorkboardRow = {
  key: string;
  project: DashboardData["projects"][number];
  item: WorkboardItem;
};

export type ChangeWorkboardRow = WorkboardRow & {
  item: NormalizedChange;
};

export const changeLifecycles: NormalizedChangeLifecycle[] = ["active", "archived"];

export function projectWorkColumns(
  data: DashboardData,
  kind: WorkboardKind,
  query: string,
  sortMode: WorkboardSortMode,
): WorkboardColumn[] {
  const visibleProjects = data.project
    ? data.projects.filter((project) => project.project.path === data.project?.path)
    : data.projects;
  const normalizedQuery = query.trim().toLowerCase();

  return visibleProjects.flatMap((project) => {
    const items: WorkboardItem[] = kind === "specs" ? project.specs : project.changes;

    return [{
      project,
      items: sortWorkboardItems(filterWorkboardItems(items, normalizedQuery), sortMode),
    }];
  });
}

export function workboardRows(columns: WorkboardColumn[]): WorkboardRow[] {
  return columns.flatMap((column) =>
    column.items.map((item) => ({
      key: workboardItemKey(column.project, item),
      project: column.project,
      item,
    })),
  );
}

export function workboardItemKey(
  project: DashboardData["projects"][number],
  item: WorkboardItem,
): string {
  const lifecycle = "lifecycle" in item ? item.lifecycle : "spec";
  return `${project.project.path}:${lifecycle}:${item.id}`;
}

export function changeWorkboardRows(rows: WorkboardRow[]): ChangeWorkboardRow[] {
  return rows.filter((row): row is ChangeWorkboardRow => "lifecycle" in row.item);
}

function filterWorkboardItems(
  items: WorkboardItem[],
  normalizedQuery: string,
): WorkboardItem[] {
  return normalizedQuery
    ? items.filter((item) => workboardItemMatches(item, normalizedQuery))
    : items;
}

function sortWorkboardItems(
  items: WorkboardItem[],
  sortMode: WorkboardSortMode,
): WorkboardItem[] {
  return [...items].sort((first, second) => {
    if (sortMode === "name") {
      return first.title.localeCompare(second.title, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }

    const field = sortMode === "updatedAt" ? "updatedAt" : "createdAt";
    return Date.parse(second[field]) - Date.parse(first[field]);
  });
}

function workboardItemMatches(item: WorkboardItem, query: string) {
  return [
    item.id,
    item.title,
    item.projectName,
    item.scopeLabel,
    "lifecycle" in item ? item.lifecycle : undefined,
    "displayId" in item ? item.displayId : undefined,
    "sourcePath" in item ? item.sourcePath : undefined,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}
