"use client";

import type { IDisposable } from "@xterm/xterm";
import { AnimatePresence, motion } from "motion/react";
import {
  Maximize2,
  Minus,
  Minimize2,
  Plus,
  SquareTerminal,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  onTerminalOutput,
  resizeTerminalSession,
  writeTerminalSession,
  type DesktopTerminalIssue,
  type TerminalSessionInfo,
} from "@/lib/desktop-terminal";
import { cn } from "@/lib/utils";
import { useTerminalController } from "./use-terminal-controller";

type TerminalUiState = {
  open: boolean;
  minimized: boolean;
  activeSessionId: string | null;
  window: TerminalWindowState;
};

type TerminalWindowMode = "floating" | "fullscreen";

type TerminalWindowState = {
  mode: TerminalWindowMode;
  width: number;
  height: number;
};

const EMPTY_SESSIONS: TerminalSessionInfo[] = [];
const TERMINAL_PANEL_MARGIN = 16;
const TERMINAL_MIN_WIDTH = 520;
const TERMINAL_MIN_HEIGHT = 280;
const TERMINAL_DEFAULT_WIDTH = 1088;
const TERMINAL_DEFAULT_HEIGHT = 480;

type TerminalResizeEdge = "left" | "top" | "top-left";

const terminalUiState: TerminalUiState = {
  open: false,
  minimized: false,
  activeSessionId: null,
  window: getDefaultTerminalWindow(),
};

const terminalTransition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1],
} as const;

const terminalWindowTransition = {
  duration: 0.32,
  ease: [0.16, 1, 0.3, 1],
} as const;

function getDefaultTerminalWindow(): TerminalWindowState {
  return clampTerminalWindow({
    mode: "floating",
    width: TERMINAL_DEFAULT_WIDTH,
    height: TERMINAL_DEFAULT_HEIGHT,
  });
}

function clampTerminalWindow(windowState: TerminalWindowState): TerminalWindowState {
  const limits = getTerminalWindowLimits();
  return {
    ...windowState,
    width: clamp(Math.round(windowState.width), TERMINAL_MIN_WIDTH, limits.width),
    height: clamp(Math.round(windowState.height), TERMINAL_MIN_HEIGHT, limits.height),
  };
}

