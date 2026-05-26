"use client";

import { createContext, useContext } from "react";
import type {
  ChangeTaskCompletionUpdate,
  LanguageMode,
  RuntimeIssue,
  RuntimeSnapshot,
  ThemeMode,
} from "../dashboard/types";

export type RuntimeConnection =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export type RuntimeDashboardValue = {
  snapshot: RuntimeSnapshot | null;
  connection: RuntimeConnection;
  error: RuntimeIssue | null;
  reload: () => Promise<void>;
  addProject: (path: string) => Promise<void>;
  bindProject: (path: string) => Promise<void>;
  focusProject: (path: string | null) => Promise<void>;
  removeProject: (path: string) => Promise<void>;
  relocateProject: (projectId: string, path: string) => Promise<void>;
  updateProjectWorkspaceDirectory: (
    projectId: string,
    path: string | null,
  ) => Promise<void>;
  updateProjectWorktreesDirectory: (
    projectId: string,
    path: string | null,
  ) => Promise<void>;
  addProjectWorktreePath: (projectId: string, path: string) => Promise<void>;
  removeProjectWorktreePath: (projectId: string, path: string) => Promise<void>;
  clearProjects: () => Promise<void>;
  clearProject: () => Promise<void>;
  refreshProject: (projectId?: string) => Promise<void>;
  setChangeTaskCompleted: (update: ChangeTaskCompletionUpdate) => Promise<void>;
  runValidation: () => Promise<void>;
  setTheme: (themeMode: ThemeMode) => Promise<void>;
  setLanguage: (language: LanguageMode) => Promise<void>;
};

export const RuntimeDashboardContext =
  createContext<RuntimeDashboardValue | null>(null);

export function useRuntimeDashboard() {
  const context = useContext(RuntimeDashboardContext);

  if (!context) {
    throw new Error("useRuntimeDashboard must be used within RuntimeDashboardProvider.");
  }

  return context;
}
