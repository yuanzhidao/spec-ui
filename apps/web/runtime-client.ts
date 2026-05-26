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

type RuntimeEndpointConfig = {
  httpBase: string;
  wsBase: string;
};

const DEFAULT_RUNTIME_HTTP = "http://127.0.0.1:4317";
const DEFAULT_RUNTIME_WS = "ws://127.0.0.1:4317";

const defaultRuntimeConfig: RuntimeEndpointConfig = {
  httpBase: browserSafeEnv("NEXT_PUBLIC_SPEC_UI_RUNTIME_HTTP") || DEFAULT_RUNTIME_HTTP,
  wsBase: browserSafeEnv("NEXT_PUBLIC_SPEC_UI_RUNTIME_WS") || DEFAULT_RUNTIME_WS,
};

let runtimeConfigRequest: Promise<RuntimeEndpointConfig> | null = null;

export const webRuntimeClient: RuntimeClient = {
  fetchSnapshot: () => runtimeRequest<RuntimeSnapshot>("/api/snapshot"),
  subscribeSnapshots,
  addProject: (path) =>
    runtimeRequest<RuntimeSnapshot>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  bindProject: (path) =>
    runtimeRequest<RuntimeSnapshot>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  focusProject: (path) =>
    runtimeRequest<RuntimeSnapshot>("/api/projects/focus", {
      method: "PUT",
      body: JSON.stringify({ path }),
    }),
  removeProject: (path) =>
    runtimeRequest<RuntimeSnapshot>(`/api/projects/${encodeURIComponent(path)}`, {
      method: "DELETE",
    }),
  relocateProject: (projectId, path) =>
    runtimeRequest<RuntimeSnapshot>(`/api/projects/${encodeURIComponent(projectId)}/path`, {
      method: "PUT",
      body: JSON.stringify({ path }),
    }),
  updateProjectWorkspaceDirectory: (projectId, path) =>
    runtimeRequest<RuntimeSnapshot>(
      `/api/projects/${encodeURIComponent(projectId)}/workspace-directory`,
      {
        method: "PUT",
        body: JSON.stringify({ path }),
      },
    ),
  updateProjectWorktreesDirectory: (projectId, path) =>
    runtimeRequest<RuntimeSnapshot>(
      `/api/projects/${encodeURIComponent(projectId)}/worktrees-directory`,
      {
        method: "PUT",
        body: JSON.stringify({ path }),
      },
    ),
  addProjectWorktreePath: (projectId, path) =>
    runtimeRequest<RuntimeSnapshot>(
      `/api/projects/${encodeURIComponent(projectId)}/worktrees`,
      {
        method: "POST",
        body: JSON.stringify({ path }),
      },
    ),
  removeProjectWorktreePath: (projectId, path) =>
    runtimeRequest<RuntimeSnapshot>(
      `/api/projects/${encodeURIComponent(projectId)}/worktrees/${encodeURIComponent(path)}`,
      {
        method: "DELETE",
      },
    ),
  clearProjects: () =>
    runtimeRequest<RuntimeSnapshot>("/api/projects", {
      method: "DELETE",
    }),
  clearProject: () =>
    runtimeRequest<RuntimeSnapshot>("/api/projects", {
      method: "DELETE",
    }),
  refreshProject: (projectId) => {
    const path = projectId
      ? `/api/projects/${encodeURIComponent(projectId)}/refresh`
      : "/api/project/refresh";
    return runtimeRequest<RuntimeSnapshot>(path, {
      method: "POST",
    });
  },
  setChangeTaskCompleted: (update) =>
    runtimeRequest<RuntimeSnapshot>("/api/changes/tasks/completion", {
      method: "PUT",
      body: JSON.stringify(update),
    }),
  runValidation: () =>
    runtimeRequest<RuntimeSnapshot>("/api/validation/run", {
      method: "POST",
    }),
  setTheme: (themeMode: ThemeMode) =>
    runtimeRequest<RuntimeSnapshot>("/api/settings/theme", {
      method: "PUT",
      body: JSON.stringify({ themeMode }),
    }),
  setLanguage: (language: LanguageMode) =>
    runtimeRequest<RuntimeSnapshot>("/api/settings/language", {
      method: "PUT",
      body: JSON.stringify({ language }),
    }),
};

async function subscribeSnapshots(
  handler: RuntimeSnapshotHandler,
  setConnection: RuntimeConnectionHandler,
) {
  if (typeof window === "undefined") {
    return null;
  }

  let closed = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleReconnect() {
    if (closed) {
      return;
    }

    setConnection("reconnecting");
    reconnectTimer = setTimeout(() => {
      void connect("reconnecting");
    }, 1200);
  }

  async function connect(nextState: "connecting" | "reconnecting") {
    setConnection(nextState);
    const url = await runtimeWebSocketUrl().catch(() => null);
    if (!url) {
      scheduleReconnect();
      return;
    }

    if (closed) {
      return;
    }

    socket = new WebSocket(url);
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

      if (!closed && message.type === "snapshot") {
        handler(message.payload);
      }
    };
    socket.onclose = () => {
      if (closed) {
        return;
      }

      scheduleReconnect();
    };
    socket.onerror = () => {
      if (!closed) {
        socket?.close();
      }
    };
  }

  void connect("connecting");

  return () => {
    closed = true;
    socket?.close();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    setConnection("disconnected");
  };
}

async function runtimeWebSocketUrl(): Promise<string> {
  const config = await runtimeEndpointConfig();
  return `${config.wsBase}/ws`;
}

async function runtimeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = await runtimeEndpointConfig();
  const response = await fetch(`${config.httpBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Runtime request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function runtimeEndpointConfig(): Promise<RuntimeEndpointConfig> {
  if (!runtimeConfigRequest) {
    runtimeConfigRequest = fetch("/api/runtime-config", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Runtime config request failed with ${response.status}`);
        }

        const config = (await response.json()) as Partial<RuntimeEndpointConfig>;
        if (!config.httpBase || !config.wsBase) {
          throw new Error("Runtime config response is missing runtime endpoints.");
        }

        return {
          httpBase: config.httpBase,
          wsBase: config.wsBase,
        };
      })
      .catch(() => defaultRuntimeConfig);
  }

  return runtimeConfigRequest;
}

function browserSafeEnv(name: string): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }

  return process.env[name];
}
