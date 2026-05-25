import type { WSContext } from "hono/ws";
import path from "node:path";
import type { WebSocket } from "ws";
import type {
  DashboardData,
  DashboardProject,
  LanguageMode,
  ProjectBinding,
  ProjectCheckout,
  ProjectEvent,
  RuntimeProjectSetting,
  RealtimeState,
  RuntimeIssue,
  RuntimeSettings,
  RuntimeSnapshot,
  ThemeMode,
  ValidationResult,
} from "@/lib/dashboard-types";
import { projectDashboardData } from "./adapters";
import { discoverProject, expandProjectPath } from "./project";
import {
  addProjectPath,
  addProjectWorktreePath,
  defaultSettings,
  projectSettingById,
  projectSettingByPath,
  readSettings,
  removeProjectPath,
  removeProjectWorktreePath,
  updateProjectPath,
  updateProjectWorktreesPath,
  withFocusedProjectId,
  withLanguage,
  withTheme,
  writeSettings,
} from "./settings";
import { notRunValidation, runProjectValidation, staleValidation } from "./validation";
import { ProjectWatcher } from "./watcher";
import { WorktreesDirectoryWatcher } from "./worktrees-watcher";
import { discoverWorktreeCheckouts, primaryCheckoutFromBinding } from "./worktrees";

type RuntimeSocket = WSContext<WebSocket>;

type ProjectRuntimeEntry = {
  binding: ProjectBinding;
  issue?: RuntimeIssue;
  validation: ValidationResult;
  checkouts: CheckoutRuntimeEntry[];
  worktreesDirectoryWatcher: WorktreesDirectoryWatcher;
  worktreesDirectoryWatcherState: RealtimeState["watcher"];
  worktreesDirectoryWatcherIssue?: RuntimeIssue;
};

type CheckoutRuntimeEntry = {
  checkout: ProjectCheckout;
  activity: ProjectEvent[];
  watcher: ProjectWatcher;
  watcherState: RealtimeState["watcher"];
  watcherIssue?: RuntimeIssue;
};

export class RuntimeState {
  private settings: RuntimeSettings = defaultSettings;
  private settingsIssue: RuntimeIssue | undefined;
  private projects = new Map<string, ProjectRuntimeEntry>();
  private clients = new Set<RuntimeSocket>();
  private worktreesSettleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  async initialize(): Promise<RuntimeSnapshot> {
    const result = await readSettings();
    this.settings = result.settings;
    this.settingsIssue = result.issue;

    await this.restoreProjects(this.settings.projects);

    return this.snapshot();
  }

