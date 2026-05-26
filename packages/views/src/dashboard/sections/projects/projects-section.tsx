"use client";

import { useState } from "react";
import {
  ChevronDown,
  FolderKanban,
  FolderOpen,
  GitBranch,
  Grid2X2,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { DashboardData } from "@spec-ui/core/dashboard/types";
import { Badge } from "@spec-ui/ui/badge";
import { Button } from "@spec-ui/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@spec-ui/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@spec-ui/ui/dropdown-menu";
import { Input } from "@spec-ui/ui/input";
import { ProjectSelector } from "@spec-ui/views/dashboard/sidebar/project-selector";
import { useNavigation } from "@spec-ui/core/navigation/provider";
import { paths } from "@spec-ui/core/navigation/routes";
import { EmptyRows, ValidationBadge } from "../shared/section-shared";
import { filterProjects, projectActiveChanges, projectChangeProgress, type BoardMode } from "./model";
import {
  CheckoutTag,
  DialectTag,
  ProjectMetric,
  ProjectStatusMetric,
} from "./project-metadata";

export function ProjectsSection({
  data,
  busy,
  onAddProject,
  onFocusProject,
  onRemoveProject,
  onRelocateProject,
  onUpdateProjectWorkspaceDirectory,
  onUpdateProjectWorktreesDirectory,
  onAddProjectWorktreePath,
  onRemoveProjectWorktreePath,
}: {
  data: DashboardData;
  busy: boolean;
  onAddProject: (path: string) => void;
  onFocusProject: (path: string | null) => void;
  onRemoveProject: (path: string) => void;
  onRelocateProject: (projectId: string, path: string) => void;
  onUpdateProjectWorkspaceDirectory: (projectId: string, path: string | null) => void;
  onUpdateProjectWorktreesDirectory: (projectId: string, path: string | null) => void;
  onAddProjectWorktreePath: (projectId: string, path: string) => void;
  onRemoveProjectWorktreePath: (projectId: string, path: string) => void;
}) {
  const t = useTranslations("projects");
  const navigation = useNavigation();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<BoardMode>("board");
  const [addOpen, setAddOpen] = useState(false);
  const projects = filterProjects(data.projects, query);

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
              onUpdateProjectWorkspaceDirectory={onUpdateProjectWorkspaceDirectory}
              onUpdateProjectWorktreesDirectory={onUpdateProjectWorktreesDirectory}
              onAddProjectWorktreePath={onAddProjectWorktreePath}
              onRemoveProjectWorktreePath={onRemoveProjectWorktreePath}
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
              onUpdateProjectWorkspaceDirectory={onUpdateProjectWorkspaceDirectory}
              onUpdateProjectWorktreesDirectory={onUpdateProjectWorktreesDirectory}
              onAddProjectWorktreePath={onAddProjectWorktreePath}
              onRemoveProjectWorktreePath={onRemoveProjectWorktreePath}
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
  onUpdateProjectWorkspaceDirectory,
  onUpdateProjectWorktreesDirectory,
  onAddProjectWorktreePath,
  onRemoveProjectWorktreePath,
}: {
  project: DashboardData["projects"][number];
  focused: boolean;
  busy: boolean;
  onFocusProject: (path: string | null) => void;
  onOpenProject: (path: string) => void;
  onRemoveProject: (path: string) => void;
  onRelocateProject: (projectId: string, path: string) => void;
  onUpdateProjectWorkspaceDirectory: (projectId: string, path: string | null) => void;
  onUpdateProjectWorktreesDirectory: (projectId: string, path: string | null) => void;
  onAddProjectWorktreePath: (projectId: string, path: string) => void;
  onRemoveProjectWorktreePath: (projectId: string, path: string) => void;
}) {
  const t = useTranslations("projects");
  const progress = projectChangeProgress(project);
  const activeChanges = projectActiveChanges(project);

  return (
    <article className="flex h-full min-w-0 flex-col rounded-lg border bg-card p-3 transition-colors hover:border-accent hover:bg-accent/60">
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
            <DialectTag dialect={project.project.dialect} />
          </div>
        </button>
        <ProjectActions
          project={project}
          focused={focused}
          busy={busy}
          onFocusProject={onFocusProject}
          onRemoveProject={onRemoveProject}
          onRelocateProject={onRelocateProject}
          onUpdateProjectWorkspaceDirectory={onUpdateProjectWorkspaceDirectory}
          onUpdateProjectWorktreesDirectory={onUpdateProjectWorktreesDirectory}
          onAddProjectWorktreePath={onAddProjectWorktreePath}
          onRemoveProjectWorktreePath={onRemoveProjectWorktreePath}
        />
      </div>
      <button
        type="button"
        className="mt-3 flex min-w-0 w-full flex-1 flex-col rounded-md text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => onOpenProject(project.project.path)}
      >
        <p className="min-w-0 max-w-full truncate text-xs text-muted-foreground">{project.project.path}</p>
        {project.checkouts.length > 1 ? (
          <p className="mt-1 min-w-0 max-w-full truncate text-xs text-muted-foreground">
            {t("checkouts", { count: project.checkouts.length })}
          </p>
        ) : null}
        {project.issue || project.realtime.issue ? (
          <p className="mt-2 line-clamp-2 text-xs text-destructive">
            {(project.issue || project.realtime.issue)?.message}
          </p>
        ) : null}
        <div className="mt-3 w-full min-w-0 space-y-1.5">
          <div className="flex w-full min-w-0 items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-muted-foreground">{t("changesLabel")}</span>
            <span className="shrink-0 font-medium tabular-nums">{progress.completed}/{progress.total}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
        <div className="mt-auto flex w-full min-w-0 overflow-hidden gap-2 pt-3 text-xs">
          <ProjectMetric label={t("metrics.scopes")} value={project.scopes.length} />
          <ProjectMetric label={t("metrics.specs")} value={project.specs.length} />
          <ProjectMetric label={t("metrics.active")} value={activeChanges.length} />
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
  onUpdateProjectWorkspaceDirectory,
  onUpdateProjectWorktreesDirectory,
  onAddProjectWorktreePath,
  onRemoveProjectWorktreePath,
}: {
  project: DashboardData["projects"][number];
  focused: boolean;
  busy: boolean;
  onFocusProject: (path: string | null) => void;
  onOpenProject: (path: string) => void;
  onRemoveProject: (path: string) => void;
  onRelocateProject: (projectId: string, path: string) => void;
  onUpdateProjectWorkspaceDirectory: (projectId: string, path: string | null) => void;
  onUpdateProjectWorktreesDirectory: (projectId: string, path: string | null) => void;
  onAddProjectWorktreePath: (projectId: string, path: string) => void;
  onRemoveProjectWorktreePath: (projectId: string, path: string) => void;
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
            <DialectTag dialect={project.project.dialect} compact />
            <CheckoutTag count={project.checkouts.length} />
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
        onUpdateProjectWorkspaceDirectory={onUpdateProjectWorkspaceDirectory}
        onUpdateProjectWorktreesDirectory={onUpdateProjectWorktreesDirectory}
        onAddProjectWorktreePath={onAddProjectWorktreePath}
        onRemoveProjectWorktreePath={onRemoveProjectWorktreePath}
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
  onUpdateProjectWorkspaceDirectory,
  onUpdateProjectWorktreesDirectory,
  onAddProjectWorktreePath,
  onRemoveProjectWorktreePath,
}: {
  project: DashboardData["projects"][number];
  focused: boolean;
  busy: boolean;
  onFocusProject: (path: string | null) => void;
  onRemoveProject: (path: string) => void;
  onRelocateProject: (projectId: string, path: string) => void;
  onUpdateProjectWorkspaceDirectory: (projectId: string, path: string | null) => void;
  onUpdateProjectWorktreesDirectory: (projectId: string, path: string | null) => void;
  onAddProjectWorktreePath: (projectId: string, path: string) => void;
  onRemoveProjectWorktreePath: (projectId: string, path: string) => void;
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
      <ProjectSettingsDialog
        project={project}
        busy={busy}
        onRelocateProject={onRelocateProject}
        onUpdateProjectWorkspaceDirectory={onUpdateProjectWorkspaceDirectory}
        onUpdateProjectWorktreesDirectory={onUpdateProjectWorktreesDirectory}
        onAddProjectWorktreePath={onAddProjectWorktreePath}
        onRemoveProjectWorktreePath={onRemoveProjectWorktreePath}
      />
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
  onUpdateProjectWorkspaceDirectory,
  onUpdateProjectWorktreesDirectory,
  onAddProjectWorktreePath,
  onRemoveProjectWorktreePath,
}: {
  project: DashboardData["projects"][number];
  busy: boolean;
  onRelocateProject: (projectId: string, path: string) => void;
  onUpdateProjectWorkspaceDirectory: (projectId: string, path: string | null) => void;
  onUpdateProjectWorktreesDirectory: (projectId: string, path: string | null) => void;
  onAddProjectWorktreePath: (projectId: string, path: string) => void;
  onRemoveProjectWorktreePath: (projectId: string, path: string) => void;
}) {
  const t = useTranslations("projects.settings");
  const [open, setOpen] = useState(false);
  const [pathValue, setPathValue] = useState(project.project.path);
  const [workspacePathValue, setWorkspacePathValue] = useState(project.project.workspacePath || "");
  const [worktreesPathValue, setWorktreesPathValue] = useState(project.project.worktreesPath || "");
  const [orphanPathValue, setOrphanPathValue] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPath = pathValue.trim();
    const nextWorkspacePath = workspacePathValue.trim();
    const nextWorktreesPath = worktreesPathValue.trim();
    if (nextPath && nextPath !== project.project.path) {
      onRelocateProject(project.project.id, nextPath);
    }
    if ((project.project.workspacePath || "") !== nextWorkspacePath) {
      onUpdateProjectWorkspaceDirectory(
        project.project.id,
        nextWorkspacePath || null,
      );
    }
    if ((project.project.worktreesPath || "") !== nextWorktreesPath) {
      onUpdateProjectWorktreesDirectory(
        project.project.id,
        nextWorktreesPath || null,
      );
    }
    setOpen(false);
  }

  function addOrphanWorktree() {
    const nextPath = orphanPathValue.trim();
    if (!nextPath) {
      return;
    }
    onAddProjectWorktreePath(project.project.id, nextPath);
    setOrphanPathValue("");
  }

  function openDialog(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setPathValue(project.project.path);
      setWorkspacePathValue(project.project.workspacePath || "");
      setWorktreesPathValue(project.project.worktreesPath || "");
      setOrphanPathValue("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={t("aria")}
            disabled={busy}
            onClick={() => openDialog(true)}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form className="min-h-0 space-y-4 overflow-y-auto pr-1" onSubmit={submit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor={`project-path-${project.project.id}`}>
              {t("mainRepository")}
            </label>
            <Input
              id={`project-path-${project.project.id}`}
              value={pathValue}
              onChange={(event) => setPathValue(event.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium" htmlFor={`project-workspace-${project.project.id}`}>
                {t("workspaceDirectory")}
              </label>
              {workspacePathValue ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setWorkspacePathValue("")}
                >
                  {t("clear")}
                </Button>
              ) : null}
            </div>
            <Input
              id={`project-workspace-${project.project.id}`}
              value={workspacePathValue}
              onChange={(event) => setWorkspacePathValue(event.target.value)}
              placeholder={t("workspacePlaceholder")}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">{t("workspaceDescription")}</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium" htmlFor={`project-worktrees-${project.project.id}`}>
                {t("worktreesDirectory")}
              </label>
              {worktreesPathValue ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setWorktreesPathValue("")}
                >
                  {t("clear")}
                </Button>
              ) : null}
            </div>
            <Input
              id={`project-worktrees-${project.project.id}`}
              value={worktreesPathValue}
              onChange={(event) => setWorktreesPathValue(event.target.value)}
              placeholder={t("worktreesPlaceholder")}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">{t("worktreesDescription")}</p>
          </div>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{t("checkouts")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("checkoutCount", { count: project.checkouts.length })}
                </p>
              </div>
              {project.project.worktreesPath ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {t("autoSync")}
                </span>
              ) : null}
            </div>
            <div className="space-y-1.5">
              {project.checkouts.map((checkout) => (
                <div key={checkout.id} className="flex min-w-0 items-center gap-2 rounded-md bg-background px-2 py-1.5 text-xs">
                  <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">{checkout.label}</span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {checkout.kind}
                  </span>
                </div>
              ))}
            </div>
            {project.project.worktreeIssues.length > 0 ? (
              <div className="space-y-1">
                {project.project.worktreeIssues.map((issue) => (
                  <p key={`${issue.message}:${issue.detail}`} className="line-clamp-2 text-xs text-destructive">
                    {issue.message}
                    {issue.detail ? ` ${issue.detail}` : ""}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`project-orphan-worktree-${project.project.id}`}>
              {t("orphanWorktree")}
            </label>
            <div className="flex gap-2">
              <Input
                id={`project-orphan-worktree-${project.project.id}`}
                value={orphanPathValue}
                onChange={(event) => setOrphanPathValue(event.target.value)}
                placeholder={t("orphanPlaceholder")}
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={addOrphanWorktree}>
                {t("addWorktree")}
              </Button>
            </div>
            {project.project.worktreePaths.length > 0 ? (
              <div className="space-y-1">
                {project.project.worktreePaths.map((worktreePath) => (
                  <div key={worktreePath} className="flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
                    <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-muted-foreground">
                      {worktreePath}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => onRemoveProjectWorktreePath(project.project.id, worktreePath)}
                    >
                      {t("removeWorktree")}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
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
