import type { LanguageMode, RuntimeSnapshot, ThemeMode } from "@/lib/dashboard-types";

const runtimeHttpBase =
  process.env.NEXT_PUBLIC_SPEC_UI_RUNTIME_HTTP || "http://127.0.0.1:4317";

const runtimeWsBase =
  process.env.NEXT_PUBLIC_SPEC_UI_RUNTIME_WS || "ws://127.0.0.1:4317";

export function runtimeWebSocketUrl(): string {
  return `${runtimeWsBase}/ws`;
}

export async function fetchSnapshot(): Promise<RuntimeSnapshot> {
  return runtimeRequest<RuntimeSnapshot>("/api/snapshot");
}

export async function bindProject(path: string): Promise<RuntimeSnapshot> {
  return addProject(path);
}

export async function addProject(path: string): Promise<RuntimeSnapshot> {
  return runtimeRequest<RuntimeSnapshot>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ path }),
  });
}

export async function clearProject(): Promise<RuntimeSnapshot> {
  return clearProjects();
}

export async function focusProject(path: string | null): Promise<RuntimeSnapshot> {
  return runtimeRequest<RuntimeSnapshot>("/api/projects/focus", {
    method: "PUT",
    body: JSON.stringify({ path }),
  });
}

export async function removeProject(path: string): Promise<RuntimeSnapshot> {
  return runtimeRequest<RuntimeSnapshot>(`/api/projects/${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
}

export async function relocateProject(
  projectId: string,
  path: string,
): Promise<RuntimeSnapshot> {
  return runtimeRequest<RuntimeSnapshot>(`/api/projects/${encodeURIComponent(projectId)}/path`, {
    method: "PUT",
    body: JSON.stringify({ path }),
  });
}

export async function clearProjects(): Promise<RuntimeSnapshot> {
  return runtimeRequest<RuntimeSnapshot>("/api/projects", {
    method: "DELETE",
  });
}

export async function refreshProject(): Promise<RuntimeSnapshot> {
  return runtimeRequest<RuntimeSnapshot>("/api/project/refresh", {
    method: "POST",
  });
}

export async function runValidation(): Promise<RuntimeSnapshot> {
  return runtimeRequest<RuntimeSnapshot>("/api/validation/run", {
    method: "POST",
  });
}

export async function setRuntimeTheme(themeMode: ThemeMode): Promise<RuntimeSnapshot> {
  return runtimeRequest<RuntimeSnapshot>("/api/settings/theme", {
    method: "PUT",
    body: JSON.stringify({ themeMode }),
  });
}

export async function setRuntimeLanguage(
  language: LanguageMode,
): Promise<RuntimeSnapshot> {
  return runtimeRequest<RuntimeSnapshot>("/api/settings/language", {
    method: "PUT",
    body: JSON.stringify({ language }),
  });
}

async function runtimeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${runtimeHttpBase}${path}`, {
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