  async setTheme(themeMode: ThemeMode): Promise<RuntimeSnapshot> {
    this.settings = withTheme(this.settings, themeMode);
    await writeSettings(this.settings);
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async setLanguage(language: LanguageMode): Promise<RuntimeSnapshot> {
    this.settings = withLanguage(this.settings, language);
    await writeSettings(this.settings);
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async addProject(projectPath: string): Promise<RuntimeSnapshot> {
    const result = await discoverProject(projectPath);

    if (!result.ok) {
      this.settingsIssue = result.issue;
      void this.broadcastSnapshot();
      return this.snapshot();
    }

    this.settings = addProjectPath(this.settings, result.binding.path);
    const projectSetting = projectSettingByPath(this.settings, result.binding.path);
    const entry = await this.createEntry(
      { ...result.binding, id: projectSetting?.id ?? result.binding.id },
      result.issue,
      projectSetting,
    );
    await this.replaceEntry(entry);
    this.settingsIssue = undefined;
    await writeSettings(this.settings);
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async bindProject(projectPath: string): Promise<RuntimeSnapshot> {
    return this.addProject(projectPath);
  }

  async focusProject(projectPath: string | null): Promise<RuntimeSnapshot> {
    const project = projectPath ? this.projects.get(projectPath) : undefined;
    this.settings = withFocusedProjectId(this.settings, project?.binding.id ?? null);
    await writeSettings(this.settings);
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async removeProject(projectPath: string): Promise<RuntimeSnapshot> {
    const entry = this.projects.get(projectPath);
    if (entry) {
      this.clearWorktreesSettleTimer(entry.binding.id);
      await this.stopEntryWatchers(entry);
      this.projects.delete(projectPath);
    }

    this.settings = removeProjectPath(this.settings, projectPath);
    await writeSettings(this.settings);
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async relocateProject(projectId: string, projectPath: string): Promise<RuntimeSnapshot> {
    this.clearWorktreesSettleTimer(projectId);
    const existingSetting = projectSettingById(this.settings, projectId);
    if (!existingSetting) {
      this.settingsIssue = {
        code: "missing-path",
        message: "The project is not available.",
      };
      return this.snapshot();
    }

    const duplicate = this.settings.projects.find(
      (project) => project.id !== projectId && project.path === projectPath,
    );
    if (duplicate) {
      this.settingsIssue = {
        code: "runtime-error",
        message: "That directory is already saved as another project.",
        detail: projectPath,
      };
      return this.snapshot();
    }

    const result = await discoverProject(projectPath);
    if (!result.ok) {
      this.settingsIssue = result.issue;
      void this.broadcastSnapshot();
      return this.snapshot();
    }

    const previous = this.projects.get(existingSetting.path);
    if (previous) {
      await this.stopEntryWatchers(previous);
      this.projects.delete(existingSetting.path);
    }

    this.settings = updateProjectPath(this.settings, projectId, result.binding.path);
    const projectSetting = projectSettingById(this.settings, projectId);
    const entry = await this.createEntry(
      { ...result.binding, id: projectId },
      result.issue,
      projectSetting,
    );
    await this.replaceEntry(entry);
    this.settingsIssue = undefined;
    await writeSettings(this.settings);
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async updateProjectWorktreesPath(
    projectId: string,
    worktreesPath: string | null,
  ): Promise<RuntimeSnapshot> {
    this.clearWorktreesSettleTimer(projectId);
    const setting = projectSettingById(this.settings, projectId);
    if (!setting) {
      this.settingsIssue = {
        code: "missing-path",
        message: "The project is not available.",
      };
      return this.snapshot();
    }

    this.settings = updateProjectWorktreesPath(
      this.settings,
      projectId,
      worktreesPath ? normalizeUserPath(worktreesPath) : null,
    );
    await writeSettings(this.settings);
    await this.reloadProject(projectId);
    this.settingsIssue = undefined;
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async addProjectWorktreePath(
    projectId: string,
    worktreePath: string,
  ): Promise<RuntimeSnapshot> {
    const setting = projectSettingById(this.settings, projectId);
    if (!setting) {
      this.settingsIssue = {
        code: "missing-path",
        message: "The project is not available.",
      };
      return this.snapshot();
    }

    this.settings = addProjectWorktreePath(
      this.settings,
      projectId,
      normalizeUserPath(worktreePath),
    );
    await writeSettings(this.settings);
    await this.reloadProject(projectId);
    this.settingsIssue = undefined;
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async removeProjectWorktreePath(
    projectId: string,
    worktreePath: string,
  ): Promise<RuntimeSnapshot> {
    const setting = projectSettingById(this.settings, projectId);
    if (!setting) {
      this.settingsIssue = {
        code: "missing-path",
        message: "The project is not available.",
      };
      return this.snapshot();
    }

    this.settings = removeProjectWorktreePath(this.settings, projectId, worktreePath);
    await writeSettings(this.settings);
    await this.reloadProject(projectId);
    this.settingsIssue = undefined;
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async clearProjects(): Promise<RuntimeSnapshot> {
    this.clearWorktreesSettleTimers();
    await Promise.all(Array.from(this.projects.values()).map((entry) => this.stopEntryWatchers(entry)));
    this.projects.clear();
    this.settings = { ...this.settings, projects: [], focusedProjectId: null };
    await writeSettings(this.settings);
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async clearProject(): Promise<RuntimeSnapshot> {
    return this.clearProjects();
  }

  async refreshProject(projectId?: string): Promise<RuntimeSnapshot> {
    const targetProjectId = projectId || this.settings.focusedProjectId;
    if (targetProjectId) {
      await this.reloadProject(targetProjectId);
    } else {
      for (const project of this.settings.projects) {
        await this.reloadProject(project.id);
      }
    }
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async runValidation(projectPath = this.focusedProjectPath()): Promise<RuntimeSnapshot> {
    if (!projectPath) {
      this.settingsIssue = {
        code: "missing-path",
        message: "Focus a local project before running validation.",
      };
      return this.snapshot();
    }

    const entry = this.projects.get(projectPath);
    if (!entry) {
      this.settingsIssue = {
        code: "missing-path",
        message: "The focused project is not available.",
      };
      return this.snapshot();
    }

    entry.validation = {
      status: "running",
      startedAt: new Date().toISOString(),
      command: entry.binding.dialect === "openspec" ? "openspec validate --all" : undefined,
    };
    void this.broadcastSnapshot();

    entry.validation = await runProjectValidation(entry.binding);
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  addClient(client: RuntimeSocket): void {
    this.clients.add(client);
    void this.sendSnapshot(client);
  }

  removeClient(client: RuntimeSocket): void {
    this.clients.delete(client);
  }

  async snapshot(): Promise<RuntimeSnapshot> {
    return {
      settings: this.settings,
      dashboard: await this.dashboardData(),
    };
  }

  private async restoreProjects(projects: RuntimeProjectSetting[]): Promise<void> {
    this.clearWorktreesSettleTimers();
    await Promise.all(Array.from(this.projects.values()).map((entry) => this.stopEntryWatchers(entry)));
    this.projects.clear();

    for (const project of projects) {
      const result = await discoverProject(project.path);
      const entry = result.ok
        ? await this.createEntry({ ...result.binding, id: project.id }, result.issue, project)
        : await this.createEntry(invalidProjectBinding(project), result.issue, project);
      await this.replaceEntry(entry);
    }
  }

  private async createEntry(
    binding: ProjectBinding,
    issue?: RuntimeIssue,
    setting?: RuntimeProjectSetting,
    previous?: ProjectRuntimeEntry,
  ): Promise<ProjectRuntimeEntry> {
    const primaryCheckout = await primaryCheckoutFromBinding(binding);
    const worktrees = setting
      ? await discoverWorktreeCheckouts(setting, binding)
      : { checkouts: [], issues: [] };
    const checkouts = [primaryCheckout, ...worktrees.checkouts];
    const projectBinding = {
      ...binding,
      worktreesPath: setting?.worktreesPath,
      worktreePaths: setting?.worktreePaths || [],
      checkouts,
      worktreeIssues: worktrees.issues,
    };

    return {
      binding: projectBinding,
      issue,
      validation: previous?.validation ?? notRunValidation(),
      checkouts: checkouts.map((checkout) => ({
        checkout,
        activity: previousCheckoutActivity(previous, checkout.path),
        watcher: new ProjectWatcher(),
        watcherState: "idle" as const,
      })),
      worktreesDirectoryWatcher: new WorktreesDirectoryWatcher(),
      worktreesDirectoryWatcherState: "idle" as const,
    };
  }

  private async replaceEntry(entry: ProjectRuntimeEntry): Promise<void> {
    const previous = this.projects.get(entry.binding.path);
    if (previous) {
      await this.stopEntryWatchers(previous);
    }

    this.projects.set(entry.binding.path, entry);
    await this.startWatchers(entry);
  }

  private async dashboardData(): Promise<DashboardData> {
    const projects = await Promise.all(
      Array.from(this.projects.values()).map((entry) => this.dashboardProject(entry)),
    );
    const focusedProjectId = this.settings.focusedProjectId;
    const focused = focusedProjectId
      ? projects.find((project) => project.project.id === focusedProjectId)
      : undefined;
    const visibleProjects = focused ? [focused] : projects;

    return {
      projects,
      focusedProjectId,
      focusedProjectPath: focused?.project.path ?? null,
      project: focused?.project,
      issue: focused?.issue,
      settingsIssue: this.settingsIssue,
      validation: focused?.validation ?? notRunValidation(),
      specs: visibleProjects.flatMap((project) => project.specs),
      changes: visibleProjects.flatMap((project) => project.changes),
      requirements: visibleProjects.flatMap((project) => project.requirements),
      activity: visibleProjects.flatMap((project) => project.activity),
      realtime: this.realtimeState(projects),
    };
  }

  private async dashboardProject(entry: ProjectRuntimeEntry): Promise<DashboardProject> {
    const projected = await projectDashboardData(
      entry.binding,
      entry.validation,
      entry.checkouts.flatMap((checkout) => checkout.activity),
    );

    return {
      ...projected,
      issue: projected.issue || entry.issue,
      realtime: {
        watcher: this.entryWatcherState(entry),
        issue: this.entryWatcherIssue(entry),
      },
    };
  }

  private async startWatchers(entry: ProjectRuntimeEntry): Promise<void> {
    await Promise.all([
      ...entry.checkouts.map((checkout) => this.startCheckoutWatcher(entry, checkout)),
      this.startWorktreesDirectoryWatcher(entry),
    ]);
  }

  private async startCheckoutWatcher(
    entry: ProjectRuntimeEntry,
    checkoutEntry: CheckoutRuntimeEntry,
  ): Promise<void> {
    if (checkoutEntry.checkout.dialect !== "openspec") {
      checkoutEntry.watcherState = "idle";
      return;
    }

    const binding = checkoutBinding(entry.binding, checkoutEntry.checkout);
    try {
      await checkoutEntry.watcher.start(
        binding,
        (event) => void this.handleProjectEvent(event),
        (error) => this.handleWatcherError(checkoutEntry.checkout.path, error),
      );
      checkoutEntry.watcherState = "watching";
    } catch (error) {
      checkoutEntry.watcherState = "error";
      checkoutEntry.watcherIssue = {
        code: "watcher-error",
        message: "The local watcher could not start.",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async handleProjectEvent(event: ProjectEvent): Promise<void> {
    const found = this.entryByCheckoutPath(event.projectPath);
    const entry = found?.entry;
    const checkout = found?.checkout;
    if (!entry) {
      return;
    }

    if (checkout) {
      checkout.activity = [event, ...checkout.activity].slice(0, 50);
    }
    entry.validation = staleValidation(entry.validation);
    if (isOpenSpecDirectoryEvent(event)) {
      await this.reloadProject(entry.binding.id);
    }
    this.broadcast({
      type: "project-event",
      payload: event,
    });
    void this.broadcastSnapshot();
  }

  private async startWorktreesDirectoryWatcher(entry: ProjectRuntimeEntry): Promise<void> {
    const worktreesPath = entry.binding.worktreesPath;
    if (!worktreesPath) {
      entry.worktreesDirectoryWatcherState = "idle";
      return;
    }

    try {
      await entry.worktreesDirectoryWatcher.start(
        worktreesPath,
        () => this.handleWorktreesDirectoryChange(entry.binding.id),
        (error) => this.handleWorktreesDirectoryWatcherError(entry.binding.id, error),
      );
      entry.worktreesDirectoryWatcherState = "watching";
    } catch (error) {
      entry.worktreesDirectoryWatcherState = "error";
      entry.worktreesDirectoryWatcherIssue = {
        code: "watcher-error",
        message: "The worktrees directory watcher could not start.",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async handleWorktreesDirectoryChange(projectId: string): Promise<void> {
    const previous = this.entryByProjectId(projectId);
    if (previous) {
      previous.validation = staleValidation(previous.validation);
    }

    await this.reloadProject(projectId);
    this.scheduleWorktreesSettleReload(projectId);
    void this.broadcastSnapshot();
  }

  private scheduleWorktreesSettleReload(projectId: string): void {
    this.clearWorktreesSettleTimer(projectId);
    const timer = setTimeout(() => {
      this.worktreesSettleTimers.delete(projectId);
      void this.handleWorktreesSettleReload(projectId);
    }, 2_000);
    this.worktreesSettleTimers.set(projectId, timer);
  }

  private async handleWorktreesSettleReload(projectId: string): Promise<void> {
    try {
      await this.reloadProject(projectId);
      void this.broadcastSnapshot();
    } catch (error) {
      this.handleWorktreesDirectoryWatcherError(
        projectId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private clearWorktreesSettleTimer(projectId: string): void {
    const timer = this.worktreesSettleTimers.get(projectId);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.worktreesSettleTimers.delete(projectId);
  }

  private clearWorktreesSettleTimers(): void {
    for (const timer of this.worktreesSettleTimers.values()) {
      clearTimeout(timer);
    }
    this.worktreesSettleTimers.clear();
  }

  private async reloadProject(projectId: string): Promise<void> {
    const setting = projectSettingById(this.settings, projectId);
    if (!setting) {
      return;
    }

    const previous = this.projects.get(setting.path);
    const result = await discoverProject(setting.path);
    if (!result.ok) {
      if (previous) {
        previous.issue = result.issue;
      }
      return;
    }

    const entry = await this.createEntry(
      { ...result.binding, id: projectId },
      result.issue,
      setting,
      previous,
    );
    await this.replaceEntry(entry);
  }

  private handleWatcherError(checkoutPath: string, error: Error): void {
    const found = this.entryByCheckoutPath(checkoutPath);
    if (!found) {
      return;
    }

    found.checkout.watcherState = "error";
    found.checkout.watcherIssue = {
      code: "watcher-error",
      message: "The local watcher reported an error.",
      detail: error.message,
    };
    void this.broadcastSnapshot();
  }

  private handleWorktreesDirectoryWatcherError(projectId: string, error: Error): void {
    const entry = this.entryByProjectId(projectId);
    if (!entry) {
      return;
    }

    entry.worktreesDirectoryWatcherState = "error";
    entry.worktreesDirectoryWatcherIssue = {
      code: "watcher-error",
      message: "The worktrees directory watcher reported an error.",
      detail: error.message,
    };
    void this.broadcastSnapshot();
  }

  private realtimeState(projects: DashboardProject[]): RealtimeState {
    const errorProject = projects.find((project) => project.realtime.watcher === "error");
    const watching = projects.some((project) => project.realtime.watcher === "watching");

    return {
      watcher: errorProject ? "error" : watching ? "watching" : "idle",
      connection: this.clients.size > 0 ? "connected" : "disconnected",
      issue: errorProject?.realtime.issue,
    };
  }

  private async broadcastSnapshot(): Promise<void> {
    this.broadcast({
      type: "snapshot",
      payload: await this.snapshot(),
    });
  }

  private async sendSnapshot(client: RuntimeSocket): Promise<void> {
    this.send(client, {
      type: "snapshot",
      payload: await this.snapshot(),
    });
  }

  private broadcast(message: unknown): void {
    for (const client of this.clients) {
      this.send(client, message);
    }
  }

  private send(client: RuntimeSocket, message: unknown): void {
    try {
      client.send(JSON.stringify(message));
    } catch {
      this.clients.delete(client);
    }
  }

  private focusedProjectPath(): string | undefined {
    const focusedProjectId = this.settings.focusedProjectId;
    if (!focusedProjectId) {
      return undefined;
    }
    return this.settings.projects.find((project) => project.id === focusedProjectId)?.path;
  }

  private async stopEntryWatchers(entry: ProjectRuntimeEntry): Promise<void> {
    await Promise.all([
      ...entry.checkouts.map((checkout) => checkout.watcher.stop()),
      entry.worktreesDirectoryWatcher.stop(),
    ]);
  }

  private entryByProjectId(projectId: string): ProjectRuntimeEntry | undefined {
    return Array.from(this.projects.values()).find((entry) => entry.binding.id === projectId);
  }

  private entryByCheckoutPath(
    checkoutPath: string,
  ): { entry: ProjectRuntimeEntry; checkout: CheckoutRuntimeEntry } | undefined {
    for (const entry of this.projects.values()) {
      const checkout = entry.checkouts.find((item) => item.checkout.path === checkoutPath);
      if (checkout) {
        return { entry, checkout };
      }
    }
    return undefined;
  }

  private entryWatcherState(entry: ProjectRuntimeEntry): RealtimeState["watcher"] {
    if (
      entry.worktreesDirectoryWatcherState === "error" ||
      entry.checkouts.some((checkout) => checkout.watcherState === "error")
    ) {
      return "error";
    }
    if (
      entry.worktreesDirectoryWatcherState === "watching" ||
      entry.checkouts.some((checkout) => checkout.watcherState === "watching")
    ) {
      return "watching";
    }
    return "idle";
  }

  private entryWatcherIssue(entry: ProjectRuntimeEntry): RuntimeIssue | undefined {
    return (
      entry.worktreesDirectoryWatcherIssue ||
      entry.checkouts.find((checkout) => checkout.watcherIssue)?.watcherIssue
    );
  }
}

function invalidProjectBinding(project: RuntimeProjectSetting): ProjectBinding {
  return {
    id: project.id,
    path: project.path,
    name: path.basename(project.path) || project.path,
    dialect: "none",
    worktreesPath: project.worktreesPath,
    worktreePaths: project.worktreePaths || [],
    checkouts: [],
    worktreeIssues: [],
    discovery: {
      hasOpenSpecDir: false,
      hasConfig: false,
      hasSpecsDir: false,
      hasChangesDir: false,
      isEmptyOpenSpec: false,
      scopes: [],
    },
  };
}

function previousCheckoutActivity(
  previous: ProjectRuntimeEntry | undefined,
  checkoutPath: string,
): ProjectEvent[] {
  return previous?.checkouts.find((checkout) => checkout.checkout.path === checkoutPath)?.activity || [];
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

function normalizeUserPath(input: string): string {
  return path.resolve(expandProjectPath(input.trim()));
}

export const runtimeState = new RuntimeState();

function isOpenSpecDirectoryEvent(event: ProjectEvent): boolean {
  const normalized = event.filePath.split(path.sep).join("/");
  return normalized.endsWith("/openspec") || normalized.endsWith("/openspec/");
}
