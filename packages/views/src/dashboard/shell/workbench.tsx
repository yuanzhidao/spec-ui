"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import type {
  DashboardData,
  LanguageMode,
  NormalizedChangeLifecycle,
  ThemeMode,
} from "@spec-ui/core/dashboard/types";
import {
  useRuntimeDashboard,
  type RuntimeDashboardValue,
} from "@spec-ui/core/runtime/dashboard-context";
import { useNavigation } from "@spec-ui/core/navigation/provider";
import { paths, sectionFromPathname, type DashboardSection } from "@spec-ui/core/navigation/routes";
import { TooltipProvider } from "@spec-ui/ui/tooltip";
import { I18nProvider } from "@spec-ui/views/providers/i18n-provider";
import { AppSidebar } from "../sidebar/app-sidebar";
import { DashboardLayout } from "./layout";
import { DashboardContentLoading } from "./loading-state";
import { PageHeader } from "./page-header";
import { RealtimeStatus } from "../status/status-indicators";
import { RouteSurfaceTransition } from "./route-surface-transition";
import { SearchCommand } from "../search/search-command";
import { SectionContent } from "./section-content";
import { sections } from "../sidebar/navigation";

export function DashboardWorkbench({
  initialSection = "specs",
  specDetail,
  changeDetail,
}: {
  initialSection?: DashboardSection;
  specDetail?: {
    projectId: string;
    specId: string;
  };
  changeDetail?: {
    projectId: string;
    changeId: string;
    lifecycle: NormalizedChangeLifecycle;
  };
}) {
  const runtime = useRuntimeDashboard();
  const { setTheme, theme } = useTheme();
  const pendingThemeRef = useRef<ThemeMode | null>(null);

  const snapshot = runtime.snapshot;
  const locale = snapshot?.settings.language || "en";

  useEffect(() => {
    const snapshotTheme = snapshot?.settings.themeMode;
    if (!snapshotTheme) {
      return;
    }

    if (pendingThemeRef.current) {
      if (pendingThemeRef.current === snapshotTheme) {
        pendingThemeRef.current = null;
      }
      return;
    }

    if (theme !== snapshotTheme) {
      setTheme(snapshotTheme);
    }
  }, [setTheme, snapshot?.settings.themeMode, theme]);

  const handleThemeChange = useCallback(
    (mode: ThemeMode) => {
      pendingThemeRef.current = mode;
      setTheme(mode);
      void runtime.setTheme(mode);
    },
    [runtime, setTheme],
  );

  return (
    <I18nProvider locale={locale}>
      <DashboardWorkbenchContent
        initialSection={initialSection}
        runtime={runtime}
        specDetail={specDetail}
        changeDetail={changeDetail}
        onThemeChange={handleThemeChange}
      />
    </I18nProvider>
  );
}

