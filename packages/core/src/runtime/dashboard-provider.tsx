"use client";

import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  ChangeTaskCompletionUpdate,
  LanguageMode,
  RuntimeIssue,
  RuntimeSnapshot,
  RuntimeSettings,
  ThemeMode,
} from "../dashboard/types";
import type { RuntimeClient } from "./client";
import {
  RuntimeDashboardContext,
  type RuntimeConnection,
  type RuntimeDashboardValue,
} from "./dashboard-context";

let cachedSnapshot: RuntimeSnapshot | null = null;

function cacheSnapshot(snapshot: RuntimeSnapshot) {
  cachedSnapshot = snapshot;
  return snapshot;
}

type PendingPreference = Partial<
  Pick<RuntimeSettings, "language" | "themeMode">
>;

export function RuntimeDashboardProvider({
  children,
  client,
}: {
  children: ReactNode;
  client: RuntimeClient;
}) {
  const value = useRuntimeDashboardState(client);

  return createElement(RuntimeDashboardContext.Provider, { value }, children);
}

function useRuntimeDashboardState(client: RuntimeClient): RuntimeDashboardValue {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(cachedSnapshot);
  const [connection, setConnection] = useState<RuntimeConnection>("disconnected");
  const [error, setError] = useState<RuntimeIssue | null>(null);
  const clientRef = useRef(client);
  const taskWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingPreferenceRef = useRef<PendingPreference>({});

  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  const commitSnapshot = useCallback((next: RuntimeSnapshot) => {
    const pending = pendingPreferenceRef.current;
    const hasPendingPreference =
      pending.language !== undefined || pending.themeMode !== undefined;
    const optimistic = hasPendingPreference
      ? {
          ...next,
          settings: {
            ...next.settings,
            ...pending,
          },
        }
      : next;
    const cached = cacheSnapshot(optimistic);
    setSnapshot(cached);
  }, []);

  const patchSettings = useCallback((settings: PendingPreference) => {
    setSnapshot((current) => {
      if (!current) {
        return current;
      }

      return cacheSnapshot({
        ...current,
        settings: {
          ...current.settings,
          ...settings,
        },
      });
    });
  }, []);

  const setRuntimeError = useCallback((message: string, errorValue: unknown) => {
    setError({
      code: "runtime-error",
      message,
      detail: errorValue instanceof Error ? errorValue.message : String(errorValue),
    });
  }, []);

  const loadSnapshot = useCallback(async () => {
    try {
      commitSnapshot(await clientRef.current.fetchSnapshot());
      setError(null);
    } catch (loadError) {
      setRuntimeError("The local runtime is not reachable.", loadError);
    }
  }, [commitSnapshot, setRuntimeError]);

  useEffect(() => {
    let cancelled = false;

    client
      .fetchSnapshot()
      .then((next) => {
        if (!cancelled) {
          commitSnapshot(next);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setRuntimeError("The local runtime is not reachable.", loadError);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, commitSnapshot, setRuntimeError]);

  const projectCount = snapshot?.dashboard.projects.length ?? 0;

  useEffect(() => {
    if (projectCount === 0) {
      return;
    }

    let closed = false;
    let unsubscribe: (() => void) | null = null;

    void client
      .subscribeSnapshots(
        (next) => {
          if (!closed) {
            commitSnapshot(next);
            setError(null);
          }
        },
        (nextConnection) => {
          if (!closed) {
            setConnection(nextConnection);
          }
        },
      )
      .then((nextUnsubscribe) => {
        if (closed) {
          nextUnsubscribe?.();
          return;
        }

        if (nextUnsubscribe) {
          unsubscribe = nextUnsubscribe;
          return;
        }
      })
      .catch((subscribeError) => {
        if (!closed) {
          setConnection("disconnected");
          setRuntimeError("The local runtime subscription failed.", subscribeError);
        }
      });

    return () => {
      closed = true;
      unsubscribe?.();
      setConnection("disconnected");
    };
  }, [client, commitSnapshot, projectCount, setRuntimeError]);

  const runAction = useCallback(async (action: () => Promise<RuntimeSnapshot>) => {
    try {
      const next = await action();
      commitSnapshot(next);
      setError(null);
    } catch (actionError) {
      setRuntimeError("Runtime action failed.", actionError);
    }
  }, [commitSnapshot, setRuntimeError]);

  const setChangeTaskCompleted = useCallback(
    async (update: ChangeTaskCompletionUpdate) => {
      const write = taskWriteQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            const next = await clientRef.current.setChangeTaskCompleted(update);
            commitSnapshot(next);
            setError(null);
          } catch (actionError) {
            setRuntimeError("Runtime action failed.", actionError);
          }
        });

      taskWriteQueueRef.current = write.catch(() => undefined);
      await write;
    },
    [commitSnapshot, setRuntimeError],
  );

  const setThemeMode = useCallback(
    async (themeMode: ThemeMode) => {
      pendingPreferenceRef.current.themeMode = themeMode;
      patchSettings({ themeMode });

      try {
        const next = await clientRef.current.setTheme(themeMode);
        if (pendingPreferenceRef.current.themeMode === themeMode) {
          delete pendingPreferenceRef.current.themeMode;
        }
        if (next) {
          commitSnapshot(next);
        }
        setError(null);
      } catch (actionError) {
        if (pendingPreferenceRef.current.themeMode === themeMode) {
          delete pendingPreferenceRef.current.themeMode;
        }
        try {
          commitSnapshot(await clientRef.current.fetchSnapshot());
        } catch (loadError) {
          setRuntimeError("The local runtime is not reachable.", loadError);
          return;
        }
        setRuntimeError("Runtime action failed.", actionError);
      }
    },
    [commitSnapshot, patchSettings, setRuntimeError],
  );

  const setLanguageMode = useCallback(
    async (language: LanguageMode) => {
      pendingPreferenceRef.current.language = language;
      patchSettings({ language });

      try {
        const next = await clientRef.current.setLanguage(language);
        if (pendingPreferenceRef.current.language === language) {
          delete pendingPreferenceRef.current.language;
        }
        if (next) {
          commitSnapshot(next);
        }
        setError(null);
      } catch (actionError) {
        if (pendingPreferenceRef.current.language === language) {
          delete pendingPreferenceRef.current.language;
        }
        try {
          commitSnapshot(await clientRef.current.fetchSnapshot());
        } catch (loadError) {
          setRuntimeError("The local runtime is not reachable.", loadError);
          return;
        }
        setRuntimeError("Runtime action failed.", actionError);
      }
    },
    [commitSnapshot, patchSettings, setRuntimeError],
  );

  return useMemo(
    () => ({
      snapshot,
      connection,
      error,
      reload: loadSnapshot,
      addProject: (path: string) => runAction(() => client.addProject(path)),
      bindProject: (path: string) => runAction(() => client.bindProject(path)),
      focusProject: (path: string | null) => runAction(() => client.focusProject(path)),
      removeProject: (path: string) => runAction(() => client.removeProject(path)),
      relocateProject: (projectId: string, path: string) =>
        runAction(() => client.relocateProject(projectId, path)),
      updateProjectWorkspaceDirectory: (projectId: string, path: string | null) =>
        runAction(() => client.updateProjectWorkspaceDirectory(projectId, path)),
      updateProjectWorktreesDirectory: (projectId: string, path: string | null) =>
        runAction(() => client.updateProjectWorktreesDirectory(projectId, path)),
      addProjectWorktreePath: (projectId: string, path: string) =>
        runAction(() => client.addProjectWorktreePath(projectId, path)),
      removeProjectWorktreePath: (projectId: string, path: string) =>
        runAction(() => client.removeProjectWorktreePath(projectId, path)),
      clearProjects: () => runAction(client.clearProjects),
      clearProject: () => runAction(client.clearProject),
      refreshProject: (projectId?: string) =>
        runAction(() => client.refreshProject(projectId)),
      setChangeTaskCompleted,
      runValidation: () => runAction(client.runValidation),
      setTheme: setThemeMode,
      setLanguage: setLanguageMode,
    }),
    [
      client,
      connection,
      error,
      loadSnapshot,
      runAction,
      setChangeTaskCompleted,
      setLanguageMode,
      setThemeMode,
      snapshot,
    ],
  );
}
