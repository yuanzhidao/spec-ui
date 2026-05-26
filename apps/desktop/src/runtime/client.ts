import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  LanguageMode,
  RuntimeSnapshot,
  ThemeMode,
} from "@spec-ui/core/dashboard/types";
import type {
  RuntimeClient,
  RuntimeConnectionHandler,
  RuntimeSnapshotHandler,
} from "@spec-ui/core/runtime/client";

export const desktopRuntimeClient: RuntimeClient = {
  fetchSnapshot: () => invoke<RuntimeSnapshot>("runtime_snapshot"),
  subscribeSnapshots,
  addProject: (path) => invoke<RuntimeSnapshot>("runtime_add_project", { path }),
  bindProject: (path) => invoke<RuntimeSnapshot>("runtime_add_project", { path }),
  focusProject: (path) => invoke<RuntimeSnapshot>("runtime_focus_project", { path }),
  removeProject: (path) => invoke<RuntimeSnapshot>("runtime_remove_project", { path }),
  relocateProject: (projectId, path) =>
    invoke<RuntimeSnapshot>("runtime_relocate_project", { projectId, path }),
  updateProjectWorkspaceDirectory: (projectId, path) =>
    invoke<RuntimeSnapshot>("runtime_update_project_workspace_directory", {
      projectId,
      path,
    }),
  updateProjectWorktreesDirectory: (projectId, path) =>
    invoke<RuntimeSnapshot>("runtime_update_project_worktrees_directory", {
      projectId,
      path,
    }),
  addProjectWorktreePath: (projectId, path) =>
    invoke<RuntimeSnapshot>("runtime_add_project_worktree_path", {
      projectId,
      path,
    }),
  removeProjectWorktreePath: (projectId, path) =>
    invoke<RuntimeSnapshot>("runtime_remove_project_worktree_path", {
      projectId,
      path,
    }),
  clearProjects: () => invoke<RuntimeSnapshot>("runtime_clear_projects"),
  clearProject: () => invoke<RuntimeSnapshot>("runtime_clear_projects"),
  refreshProject: (projectId) =>
    invoke<RuntimeSnapshot>("runtime_refresh_project", { projectId }),
  setChangeTaskCompleted: ({ sourcePath, lineNumber, completed }) =>
    invoke<RuntimeSnapshot>("runtime_set_change_task_completed", {
      sourcePath,
      lineNumber,
      completed,
    }),
  runValidation: () => invoke<RuntimeSnapshot>("runtime_run_validation"),
  setTheme: async (themeMode: ThemeMode) => {
    await invoke<void>("runtime_set_theme", { themeMode });
    return null;
  },
  setLanguage: async (language: LanguageMode) => {
    await invoke<void>("runtime_set_language", { language });
    return null;
  },
};

async function subscribeSnapshots(
  handler: RuntimeSnapshotHandler,
  setConnection: RuntimeConnectionHandler,
) {
  if (!isTauri()) {
    return null;
  }

  setConnection("connecting");
  const unlisten = await listen<RuntimeSnapshot>("runtime-snapshot", (event) => {
    handler(event.payload);
  });
  setConnection("connected");

  return () => {
    unlisten();
    setConnection("disconnected");
  };
}
