import { watch, type FSWatcher } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { expandProjectPath } from "./project";

type WorktreesDirectoryWatcherOptions = {
  debounceMs?: number;
  pollMs?: number;
};

type WatchCallback = () => void | Promise<void>;

export class WorktreesDirectoryWatcher {
  private watcher: FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private directorySignature: string | null = null;
  private readonly debounceMs: number;
  private readonly pollMs: number;

  constructor(options: WorktreesDirectoryWatcherOptions = {}) {
    this.debounceMs = options.debounceMs ?? 600;
    this.pollMs = options.pollMs ?? 2_000;
  }

  async start(
    directoryPath: string,
    onChange: WatchCallback,
    onError: (error: Error) => void,
  ): Promise<void> {
    await this.stop();

    const targetPath = normalizeLocalPath(directoryPath);
    await this.startPolling(targetPath, onChange, onError);

    const watchRoot = await watchRootForTarget(targetPath);
    if (!watchRoot) {
      return;
    }

    try {
      this.watcher = watch(watchRoot, { persistent: true }, (_eventType, filename) => {
        if (!isRelevantDirectoryChange(targetPath, watchRoot, filename)) {
          return;
        }

        this.schedule(onChange, onError);
      });
      this.watcher.on("error", () => {
        this.watcher?.close();
        this.watcher = null;
      });
    } catch {
      this.watcher = null;
    }
  }

  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.directorySignature = null;

    if (!this.watcher) {
      return;
    }

    this.watcher.close();
    this.watcher = null;
  }

  private schedule(onChange: WatchCallback, onError: (error: Error) => void): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void runCallback(onChange, onError);
    }, this.debounceMs);
  }

  private async startPolling(
    targetPath: string,
    onChange: WatchCallback,
    onError: (error: Error) => void,
  ): Promise<void> {
    this.directorySignature = await directorySignature(targetPath);
    this.pollTimer = setInterval(() => {
      void this.poll(targetPath, onChange, onError);
    }, this.pollMs);
  }

  private async poll(
    targetPath: string,
    onChange: WatchCallback,
    onError: (error: Error) => void,
  ): Promise<void> {
    const nextSignature = await directorySignature(targetPath);
    if (this.directorySignature === nextSignature) {
      return;
    }

    this.directorySignature = nextSignature;
    this.schedule(onChange, onError);
  }
}

async function runCallback(
  onChange: WatchCallback,
  onError: (error: Error) => void,
): Promise<void> {
  try {
    await onChange();
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

function normalizeLocalPath(input: string): string {
  return path.resolve(expandProjectPath(input.trim()));
}

async function watchRootForTarget(targetPath: string): Promise<string | null> {
  if (await isDirectory(targetPath)) {
    return targetPath;
  }

  const parent = path.dirname(targetPath);
  if (parent === targetPath) {
    return null;
  }

  return await isDirectory(parent) ? parent : null;
}

async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    return (await stat(targetPath)).isDirectory();
  } catch {
    return false;
  }
}

async function directorySignature(targetPath: string): Promise<string> {
  let entries;
  try {
    entries = await readdir(targetPath, { withFileTypes: true });
  } catch (error) {
    return `error:${(error as NodeJS.ErrnoException).code || "unknown"}`;
  }

  const directories = entries.filter((entry) => entry.isDirectory());
  const signatures = await Promise.all(
    directories.map(async (entry) => {
      const entryPath = path.join(targetPath, entry.name);
      const entryStat = await stat(entryPath).catch(() => null);
      return `${entry.name}:${entryStat?.mtimeMs ?? 0}`;
    }),
  );

  return signatures.sort().join("\n");
}

function isRelevantDirectoryChange(
  targetPath: string,
  watchRoot: string,
  filename: string | Buffer | null,
): boolean {
  if (watchRoot === targetPath || !filename) {
    return true;
  }

  const changedPath = path.resolve(watchRoot, filename.toString());
  return targetPath === changedPath || targetPath.startsWith(`${changedPath}${path.sep}`);
}
