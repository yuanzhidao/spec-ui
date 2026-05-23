"use client";

import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  ChevronDown,
  FolderKanban,
  Layers3,
  Play,
} from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-types";
import type { DashboardSection } from "@/lib/routes";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarProjectSwitcherLoading } from "./loading-state";
import { DashboardNavigation } from "./navigation";
import { SearchTrigger } from "./search-command";

export function AppSidebar({
  data,
  section,
  loading,
  onFocusProject,
  onOpenSearch,
  onRunValidation,
}: {
  data: DashboardData;
  section: DashboardSection;
  loading?: boolean;
  onFocusProject: (path: string | null) => void;
  onOpenSearch: () => void;
  onRunValidation: () => void;
}) {
  const t = useTranslations("sidebar");

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader className="py-3">
        {loading ? (
          <SidebarProjectSwitcherLoading />
        ) : (
          <ProjectSwitcher data={data} onFocusProject={onFocusProject} />
        )}

        <SidebarMenu>
          <SidebarMenuItem>
            <SearchTrigger onOpen={onOpenSearch} />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onRunValidation}
              disabled={loading || !data.project || data.validation.status === "running"}
              className="text-muted-foreground"
            >
              <Play className="size-4" />
              <span className="min-w-0 flex-1 truncate text-left">{t("runValidation")}</span>
              <ValidationDot status={data.validation.status} />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <DashboardNavigation active={section} />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

function ProjectSwitcher({
  data,
  onFocusProject,
}: {
  data: DashboardData;
  onFocusProject: (path: string | null) => void;
}) {
  const t = useTranslations("sidebar");
  const value = data.focusedProjectId || "__all__";

  function selectProject(nextValue: string) {
    const nextProject = data.projects.find((project) => project.project.id === nextValue);
    onFocusProject(nextProject?.project.path ?? null);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex h-9 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={t("switchProject")}
          >
            <div className="flex size-6 shrink-0 items-center justify-center rounded bg-sidebar-accent text-sidebar-accent-foreground">
              {data.project ? <FolderKanban className="size-3.5" /> : <Layers3 className="size-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {data.project?.name || t("allProjects")}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                {data.project ? t("focusedProject") : "spec-ui"}
              </p>
            </div>
            <ChevronDown className="size-3.5 shrink-0 text-sidebar-foreground/60" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t("switchProject")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={selectProject}>
          <DropdownMenuRadioItem value="__all__">
            <Layers3 className="size-4" />
            <span className="min-w-0 flex-1 truncate">{t("allProjects")}</span>
            <Badge variant="secondary" className="ml-auto h-5 rounded text-[10px]">
              {data.projects.length}
            </Badge>
          </DropdownMenuRadioItem>
          {data.projects.length > 0 ? <DropdownMenuSeparator /> : null}
          {data.projects.map((project) => (
            <DropdownMenuRadioItem key={project.project.id} value={project.project.id}>
              <FolderKanban className="size-4" />
              <span className="min-w-0 flex-1 truncate">{project.project.name}</span>
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                {project.changes.length}/{project.specs.length}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ValidationDot({ status }: { status: DashboardData["validation"]["status"] }) {
  if (status === "passing") {
    return <CheckCircle2 className="ml-auto size-3.5 text-status-success" />;
  }

  if (status === "running") {
    return <span className="ml-auto size-1.5 rounded-full bg-status-info" />;
  }

  if (status === "failing" || status === "stale") {
    return <span className="ml-auto size-1.5 rounded-full bg-status-warning" />;
  }

  return null;
}
