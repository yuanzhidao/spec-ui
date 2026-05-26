"use client";

import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type DesktopTerminalIssue = {
  code: string;
  message: string;
  detail?: string;
};

export type HostTerminalEnvironment = {
  osFamily: string;
  osVersion?: string;
  architecture: string;
  shellPath: string;
  shellVersion?: string;
};

export type TerminalSessionInfo = {
  id: string;
  label: string;
  cwd: string;
  shellPath: string;
  createdAt: number;
  rows: number;
  cols: number;
  buffer: number[];
  exited: boolean;
  exitStatus?: string;
};

export type TerminalSnapshot = {
  environment?: HostTerminalEnvironment;
  issue?: DesktopTerminalIssue;
  sessions: TerminalSessionInfo[];
};

export type TerminalOutputEvent = {
  sessionId: string;
  bytes: number[];
};

export type TerminalExitEvent = {
  sessionId: string;
  exitStatus?: string;
};

export function isDesktopTerminalAvailable() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return isTauri();
  } catch {
    return false;
  }
}

export function listTerminalSessions() {
  return invoke<TerminalSnapshot>("terminal_list_sessions");
}

export function createTerminalSession({
  cwd,
  rows,
  cols,
}: {
  cwd?: string | null;
  rows?: number;
  cols?: number;
}) {
  return invoke<TerminalSessionInfo>("terminal_create_session", {
    cwd,
    rows,
    cols,
  });
}

export function writeTerminalSession(sessionId: string, data: string) {
  return invoke<void>("terminal_write", { sessionId, data });
}

export function resizeTerminalSession(sessionId: string, rows: number, cols: number) {
  return invoke<void>("terminal_resize", { sessionId, rows, cols });
}

export function closeTerminalSession(sessionId: string) {
  return invoke<TerminalSnapshot>("terminal_close_session", { sessionId });
}

export function onTerminalOutput(
  handler: (event: TerminalOutputEvent) => void,
): Promise<UnlistenFn> {
  return listen<TerminalOutputEvent>("terminal-output", (event) => handler(event.payload));
}

export function onTerminalExit(
  handler: (event: TerminalExitEvent) => void,
): Promise<UnlistenFn> {
  return listen<TerminalExitEvent>("terminal-exit", (event) => handler(event.payload));
}
