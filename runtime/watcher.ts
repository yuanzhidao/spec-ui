import path from "node:path";
import watcher from "@parcel/watcher";
import type { ProjectBinding, ProjectEvent } from "@/lib/dashboard-types";
import { projectWatcherIgnorePatterns } from "./project";

type Subscription = Awaited<ReturnType<typeof watcher.subscribe>>;

export class ProjectWatcher {
  private subscription: Subscription | null = null;

  async start(
    binding: ProjectBinding,
    onEvent: (event: ProjectEvent) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    await this.stop();

    if (binding.dialect !== "openspec") {
      return;
    }

    const ignore = await projectWatcherIgnorePatterns(binding.path);

    this.subscription = await watcher.subscribe(
      binding.path,
      (error, events) => {
        if (error) {
          onError(error);
          return;
        }

        for (const event of events) {
          const normalized = normalizeWatcherEvent(binding, event.path, event.type);
          if (normalized) {
            onEvent(normalized);
          }
        }
      },
      { ignore },
    );
  }

  async stop(): Promise<void> {
    if (!this.subscription) {
      return;
    }

    await this.subscription.unsubscribe();
    this.subscription = null;
  }
}

export function normalizeWatcherEvent(
  binding: ProjectBinding,
  filePath: string,
  eventType: ProjectEvent["eventType"],
): ProjectEvent | null {
  const relativePath = path.relative(binding.path, filePath);
  const normalized = relativePath.split(path.sep).join("/");
  const scope = scopeForRelativePath(binding, normalized);

  if (!scope) {
    const discoveredScope = scopeFromOpenSpecDirectory(normalized);
    if (discoveredScope) {
      return {
        projectPath: binding.path,
        dialect: binding.dialect,
        eventType,
        filePath,
        timestamp: new Date().toISOString(),
        scopeId: discoveredScope.id,
        scopeLabel: discoveredScope.label,
        scopePath: discoveredScope.path,
      };
    }

    return null;
  }

  const scopedPath = pathInScope(normalized, scope.path);
  if (!isRelevantOpenSpecPath(scopedPath)) {
    return null;
  }

  return {
    projectPath: binding.path,
    dialect: binding.dialect,
    eventType,
    filePath,
    timestamp: new Date().toISOString(),
    entityId: entityIdFromPath(scopedPath),
    scopeId: scope.id,
    scopeLabel: scope.label,
    scopePath: scope.path,
  };
}

function isRelevantOpenSpecPath(relativePath: string): boolean {
  return (
    relativePath === "openspec" ||
    relativePath.startsWith("openspec/changes/") ||
    relativePath.startsWith("openspec/specs/") ||
    relativePath === "openspec/config.yaml"
  );
}

function entityIdFromPath(relativePath: string): string | undefined {
  const parts = relativePath.split("/");

  if (parts[1] === "changes" && parts[2]) {
    return parts[2];
  }

  if (parts[1] === "specs" && parts[2]) {
    return parts[2];
  }

  return undefined;
}

function scopeForRelativePath(binding: ProjectBinding, relativePath: string) {
  return [...binding.discovery.scopes]
    .sort((first, second) => second.path.length - first.path.length)
    .find((scope) => {
      const prefix = scope.path ? `${scope.path}/openspec` : "openspec";
      return relativePath === prefix || relativePath.startsWith(`${prefix}/`);
    });
}

function pathInScope(relativePath: string, scopePath: string): string {
  return scopePath ? relativePath.slice(scopePath.length + 1) : relativePath;
}

function scopeFromOpenSpecDirectory(relativePath: string) {
  if (relativePath !== "openspec" && !relativePath.endsWith("/openspec")) {
    return null;
  }

  const scopePath = relativePath === "openspec" ? "" : relativePath.slice(0, -"/openspec".length);
  const label = scopePath || "root";
  return {
    id: scopeIdFromPath(scopePath),
    label,
    path: scopePath,
  };
}

function scopeIdFromPath(scopePath: string): string {
  if (!scopePath) {
    return "root";
  }

  return scopePath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
