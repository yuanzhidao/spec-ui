"use client";

import { useState } from "react";
import {
  ChevronDown,
  FolderKanban,
  FolderOpen,
  Grid2X2,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { DashboardData, ValidationResult } from "@/lib/dashboard-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ProjectSelector } from "@/components/dashboard/project-selector";
import { useNavigation } from "@/lib/navigation";
import { paths } from "@/lib/routes";
import { EmptyRows, ValidationBadge } from "../shared";

type BoardMode = "board" | "list";

export function ProjectsSection({
  data,
  busy,
  onAddProject,
  onFocusProject,
  onRemoveProject,
  onRelocateProject,
}: {
  data: DashboardData;
  busy: boolean;
  onAddProject: (path: string) => void;
  onFocusProject: (path: string | null) => void;
  onRemoveProject: (path: string) => void;
  onRelocateProject: (projectId: string, path: string) => void;
}) {
  const t = useTranslations("projects");
  const navigation = useNavigation();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<BoardMode>("board");
  const [addOpen, setAddOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const projects = normalizedQuery
    ? data.projects.filter((project) =>
        [project.project.name, project.project.path, project.project.dialect]
          .some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
    : data.projects;

  function addProject(path: string) {
    onAddProject(path);
    setAddOpen(false);
  }

  function openProject(path: string) {
    onFocusProject(path);
    navigation.push(paths.specs());
  }

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
          <h2 className="truncate text-sm font-medium">{t("title")}</h2>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {projects.length}/{data.projects.length}
          </span>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger
            render={
              <Button type="button" size="sm">
                <Plus className="size-4" />
                {t("newProject")}
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addTitle")}</DialogTitle>
              <DialogDescription>{t("addDescription")}</DialogDescription>
            </DialogHeader>
            <ProjectSelector issue={data.issue || data.settingsIssue} busy={busy} onBind={addProject} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-8 rounded-md pl-8 text-xs"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                {mode === "board" ? <Grid2X2 className="size-4" /> : <List className="size-4" />}
                <ChevronDown className="size-3" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("view")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setMode("board")}>
              <Grid2X2 className="size-4" />
              {t("grid")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode("list")}>
              <List className="size-4" />
              {t("list")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {projects.length === 0 ? (
        <EmptyRows icon={FolderKanban} label={t("empty")} />
      ) : mode === "board" ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.project.id}
              project={project}
              focused={data.focusedProjectId === project.project.id}
              busy={busy}
              onFocusProject={onFocusProject}
              onOpenProject={openProject}
              onRemoveProject={onRemoveProject}
              onRelocateProject={onRelocateProject}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y">
          {projects.map((project) => (
            <ProjectListRow
              key={project.project.id}
              project={project}
              focused={data.focusedProjectId === project.project.id}
              busy={busy}
              onFocusProject={onFocusProject}
              onOpenProject={openProject}
              onRemoveProject={onRemoveProject}
              onRelocateProject={onRelocateProject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  focused,
  busy,
  onFocusProject,
  onOpenProject,
  onRemoveProject,
  onRelocateProject,
}: {
  project: DashboardData["projects"][number];
  focused: boolean;
  busy: boolean;
  onFocusProject: (path: string | null) => void;
  onOpenProject: (path: string) => void;
  onRemoveProject: (path: string) => void;
  onRelocateProject: (projectId: string, path: string) => void;
}) {
  const t = useTranslations("projects");
  const progress = projectChangeProgress(project);

  return (
    <article className="rounded-lg border bg-card p-3 transition-colors hover:border-accent hover:bg-accent/60">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => onOpenProject(project.project.path)}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <FolderKanban className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium">{project.project.name}</h3>
            <p className="truncate text-xs text-muted-foreground">{project.project.dialect}</p>
          </div>
        </button>
        <ProjectActions
          project={project}
          focused={focused}
          busy={busy}
          onFocusProject={onFocusProject}
          onRemoveProject={onRemoveProject}
          onRelocateProject={onRelocateProject}
        />
      </div>
      <button
        type="button"
        className="mt-3 block w-full rounded-md text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => onOpenProject(project.project.path)}
      >
        <p className="truncate text-xs text-muted-foreground">{project.project.path}</p>
        {project.issue || project.realtime.issue ? (
          <p className="mt-2 line-clamp-2 text-xs text-destructive">
            {(project.issue || project.realtime.issue)?.message}
          </p>
        ) : null}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("changesLabel")}</span>
            <span className="font-medium tabular-nums">{progress.completed}/{progress.total}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
          <ProjectMetric label={t("metrics.scopes")} value={project.scopes.length} />
          <ProjectMetric label={t("metrics.specs")} value={project.specs.length} />
          <ProjectMetric label={t("metrics.active")} value={project.changes.length} />
          <ProjectStatusMetric validation={project.validation.status} watcher={project.realtime.watcher} />
        </div>
      </button>
    </article>
  );
}

function ProjectListRow({
  project,
  focused,
  busy,
  onFocusProject,
  onOpenProject,
  onRemoveProject,
  onRelocateProject,
}: {
  project: DashboardData["projects"][number];
  focused: boolean;
  busy: boolean;
  onFocusProject: (path: string | null) => void;
  onOpenProject: (path: string) => void;
  onRemoveProject: (path: string) => void;
  onRelocateProject: (projectId: string, path: string) => void;
}) {
  const t = useTranslations("projects");
  const progress = projectChangeProgress(project);

  return (
    <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 text-sm">
      <button
        type="button"
        className="grid min-w-0 grid-cols-[minmax(180px,1fr)_120px_80px_80px_120px] items-center gap-3 rounded-md text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => onOpenProject(project.project.path)}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-medium">{project.project.name}</p>
            {focused ? (
              <Badge variant="secondary" className="h-5 rounded text-[10px]">
                {t("focused")}
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{project.project.path}</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("changesLabel")}</span>
            <span className="font-medium tabular-nums">{progress.completed}/{progress.total}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{t("scopes", { count: project.scopes.length })}</span>
        <span className="text-xs text-muted-foreground">{t("specs", { count: project.specs.length })}</span>
        <span><ValidationBadge status={project.validation.status} /></span>
      </button>
      <ProjectActions
        project={project}
        focused={focused}
        busy={busy}
        onFocusProject={onFocusProject}
        onRemoveProject={onRemoveProject}
        onRelocateProject={onRelocateProject}
      />
    </div>
  );
}

function ProjectActions({
  project,
  focused,
  busy,
  onFocusProject,
  onRemoveProject,
  onRelocateProject,
}: {
  project: DashboardData["projects"][number];
  focused: boolean;
  busy: boolean;
  onFocusProject: (path: string | null) => void;
  onRemoveProject: (path: string) => void;
  onRelocateProject: (projectId: string, path: string) => void;
}) {
  const t = useTranslations("projects.actions");

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={focused ? t("showAll") : t("focus")}
        disabled={busy}
        onClick={() => onFocusProject(focused ? null : project.project.path)}
      >
        <FolderOpen className="size-4" />
      </Button>
      <ProjectSettingsDialog project={project} busy={busy} onRelocateProject={onRelocateProject} />
      <RemoveProjectDialog project={project} busy={busy} onRemoveProject={onRemoveProject} />
    </div>
  );
}

function RemoveProjectDialog({
  project,
  busy,
  onRemoveProject,
}: {
  project: DashboardData["projects"][number];
  busy: boolean;
  onRemoveProject: (path: string) => void;
}) {
  const t = useTranslations("projects.remove");
  const [open, setOpen] = useState(false);

  function removeProject() {
    onRemoveProject(project.project.path);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" size="icon-sm" variant="ghost" aria-label={t("aria")} disabled={busy}>
            <Trash2 className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 rounded-lg border bg-muted/40 p-3">
          <p className="min-w-0 truncate text-sm font-medium">{project.project.name}</p>
          <p className="mt-1 max-w-full overflow-x-auto whitespace-nowrap font-mono text-xs text-muted-foreground">
            {project.project.path}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={removeProject}>
            {t("confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProjectSettingsDialog({
  project,
  busy,
  onRelocateProject,
}: {
  project: DashboardData["projects"][number];
  busy: boolean;
  onRelocateProject: (projectId: string, path: string) => void;
}) {
  const t = useTranslations("projects.settings");
  const [open, setOpen] = useState(false);
  const [pathValue, setPathValue] = useState(project.project.path);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPath = pathValue.trim();
    if (!nextPath || nextPath === project.project.path) {
      setOpen(false);
      return;
    }
    onRelocateProject(project.project.id, nextPath);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={t("aria")}
            disabled={busy}
            onClick={() => setPathValue(project.project.path)}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor={`project-path-${project.project.id}`}>
              {t("localDirectory")}
            </label>
            <Input
              id={`project-path-${project.project.id}`}
              value={pathValue}
              onChange={(event) => setPathValue(event.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function projectChangeProgress(project: DashboardData["projects"][number]) {
  const total = project.changes.length;
  const completed = project.changes.filter(
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

function ProjectMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/60 px-2 py-1">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  );
}

function ProjectStatusMetric({
  validation,
  watcher,
}: {
  validation: ValidationResult["status"];
  watcher: DashboardData["realtime"]["watcher"];
}) {
  return (
    <div className="rounded-md bg-muted/60 px-2 py-1">
      <p className="text-[11px] text-muted-foreground">{watcher}</p>
      <p className="truncate font-medium">{validation}</p>
    </div>
  );
}