function getTerminalWindowLimits() {
  const viewport = getViewportSize();

  return {
    width: Math.max(TERMINAL_MIN_WIDTH, viewport.width - TERMINAL_PANEL_MARGIN * 2),
    height: Math.max(TERMINAL_MIN_HEIGHT, viewport.height - TERMINAL_PANEL_MARGIN * 2),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getViewportSize() {
  if (typeof window === "undefined") {
    return {
      width: TERMINAL_DEFAULT_WIDTH + TERMINAL_PANEL_MARGIN * 2,
      height: TERMINAL_DEFAULT_HEIGHT + TERMINAL_PANEL_MARGIN * 2,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function TerminalDock({
  focusedProjectPath,
  projectContextReady,
}: {
  focusedProjectPath: string | null;
  projectContextReady: boolean;
}) {
  const t = useTranslations("terminal");
  const { resolvedTheme } = useTheme();
  const controller = useTerminalController();
  const [open, setOpen] = useState(terminalUiState.open);
  const [minimized, setMinimized] = useState(terminalUiState.minimized);
  const [activeSessionId, setActiveSessionId] = useState(terminalUiState.activeSessionId);
  const [terminalWindow, setTerminalWindow] = useState(terminalUiState.window);
  const [busy, setBusy] = useState(false);
  const [localIssue, setLocalIssue] = useState<DesktopTerminalIssue | null>(null);
  const autoCreatedForOpenRef = useRef(false);
  const fullscreen = terminalWindow.mode === "fullscreen";

  const sessions = useMemo(
    () => controller.snapshot?.sessions ?? EMPTY_SESSIONS,
    [controller.snapshot?.sessions],
  );
  const issue = localIssue ?? controller.issue;
  const resolvedActiveSessionId =
    activeSessionId && sessions.some((session) => session.id === activeSessionId)
      ? activeSessionId
      : sessions[0]?.id ?? null;
  const activeSession =
    sessions.find((session) => session.id === resolvedActiveSessionId) ?? null;
  const createDisabled = busy || !projectContextReady;

  useEffect(() => {
    terminalUiState.open = open;
    terminalUiState.minimized = minimized;
    terminalUiState.activeSessionId = activeSessionId;
    terminalUiState.window = terminalWindow;
  }, [activeSessionId, minimized, open, terminalWindow]);

  useEffect(() => {
    if (!open) {
      autoCreatedForOpenRef.current = false;
    }
  }, [open]);

  const handleCreateSession = useCallback(async () => {
    if (!projectContextReady) {
      return null;
    }

    setBusy(true);
    setLocalIssue(null);
    try {
      const session = await controller.createSession(focusedProjectPath);
      setActiveSessionId(session.id);
      setOpen(true);
      setMinimized(false);
      return session;
    } catch (error) {
      setLocalIssue(normalizeIssue(error));
      return null;
    } finally {
      setBusy(false);
    }
  }, [controller, focusedProjectPath, projectContextReady]);

  const handleCloseSession = useCallback(
    async (sessionId: string) => {
      setBusy(true);
      setLocalIssue(null);
      try {
        const next = await controller.closeSession(sessionId);
        const remaining = next.sessions.filter((session) => session.id !== sessionId);
        setActiveSessionId((current) =>
          current === sessionId ? remaining[0]?.id ?? null : current,
        );
      } catch (error) {
        setLocalIssue(normalizeIssue(error));
      } finally {
        setBusy(false);
      }
    },
    [controller],
  );

  const handleResizeStart = useCallback(
    (edge: TerminalResizeEdge, event: ReactPointerEvent<HTMLDivElement>) => {
      if (terminalWindow.mode === "fullscreen") {
        return;
      }

      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startWindow = terminalWindow;
      const cursor =
        edge === "left" ? "col-resize" : edge === "top" ? "row-resize" : "nwse-resize";
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      document.body.style.cursor = cursor;
      document.body.style.userSelect = "none";

      const handleMove = (moveEvent: PointerEvent) => {
        const next = {
          mode: "floating" as const,
          width: edge.includes("left")
            ? startWindow.width + startX - moveEvent.clientX
            : startWindow.width,
          height: edge.includes("top")
            ? startWindow.height + startY - moveEvent.clientY
            : startWindow.height,
        };
        setTerminalWindow(clampTerminalWindow(next));
      };

      const handleEnd = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleEnd);
        window.removeEventListener("pointercancel", handleEnd);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleEnd, { once: true });
      window.addEventListener("pointercancel", handleEnd, { once: true });
    },
    [terminalWindow],
  );

  useEffect(() => {
    const handleViewportResize = () => {
      setTerminalWindow((current) =>
        current.mode === "floating" ? clampTerminalWindow(current) : current,
      );
    };

    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  useEffect(() => {
    if (
      !open ||
      minimized ||
      controller.availability !== "desktop" ||
      !projectContextReady ||
      sessions.length > 0 ||
      autoCreatedForOpenRef.current
    ) {
      return;
    }

    autoCreatedForOpenRef.current = true;
    void handleCreateSession();
  }, [
    controller.availability,
    handleCreateSession,
    minimized,
    open,
    projectContextReady,
    sessions.length,
  ]);

  if (controller.availability !== "desktop") {
    return null;
  }

  const viewport = getViewportSize();
  const panelGeometry = fullscreen
    ? {
        top: TERMINAL_PANEL_MARGIN,
        right: TERMINAL_PANEL_MARGIN,
        bottom: TERMINAL_PANEL_MARGIN,
        left: TERMINAL_PANEL_MARGIN,
        width: "auto",
        height: "auto",
      }
    : {
        top: viewport.height - TERMINAL_PANEL_MARGIN - terminalWindow.height,
        right: TERMINAL_PANEL_MARGIN,
        bottom: TERMINAL_PANEL_MARGIN,
        left: viewport.width - TERMINAL_PANEL_MARGIN - terminalWindow.width,
        width: terminalWindow.width,
        height: terminalWindow.height,
      };

  const panelStyle: CSSProperties = {
    width: terminalWindow.width,
    height: terminalWindow.height,
  };

  return (
    <>
      <AnimatePresence initial={false}>
        {open && !minimized ? (
          <motion.section
            key="terminal-panel"
            initial={{
              opacity: 0,
              y: 18,
              scale: 0.98,
              ...panelGeometry,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              borderRadius: fullscreen ? 10 : 8,
              ...panelGeometry,
            }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={terminalWindowTransition}
            style={panelStyle}
            className={cn(
              "fixed z-40 flex flex-col overflow-hidden rounded-lg border bg-background shadow-2xl shadow-black/20",
            )}
          >
            {!fullscreen ? <TerminalResizeHandles onResizeStart={handleResizeStart} /> : null}
            <div className="flex h-10 shrink-0 items-center gap-2 border-b bg-muted/40 px-2">
              <SquareTerminal className="size-4 shrink-0 text-muted-foreground" />
              <div
                role="tablist"
                aria-label={t("tabs")}
                className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
              >
                {sessions.map((session) => (
                  <TerminalTab
                    key={session.id}
                    session={session}
                    active={session.id === resolvedActiveSessionId}
                    disabled={busy}
                    onSelect={() => setActiveSessionId(session.id)}
                    onClose={() => void handleCloseSession(session.id)}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void handleCreateSession()}
                disabled={createDisabled}
                aria-label={t("new")}
                title={t("new")}
              >
                <Plus className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setTerminalWindow((current) => ({
                    ...current,
                    mode: current.mode === "fullscreen" ? "floating" : "fullscreen",
                  }))
                }
                aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
                title={fullscreen ? t("exitFullscreen") : t("fullscreen")}
              >
                {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setMinimized(true)}
                aria-label={t("minimize")}
                title={t("minimize")}
              >
                <Minus className="size-4" />
              </Button>
            </div>
            {issue ? <TerminalIssueBanner issue={issue} /> : null}
            {activeSession ? (
              <TerminalScreen
                key={`${activeSession.id}:${resolvedTheme || "system"}`}
                session={activeSession}
                themeMode={resolvedTheme || "light"}
                onIssue={setLocalIssue}
              />
            ) : (
              <TerminalEmptyState
                createDisabled={createDisabled}
                projectContextReady={projectContextReady}
                onCreate={() => void handleCreateSession()}
              />
            )}
          </motion.section>
        ) : null}
      </AnimatePresence>

      <motion.div
        className="fixed right-4 bottom-4 z-40"
        layout
        transition={terminalTransition}
      >
        {open && minimized ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2 rounded-full bg-background px-3 shadow-lg shadow-black/10"
            onClick={() => {
              setOpen(true);
              setMinimized(false);
            }}
          >
            <SquareTerminal className="size-4" />
            <span className="max-w-48 truncate text-xs">
              {activeSession?.label || t("title")}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {sessions.length}
            </span>
          </Button>
        ) : !open ? (
          <Button
            type="button"
            className="size-10 rounded-full shadow-lg shadow-black/15"
            onClick={() => {
              setOpen(true);
              setMinimized(false);
            }}
            aria-label={t("launcher")}
            title={t("launcher")}
          >
            <SquareTerminal className="size-4" />
          </Button>
        ) : null}
      </motion.div>
    </>
  );
}

function TerminalResizeHandles({
  onResizeStart,
}: {
  onResizeStart: (edge: TerminalResizeEdge, event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-x-4 top-0 z-10 h-3 cursor-row-resize before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-transparent before:transition-colors hover:before:bg-foreground/15"
        onPointerDown={(event) => onResizeStart("top", event)}
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-4 left-0 z-10 w-3 cursor-col-resize before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-transparent before:transition-colors hover:before:bg-foreground/15"
        onPointerDown={(event) => onResizeStart("left", event)}
      />
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 z-20 size-4 cursor-nwse-resize rounded-br-sm"
        onPointerDown={(event) => onResizeStart("top-left", event)}
      />
    </>
  );
}

function TerminalTab({
  session,
  active,
  disabled,
  onSelect,
  onClose,
}: {
  session: TerminalSessionInfo;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex h-7 min-w-28 max-w-52 items-center rounded-md border px-1.5 text-xs transition-colors",
        active
          ? "border-border bg-background text-foreground"
          : "border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground",
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active}
        className="min-w-0 flex-1 truncate text-left"
        onClick={onSelect}
      >
        {session.label}
      </button>
      {session.exited ? (
        <span className="ml-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
      ) : null}
      <button
        type="button"
        className="ml-1 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/40"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function TerminalIssueBanner({ issue }: { issue: DesktopTerminalIssue }) {
  return (
    <div className="shrink-0 border-b bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <div className="font-medium">{issue.message}</div>
      {issue.detail ? (
        <div className="mt-0.5 truncate text-destructive/75">{issue.detail}</div>
      ) : null}
    </div>
  );
}

function TerminalEmptyState({
  createDisabled,
  projectContextReady,
  onCreate,
}: {
  createDisabled: boolean;
  projectContextReady: boolean;
  onCreate: () => void;
}) {
  const t = useTranslations("terminal");

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/20 px-6 text-center">
      <div className="max-w-sm">
        <SquareTerminal className="mx-auto mb-3 size-7 text-muted-foreground" />
        <h2 className="text-sm font-medium">{t("emptyTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {projectContextReady ? t("emptyDescription") : t("contextLoading")}
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-4"
          disabled={createDisabled}
          onClick={onCreate}
        >
          <Plus className="size-3.5" />
          {t("new")}
        </Button>
      </div>
    </div>
  );
}

function TerminalScreen({
  session,
  themeMode,
  onIssue,
}: {
  session: TerminalSessionInfo;
  themeMode: string;
  onIssue: (issue: DesktopTerminalIssue | null) => void;
}) {
  const t = useTranslations("terminal");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const decoderRef = useRef(new TextDecoder());
  const initialBufferRef = useRef(session.buffer);

  const sessionMeta = useMemo(
    () => ({
      cwd: session.cwd,
      shell: session.shellPath.split(/[\\/]/).pop() || session.shellPath,
    }),
    [session.cwd, session.shellPath],
  );

  useEffect(() => {
    initialBufferRef.current = session.buffer;
  }, [session.id, session.buffer]);

  useEffect(() => {
    let disposed = false;
    let inputDisposable: IDisposable | undefined;
    let terminalDisposable: IDisposable | undefined;
    let outputUnlisten: (() => void) | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let resizeFrame = 0;

    async function mountTerminal() {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);

      if (disposed || !containerRef.current) {
        return;
      }

      const computed = getComputedStyle(document.documentElement);
      const terminal = new Terminal({
        allowProposedApi: false,
        convertEol: true,
        cursorBlink: true,
        fontFamily:
          "'SF Mono', 'SFMono-Regular', Menlo, Monaco, 'Cascadia Mono', Consolas, 'Liberation Mono', monospace",
        fontSize: 12,
        letterSpacing: 0,
        lineHeight: 1.08,
        scrollback: 2000,
        theme: {
          background: computed.getPropertyValue("--background").trim(),
          foreground: computed.getPropertyValue("--foreground").trim(),
          cursor: computed.getPropertyValue("--foreground").trim(),
          selectionBackground: "rgba(120, 120, 120, 0.28)",
        },
      });
      const fitAddon = new FitAddon();

      terminal.loadAddon(fitAddon);
      terminalDisposable = terminal;
      terminal.open(containerRef.current);
      terminal.write(decodeBytes(initialBufferRef.current, decoderRef.current));
      inputDisposable = terminal.onData((data) => {
        void writeTerminalSession(session.id, data).catch((error) => {
          onIssue(normalizeIssue(error));
        });
      });

      const fitAndResize = () => {
        if (disposed || !containerRef.current) {
          return;
        }

        try {
          fitAddon.fit();
          void resizeTerminalSession(session.id, terminal.rows, terminal.cols).catch((error) => {
            onIssue(normalizeIssue(error));
          });
        } catch (error) {
          onIssue(normalizeIssue(error));
        }
      };

      const scheduleFit = () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(fitAndResize);
      };

      resizeObserver = new ResizeObserver(scheduleFit);
      resizeObserver.observe(containerRef.current);
      scheduleFit();

      const unlisten = await onTerminalOutput((event) => {
        if (!disposed && event.sessionId === session.id) {
          terminal.write(decodeBytes(event.bytes, decoderRef.current));
        }
      });
      if (disposed) {
        unlisten();
      } else {
        outputUnlisten = unlisten;
      }
    }

    void mountTerminal();

    return () => {
      disposed = true;
      cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      outputUnlisten?.();
      inputDisposable?.dispose();
      terminalDisposable?.dispose();
    };
  }, [onIssue, session.id, themeMode]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex h-7 shrink-0 items-center justify-between gap-3 border-b px-3 text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate">{sessionMeta.cwd}</span>
        <span className="shrink-0">
          {session.exited ? session.exitStatus || t("exited") : sessionMeta.shell}
        </span>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 px-2 py-1.5" />
    </div>
  );
}

function decodeBytes(bytes: number[], decoder: TextDecoder) {
  return decoder.decode(new Uint8Array(bytes), { stream: true });
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
