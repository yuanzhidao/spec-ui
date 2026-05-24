"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  LanguageMode,
  RuntimeIssue,
  RuntimeSnapshot,
  ThemeMode,
} from "@/lib/dashboard-types";
import {
  addProject,
  addProjectWorktreePath,
  clearProjects,
  fetchSnapshot,
  focusProject,
  relocateProject,
  removeProject,
  removeProjectWorktreePath,
  refreshProject,
  runValidation,
  runtimeWebSocketUrl,
  setRuntimeLanguage,
  setRuntimeTheme,
  updateProjectWorktreesDirectory,
} from "@/lib/runtime-client";

type RuntimeConnection = "disconnected" | "connecting" | "connected" | "reconnecting";

let cachedSnapshot: RuntimeSnapshot | null = null;

function cacheSnapshot(snapshot: RuntimeSnapshot) {
  cachedSnapshot = snapshot;
  return snapshot;
}

export function useRuntimeDashboard() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(cachedSnapshot);
  const [connection, setConnection] = useState<RuntimeConnection>("disconnected");
  const [error, setError] = useState<RuntimeIssue | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      setSnapshot(cacheSnapshot(await fetchSnapshot()));
      setError(null);
    } catch (loadError) {
      setError({
        code: "runtime-error",
        message: "The local runtime is not reachable.",
        detail: loadError instanceof Error ? loadError.message : String(loadError),
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchSnapshot()
      .then((next) => {
        if (!cancelled) {
          setSnapshot(cacheSnapshot(next));
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError({
            code: "runtime-error",
            message: "The local runtime is not reachable.",
            detail: loadError instanceof Error ? loadError.message : String(loadError),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const projectCount = snapshot?.dashboard.projects.length ?? 0;

  useEffect(() => {
    if (projectCount === 0) {
      return;
    }

    let closed = false;

    function connect(nextState: RuntimeConnection) {
      setConnection(nextState);
      const socket = new WebSocket(runtimeWebSocketUrl());

      socket.onopen = () => {
        if (!closed) {
          setConnection("connected");
        }
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as {
          type: string;
          payload: RuntimeSnapshot;
        };
        if (message.type === "snapshot") {
          setSnapshot(cacheSnapshot(message.payload));
        }
      };

      socket.onclose = () => {
        if (closed) {
          return;
        }
        setConnection("reconnecting");
        reconnectTimer.current = setTimeout(() => connect("reconnecting"), 1200);
      };

      socket.onerror = () => {
        socket.close();
      };

      return socket;
    }

    const socket = connect("connecting");

    return () => {
      closed = true;
      socket?.close();
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      setConnection("disconnected");
    };
  }, [projectCount]);

  const runAction = useCallback(
    async (action: () => Promise<RuntimeSnapshot>) => {
      try {
        const next = await action();
        setSnapshot(cacheSnapshot(next));
        setError(null);
      } catch (actionError) {
        setError({
          code: "runtime-error",
          message: "Runtime action failed.",
          detail: actionError instanceof Error ? actionError.message : String(actionError),
        });
      }
    },
    [],
  );

  return useMemo(
    () => ({
      snapshot,
      connection,
      error,
      reload: loadSnapshot,
      addProject: (path: string) => runAction(() => addProject(path)),
      bindProject: (path: string) => runAction(() => addProject(path)),
      focusProject: (path: string | null) => runAction(() => focusProject(path)),
      removeProject: (path: string) => runAction(() => removeProject(path)),
      relocateProject: (projectId: string, path: string) =>
        runAction(() => relocateProject(projectId, path)),
      updateProjectWorktreesDirectory: (projectId: string, path: string | null) =>
        runAction(() => updateProjectWorktreesDirectory(projectId, path)),
      addProjectWorktreePath: (projectId: string, path: string) =>
        runAction(() => addProjectWorktreePath(projectId, path)),
      removeProjectWorktreePath: (projectId: string, path: string) =>
        runAction(() => removeProjectWorktreePath(projectId, path)),
      clearProjects: () => runAction(clearProjects),
      clearProject: () => runAction(clearProjects),
      refreshProject: (projectId?: string) => runAction(() => refreshProject(projectId)),
      runValidation: () => runAction(runValidation),
      setTheme: (themeMode: ThemeMode) => runAction(() => setRuntimeTheme(themeMode)),
      setLanguage: (language: LanguageMode) =>
        runAction(() => setRuntimeLanguage(language)),
    }),
    [connection, error, loadSnapshot, runAction, snapshot],
  );
}
