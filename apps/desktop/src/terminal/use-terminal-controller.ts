"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DesktopTerminalIssue,
  TerminalExitEvent,
  TerminalOutputEvent,
  TerminalSessionInfo,
  TerminalSnapshot,
} from "./client";
import {
  closeTerminalSession,
  createTerminalSession,
  isDesktopTerminalAvailable,
  listTerminalSessions,
  onTerminalExit,
  onTerminalOutput,
} from "./client";

const OUTPUT_BUFFER_LIMIT = 256 * 1024;
const OUTPUT_FLUSH_INTERVAL_MS = 50;

export type TerminalAvailability = "checking" | "desktop" | "web";

export function useTerminalController() {
  const [availability, setAvailability] = useState<TerminalAvailability>(() =>
    isDesktopTerminalAvailable() ? "checking" : "web",
  );
  const [snapshot, setSnapshot] = useState<TerminalSnapshot | null>(null);
  const [issue, setIssue] = useState<DesktopTerminalIssue | null>(null);
  const mountedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isDesktopTerminalAvailable()) {
      setAvailability("web");
      setSnapshot(null);
      return null;
    }

    try {
      const next = await listTerminalSessions();
      if (mountedRef.current) {
        setAvailability("desktop");
        setSnapshot(next);
        setIssue(next.issue ?? null);
      }
      return next;
    } catch (error) {
      const nextIssue = normalizeIssue(error);
      if (mountedRef.current) {
        setAvailability("desktop");
        setIssue(nextIssue);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!isDesktopTerminalAvailable()) {
      return () => {
        mountedRef.current = false;
      };
    }

    const refreshTimer = window.setTimeout(() => {
      void refresh();
    }, 0);

    let closed = false;
    let outputUnlisten: (() => void) | undefined;
    let exitUnlisten: (() => void) | undefined;
    let outputFlushTimer: number | undefined;
    let pendingOutput: TerminalOutputEvent[] = [];

    const flushOutput = () => {
      outputFlushTimer = undefined;
      const events = pendingOutput;
      pendingOutput = [];
      if (events.length > 0 && mountedRef.current) {
        setSnapshot((current) => applyOutputEvents(current, events));
      }
    };

    void onTerminalOutput((event) => {
      if (!mountedRef.current) {
        return;
      }

      pendingOutput.push(event);
      if (outputFlushTimer === undefined) {
        outputFlushTimer = window.setTimeout(flushOutput, OUTPUT_FLUSH_INTERVAL_MS);
      }
    }).then((unlisten) => {
      if (closed) {
        unlisten();
      } else {
        outputUnlisten = unlisten;
      }
    });

    void onTerminalExit((event) => {
      if (mountedRef.current) {
        if (outputFlushTimer !== undefined) {
          window.clearTimeout(outputFlushTimer);
          flushOutput();
        }
        setSnapshot((current) => applyExitEvent(current, event));
      }
    }).then((unlisten) => {
      if (closed) {
        unlisten();
      } else {
        exitUnlisten = unlisten;
      }
    });

    return () => {
      closed = true;
      mountedRef.current = false;
      window.clearTimeout(refreshTimer);
      if (outputFlushTimer !== undefined) {
        window.clearTimeout(outputFlushTimer);
      }
      outputUnlisten?.();
      exitUnlisten?.();
    };
  }, [refresh]);

  const createSession = useCallback(
    async (cwd?: string | null) => {
      try {
        const session = await createTerminalSession({ cwd });
        if (mountedRef.current) {
          setSnapshot((current) => appendSession(current, session));
          setIssue(null);
        }
        return session;
      } catch (error) {
        const nextIssue = normalizeIssue(error);
        if (mountedRef.current) {
          setIssue(nextIssue);
        }
        throw nextIssue;
      }
    },
    [],
  );

  const closeSession = useCallback(async (sessionId: string) => {
    try {
      const next = await closeTerminalSession(sessionId);
      if (mountedRef.current) {
        setSnapshot(next);
        setIssue(next.issue ?? null);
      }
      return next;
    } catch (error) {
      const nextIssue = normalizeIssue(error);
      if (mountedRef.current) {
        setIssue(nextIssue);
      }
      throw nextIssue;
    }
  }, []);

  return useMemo(
    () => ({
      availability,
      snapshot,
      issue,
      refresh,
      createSession,
      closeSession,
    }),
    [availability, closeSession, createSession, issue, refresh, snapshot],
  );
}

function appendSession(
  snapshot: TerminalSnapshot | null,
  session: TerminalSessionInfo,
): TerminalSnapshot {
  if (!snapshot) {
    return {
      sessions: [session],
    };
  }

  return {
    ...snapshot,
    sessions: [...snapshot.sessions.filter((item) => item.id !== session.id), session],
  };
}

function applyOutputEvents(
  snapshot: TerminalSnapshot | null,
  events: TerminalOutputEvent[],
): TerminalSnapshot | null {
  if (!snapshot) {
    return snapshot;
  }

  const bytesBySessionId = new Map<string, number[]>();
  for (const event of events) {
    const current = bytesBySessionId.get(event.sessionId);
    if (current) {
      current.push(...event.bytes);
    } else {
      bytesBySessionId.set(event.sessionId, [...event.bytes]);
    }
  }

  return {
    ...snapshot,
    sessions: snapshot.sessions.map((session) => {
      const bytes = bytesBySessionId.get(session.id);
      if (!bytes) {
        return session;
      }

      return {
        ...session,
        buffer: appendTrimmedBuffer(session.buffer, bytes),
      };
    }),
  };
}

function applyExitEvent(
  snapshot: TerminalSnapshot | null,
  event: TerminalExitEvent,
): TerminalSnapshot | null {
  if (!snapshot) {
    return snapshot;
  }

  return {
    ...snapshot,
    sessions: snapshot.sessions.map((session) => {
      if (session.id !== event.sessionId) {
        return session;
      }

      return {
        ...session,
        exited: true,
        exitStatus: event.exitStatus,
      };
    }),
  };
}

function appendTrimmedBuffer(buffer: number[], bytes: number[]) {
  const next = buffer.concat(bytes);
  return trimBuffer(next);
}

function trimBuffer(buffer: number[]) {
  if (buffer.length <= OUTPUT_BUFFER_LIMIT) {
    return buffer;
  }

  return buffer.slice(buffer.length - OUTPUT_BUFFER_LIMIT);
}

function normalizeIssue(error: unknown): DesktopTerminalIssue {
  if (typeof error === "object" && error && "message" in error) {
    const maybeIssue = error as Partial<DesktopTerminalIssue>;
    return {
      code: typeof maybeIssue.code === "string" ? maybeIssue.code : "terminal-error",
      message:
        typeof maybeIssue.message === "string"
          ? maybeIssue.message
          : "Terminal action failed.",
      detail: typeof maybeIssue.detail === "string" ? maybeIssue.detail : undefined,
    };
  }

  return {
    code: "terminal-error",
    message: "Terminal action failed.",
    detail: String(error),
  };
}
