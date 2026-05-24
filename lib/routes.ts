import type { NormalizedChangeLifecycle } from "@/lib/dashboard-types";

export const dashboardSectionIds = [
  "specs",
  "changes",
  "projects",
  "activity",
  "validation",
  "settings",
] as const;

export type DashboardSection = (typeof dashboardSectionIds)[number];

const sectionSet = new Set<string>(dashboardSectionIds);
const encode = (value: string) => encodeURIComponent(value);

export function isDashboardSection(value: string): value is DashboardSection {
  return sectionSet.has(value);
}

export function sectionFromPathname(pathname: string): DashboardSection {
  const firstSegment = pathname.split("/").filter(Boolean)[0] || "specs";
  return isDashboardSection(firstSegment) ? firstSegment : "specs";
}

export function normalizeChangeLifecycle(
  value: string | string[] | undefined,
): NormalizedChangeLifecycle {
  const lifecycle = Array.isArray(value) ? value[0] : value;
  return lifecycle === "archived" ? "archived" : "active";
}

export const paths = {
  root: () => "/",
  section: (section: DashboardSection) => `/${section}`,
  specs: () => "/specs",
  specDetail: (projectId: string, specId: string) =>
    `/specs/${encode(projectId)}/${encode(specId)}`,
  changes: () => "/changes",
  changeDetail: (
    projectId: string,
    changeId: string,
    lifecycle: NormalizedChangeLifecycle = "active",
  ) => {
    const base = `/changes/${encode(projectId)}/${encode(changeId)}`;
    return lifecycle === "active" ? base : `${base}?lifecycle=${encode(lifecycle)}`;
  },
  projects: () => "/projects",
  activity: () => "/activity",
  validation: () => "/validation",
  settings: (tab?: SettingsTab) =>
    tab ? `/settings?tab=${encode(tab)}` : "/settings",
};

export const settingsTabs = [
  "preferences",
  "validation",
  "system",
] as const;

export type SettingsTab = (typeof settingsTabs)[number];

const settingsTabSet = new Set<string>(settingsTabs);

export function isSettingsTab(value: string): value is SettingsTab {
  return settingsTabSet.has(value);
}