function DashboardWorkbenchContent({
  initialSection,
  runtime,
  specDetail,
  changeDetail,
  onThemeChange,
}: {
  initialSection: DashboardSection;
  runtime: RuntimeDashboardValue;
  specDetail?: {
    projectId: string;
    specId: string;
  };
  changeDetail?: {
    projectId: string;
    changeId: string;
    lifecycle: NormalizedChangeLifecycle;
  };
  onThemeChange: (mode: ThemeMode) => void;
}) {
  const navigation = useNavigation();
  const tHeader = useTranslations("header");
  const tSections = useTranslations("navigation.sections");
  const tWorkboard = useTranslations("workboard");
  const [searchOpen, setSearchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const snapshot = runtime.snapshot;
  const loading = !snapshot && !runtime.error;
  const data = snapshot?.dashboard || emptyData();
  const section = sectionFromPathname(navigation.pathname) || initialSection;
  const routeSurfaceKey =
    section === "settings"
      ? navigation.pathname
      : `${navigation.pathname}?${navigation.searchParams.toString()}`;
  const current = sections.find((item) => item.id === section);
  const detailHeader = buildDetailHeader(
    data,
    {
      changes: tSections("changes"),
      specs: tSections("specs"),
      project: tHeader("projectFallback"),
    },
    {
      requirementsShort: (count: number) => tWorkboard("requirementsShort", { count }),
      scopes: (count: number) => tWorkboard("badges.scopes", { count }),
    },
    specDetail,
    changeDetail,
  );

  async function runBusy(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const sidebarProps = {
    snapshot,
    data,
    section,
    loading,
    onFocusProject: (path: string | null) => runBusy(() => runtime.focusProject(path)),
    onOpenSearch: () => setSearchOpen(true),
    onRunValidation: () => void runtime.runValidation(),
  };

  return (
    <TooltipProvider>
      <DashboardLayout
        sidebar={<AppSidebar {...sidebarProps} />}
        header={
          <PageHeader
            section={current?.id || "specs"}
            description={
              loading
                ? undefined
                : data.focusedProjectPath ||
                  data.project?.path ||
                  (data.projects.length > 0 ? tHeader("allProjects") : tHeader("addProjects"))
            }
            project={data.project}
            {...detailHeader}
            actions={
              <RealtimeStatus
                connection={runtime.connection}
                watcher={data.realtime.watcher}
              />
            }
          />
        }
      >
        <RouteSurfaceTransition routeKey={routeSurfaceKey}>
          <RuntimeError
            message={runtime.error?.message}
            detail={runtime.error?.detail}
          />
          {loading ? (
            <DashboardContentLoading />
          ) : (
            <SectionContent
              section={section}
              specDetail={specDetail}
              changeDetail={changeDetail}
              data={data}
              settings={snapshot?.settings}
              busy={busy}
              onAddProject={(path: string) => runBusy(() => runtime.addProject(path))}
              onFocusProject={(path: string | null) => runBusy(() => runtime.focusProject(path))}
              onRemoveProject={(path: string) => runBusy(() => runtime.removeProject(path))}
              onRelocateProject={(projectId: string, path: string) =>
                runBusy(() => runtime.relocateProject(projectId, path))
              }
              onUpdateProjectWorkspaceDirectory={(projectId: string, path: string | null) =>
                runBusy(() => runtime.updateProjectWorkspaceDirectory(projectId, path))
              }
              onUpdateProjectWorktreesDirectory={(projectId: string, path: string | null) =>
                runBusy(() => runtime.updateProjectWorktreesDirectory(projectId, path))
              }
              onAddProjectWorktreePath={(projectId: string, path: string) =>
                runBusy(() => runtime.addProjectWorktreePath(projectId, path))
              }
              onRemoveProjectWorktreePath={(projectId: string, path: string) =>
                runBusy(() => runtime.removeProjectWorktreePath(projectId, path))
              }
              onToggleTask={(sourcePath: string, lineNumber: number, completed: boolean) =>
                runtime.setChangeTaskCompleted({ sourcePath, lineNumber, completed })
              }
              onRunValidation={() => void runtime.runValidation()}
              onThemeChange={onThemeChange}
              onLanguageChange={(language: LanguageMode) => void runtime.setLanguage(language)}
            />
          )}
        </RouteSurfaceTransition>
      </DashboardLayout>
      <SearchCommand
        open={searchOpen}
        onOpenChange={setSearchOpen}
        data={data}
        onRunValidation={() => void runtime.runValidation()}
        onFocusProject={(path) => void runtime.focusProject(path)}
      />
    </TooltipProvider>
  );
}

function buildDetailHeader(
  data: DashboardData,
  labels: {
    changes: string;
    specs: string;
    project: string;
  },
  format: {
    requirementsShort: (count: number) => string;
    scopes: (count: number) => string;
  },
  specDetail?: {
    projectId: string;
    specId: string;
  },
  changeDetail?: {
    projectId: string;
    changeId: string;
    lifecycle: NormalizedChangeLifecycle;
  },
): Partial<React.ComponentProps<typeof PageHeader>> | undefined {
  if (changeDetail) {
    const project = data.projects.find((item) => item.project.id === changeDetail.projectId);
    const change = project?.changes.find(
      (item) => item.id === changeDetail.changeId && item.lifecycle === changeDetail.lifecycle,
    );
    const title = change && change.title !== change.id ? change.title : undefined;
    const progress =
      change && change.taskSummary.total > 0
        ? Math.round((change.taskSummary.completed / change.taskSummary.total) * 100)
        : 0;

    return {
      backHref: paths.changes(),
      breadcrumbs: [
        {
          label: project?.project.name || labels.project,
          href: paths.changes(),
          tone: "muted",
        },
        {
          label: labels.changes,
          href: paths.changes(),
          tone: "muted",
        },
        {
          label: change?.id || changeDetail.changeId,
          tone: title ? "muted" : "default",
        },
      ],
      title,
      meta:
        change && change.scopedChanges && change.scopedChanges.length > 1
          ? format.scopes(change.scopedChanges.length)
          : undefined,
      progress: change
        ? {
            label: `${change.taskSummary.completed}/${change.taskSummary.total}`,
            value: progress,
          }
        : undefined,
    };
  }

  if (specDetail) {
    const project = data.projects.find((item) => item.project.id === specDetail.projectId);
    const spec = project?.specs.find((item) => item.id === specDetail.specId);
    const specLabel = spec?.displayId || spec?.id || specDetail.specId;
    const title = spec && spec.title !== specLabel ? spec.title : undefined;

    return {
      backHref: paths.specs(),
      breadcrumbs: [
        {
          label: project?.project.name || labels.project,
          href: paths.specs(),
          tone: "muted",
        },
        {
          label: labels.specs,
          href: paths.specs(),
          tone: "muted",
        },
        {
          label: specLabel,
          tone: title ? "muted" : "default",
        },
      ],
      title,
      meta: spec ? format.requirementsShort(spec.requirementCount) : undefined,
    };
  }

  return undefined;
}

function RuntimeError({ message, detail }: { message?: string; detail?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="m-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive lg:m-4">
      <div className="flex items-center gap-2 font-medium">
        <RefreshCw className="size-4" />
        {message}
      </div>
      {detail ? <p className="mt-1 text-xs text-destructive/80">{detail}</p> : null}
    </div>
  );
}

function emptyData(): DashboardData {
  return {
    projects: [],
    focusedProjectId: null,
    focusedProjectPath: null,
    validation: { status: "not-run" },
    specs: [],
    changes: [],
    requirements: [],
    activity: [],
    realtime: {
      watcher: "idle",
      connection: "disconnected",
    },
  };
}
