import type { WSContext } from "hono/ws";
import path from "node:path";
import type { WebSocket } from "ws";
import type {
  DashboardData,
  DashboardProject,
  LanguageMode,
  ProjectBinding,
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
import { discoverProject } from "./project";
import {
  addProjectPath,
  defaultSettings,
  projectSettingById,
  projectSettingByPath,
  readSettings,
  removeProjectPath,
  updateProjectPath,
  withFocusedProjectId,
  withLanguage,
  withTheme,
  writeSettings,
} from "./settings";
import { notRunValidation, runProjectValidation, staleValidation } from "./validation";
import { ProjectWatcher } from "./watcher";

type RuntimeSocket = WSContext<WebSocket>;

type ProjectRuntimeEntry = {
  binding: ProjectBinding;
  issue?: RuntimeIssue;
  validation: ValidationResult;
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

    const entry = this.createEntry(result.binding, result.issue);
    this.settings = addProjectPath(this.settings, result.binding.path);
    const projectSetting = projectSettingByPath(this.settings, result.binding.path);
    if (projectSetting) {
      entry.binding = { ...entry.binding, id: projectSetting.id };
    }
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
      await entry.watcher.stop();
      this.projects.delete(projectPath);
    }

    this.settings = removeProjectPath(this.settings, projectPath);
    await writeSettings(this.settings);
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async relocateProject(projectId: string, projectPath: string): Promise<RuntimeSnapshot> {
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
      await previous.watcher.stop();
      this.projects.delete(existingSetting.path);
    }

    const entry = this.createEntry(
      { ...result.binding, id: projectId },
      result.issue,
    );
    await this.replaceEntry(entry);
    this.settings = updateProjectPath(this.settings, projectId, result.binding.path);
    this.settingsIssue = undefined;
    await writeSettings(this.settings);
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async clearProjects(): Promise<RuntimeSnapshot> {
    await Promise.all(Array.from(this.projects.values()).map((entry) => entry.watcher.stop()));
    this.projects.clear();
    this.settings = { ...this.settings, projects: [], focusedProjectId: null };
    await writeSettings(this.settings);
    void this.broadcastSnapshot();
    return this.snapshot();
  }

  async clearProject(): Promise<RuntimeSnapshot> {
    return this.clearProjects();
  }

  async refreshProject(): Promise<RuntimeSnapshot> {
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
    await Promise.all(Array.from(this.projects.values()).map((entry) => entry.watcher.stop()));
    this.projects.clear();

    for (const project of projects) {
      const result = await discoverProject(project.path);
      const entry = result.ok
        ? this.createEntry({ ...result.binding, id: project.id }, result.issue)
        : this.createEntry(invalidProjectBinding(project), result.issue);
      await this.replaceEntry(entry);
    }
  }

  private createEntry(
    binding: ProjectBinding,
    issue?: RuntimeIssue,
  ): ProjectRuntimeEntry {
    return {
      binding,
      issue,
      validation: notRunValidation(),
      activity: [],
      watcher: new ProjectWatcher(),
      watcherState: "idle",
    };
  }

  private async replaceEntry(entry: ProjectRuntimeEntry): Promise<void> {
    const previous = this.projects.get(entry.binding.path);
    if (previous) {
      await previous.watcher.stop();
    }

    this.projects.set(entry.binding.path, entry);
    await this.startWatcher(entry);
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
      entry.activity,
    );

    return {
      ...projected,
      issue: projected.issue || entry.issue,
      realtime: {
        watcher: entry.watcherState,
        issue: entry.watcherIssue,
      },
    };
  }

  private async startWatcher(entry: ProjectRuntimeEntry): Promise<void> {
    if (entry.binding.dialect !== "openspec") {
      entry.watcherState = "idle";
      return;
    }

    try {
      await entry.watcher.start(
        entry.binding,
        (event) => void this.handleProjectEvent(event),
        (error) => this.handleWatcherError(entry.binding.path, error),
      );
      entry.watcherState = "watching";
    } catch (error) {
      entry.watcherState = "error";
      entry.watcherIssue = {
        code: "watcher-error",
        message: "The local watcher could not start.",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async handleProjectEvent(event: ProjectEvent): Promise<void> {
    const entry = this.projects.get(event.projectPath);
    if (!entry) {
      return;
    }

    if (isOpenSpecDirectoryEvent(event)) {
      await this.refreshEntryDiscovery(entry);
    }

    entry.activity = [event, ...entry.activity].slice(0, 50);
    entry.validation = staleValidation(entry.validation);
    this.broadcast({
      type: "project-event",
      payload: event,
    });
    void this.broadcastSnapshot();
  }

  private async refreshEntryDiscovery(entry: ProjectRuntimeEntry): Promise<void> {
    const result = await discoverProject(entry.binding.path);
    if (!result.ok) {
      entry.issue = result.issue;
      return;
    }

    entry.binding = {
      ...result.binding,
      id: entry.binding.id,
    };
    entry.issue = result.issue;

    if (entry.binding.dialect !== "openspec") {
      await entry.watcher.stop();
      entry.watcherState = "idle";
    }
  }

  private handleWatcherError(projectPath: string, error: Error): void {
    const entry = this.projects.get(projectPath);
    if (!entry) {
      return;
    }

    entry.watcherState = "error";
    entry.watcherIssue = {
      code: "watcher-error",
      message: "The local watcher reported an error.",
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
}

function invalidProjectBinding(project: RuntimeProjectSetting): ProjectBinding {
  return {
    id: project.id,
    path: project.path,
    name: path.basename(project.path) || project.path,
    dialect: "none",
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

export const runtimeState = new RuntimeState();

function isOpenSpecDirectoryEvent(event: ProjectEvent): boolean {
  const normalized = event.filePath.split(path.sep).join("/");
  return normalized.endsWith("/openspec") || normalized.endsWith("/openspec/");
}
