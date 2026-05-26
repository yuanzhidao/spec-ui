import type {
  ChangeTaskCompletionUpdate,
  LanguageMode,
  RuntimeSnapshot,
  ThemeMode,
} from "../dashboard/types";
import type { RuntimeConnection } from "./dashboard-context";

export type RuntimeSnapshotHandler = (snapshot: RuntimeSnapshot) => void;
export type RuntimeConnectionHandler = (connection: RuntimeConnection) => void;
export type RuntimeSnapshotUnsubscribe = () => void;

export type RuntimeClient = {
  fetchSnapshot: () => Promise<RuntimeSnapshot>;
  subscribeSnapshots: (
    handler: RuntimeSnapshotHandler,
    setConnection: RuntimeConnectionHandler,
  ) => Promise<RuntimeSnapshotUnsubscribe | null>;
  addProject: (path: string) => Promise<RuntimeSnapshot>;
  bindProject: (path: string) => Promise<RuntimeSnapshot>;
  focusProject: (path: string | null) => Promise<RuntimeSnapshot>;
  removeProject: (path: string) => Promise<RuntimeSnapshot>;
  relocateProject: (projectId: string, path: string) => Promise<RuntimeSnapshot>;
  updateProjectWorkspaceDirectory: (
    projectId: string,
    path: string | null,
  ) => Promise<RuntimeSnapshot>;
  updateProjectWorktreesDirectory: (
    projectId: string,
    path: string | null,
  ) => Promise<RuntimeSnapshot>;
  addProjectWorktreePath: (
    projectId: string,
    path: string,
  ) => Promise<RuntimeSnapshot>;
  removeProjectWorktreePath: (
    projectId: string,
    path: string,
  ) => Promise<RuntimeSnapshot>;
  clearProjects: () => Promise<RuntimeSnapshot>;
  clearProject: () => Promise<RuntimeSnapshot>;
  refreshProject: (projectId?: string) => Promise<RuntimeSnapshot>;
  setChangeTaskCompleted: (
    update: ChangeTaskCompletionUpdate,
  ) => Promise<RuntimeSnapshot>;
  runValidation: () => Promise<RuntimeSnapshot>;
  setTheme: (themeMode: ThemeMode) => Promise<RuntimeSnapshot | null>;
  setLanguage: (language: LanguageMode) => Promise<RuntimeSnapshot | null>;
};
