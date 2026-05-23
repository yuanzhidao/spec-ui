import { access, readFile, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import fastGlob from "fast-glob";
import ignore from "ignore";
import type {
  DiscoveryFlags,
  ProjectBinding,
  RuntimeIssue,
  SpecScope,
  SpecDialect,
} from "@/lib/dashboard-types";

export type ProjectDiscoveryResult =
  | { ok: true; binding: ProjectBinding; issue?: RuntimeIssue }
  | { ok: false; issue: RuntimeIssue };

export function expandProjectPath(input: string): string {
  if (input === "~" || input.startsWith("~/")) {
    const home = process.env.HOME;
    return home ? path.join(home, input.slice(2)) : input;
  }

  return input;
}

export async function discoverProject(input: string): Promise<ProjectDiscoveryResult> {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      ok: false,
      issue: {
        code: "missing-path",
        message: "Enter a local project directory path.",
      },
    };
  }

  const projectPath = path.resolve(expandProjectPath(trimmed));

  try {
    const fileStat = await stat(projectPath);
    if (!fileStat.isDirectory()) {
      return {
        ok: false,
        issue: {
          code: "not-directory",
          message: "The selected path is not a directory.",
          detail: projectPath,
        },
      };
    }

    await access(projectPath, constants.R_OK);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      ok: false,
      issue: {
        code: code === "ENOENT" ? "invalid-path" : "unreadable-path",
        message:
          code === "ENOENT"
            ? "The selected directory does not exist."
            : "The selected directory is not readable.",
        detail: projectPath,
      },
    };
  }

  const discovery = await detectOpenSpec(projectPath);
  const dialect = resolveDialect(discovery);
  const name = path.basename(projectPath) || projectPath;

  return {
    ok: true,
    binding: {
      id: "",
      path: projectPath,
      name,
      dialect,
      discovery,
    },
    issue:
      dialect === "none"
        ? {
            code: "unsupported-dialect",
            message: "No supported spec structure was detected.",
            detail: "The directory is readable and remains bound as a blank project.",
          }
        : undefined,
  };
}

async function detectOpenSpec(projectPath: string): Promise<DiscoveryFlags> {
  const scopes = await discoverOpenSpecScopes(projectPath);
  const scopeFlags = await Promise.all(
    scopes.map((scope) => detectScopeOpenSpec(projectPath, scope)),
  );
  const hasOpenSpecDir = scopes.length > 0;

  if (!hasOpenSpecDir) {
    return {
      hasOpenSpecDir: false,
      hasConfig: false,
      hasSpecsDir: false,
      hasChangesDir: false,
      isEmptyOpenSpec: false,
      scopes: [],
    };
  }

  return {
    hasOpenSpecDir,
    hasConfig: scopeFlags.some((flags) => flags.hasConfig),
    hasSpecsDir: scopeFlags.some((flags) => flags.hasSpecsDir),
    hasChangesDir: scopeFlags.some((flags) => flags.hasChangesDir),
    isEmptyOpenSpec: scopeFlags.some((flags) => flags.isEmptyOpenSpec),
    scopes,
  };
}

async function detectScopeOpenSpec(
  projectPath: string,
  scope: SpecScope,
): Promise<Omit<DiscoveryFlags, "hasOpenSpecDir" | "scopes">> {
  const openspecDir = path.join(projectPath, scope.path, "openspec");
  const [hasConfig, hasSpecsDir, hasChangesDir, entries] = await Promise.all([
    isFile(path.join(openspecDir, "config.yaml")),
    isDirectory(path.join(openspecDir, "specs")),
    isDirectory(path.join(openspecDir, "changes")),
    readdir(openspecDir).catch(() => []),
  ]);

  return {
    hasConfig,
    hasSpecsDir,
    hasChangesDir,
    isEmptyOpenSpec: entries.length === 0,
  };
}

async function discoverOpenSpecScopes(projectPath: string): Promise<SpecScope[]> {
  const gitignoreRules = await readGitignoreRules(projectPath);
  const matches = await fastGlob(["openspec", "**/openspec"], {
    cwd: projectPath,
    onlyDirectories: true,
    onlyFiles: false,
    dot: true,
    followSymbolicLinks: false,
    suppressErrors: true,
    ignore: [
      ...builtInScopeIgnorePatterns,
      ...gitignoreRules.flatMap((rule) => rule.globPatterns),
    ],
  });

  const scopes = matches
    .filter((match) => !isIgnoredByGitignore(match, gitignoreRules))
    .map((match) => scopeFromOpenSpecMatch(match))
    .filter((scope): scope is SpecScope => Boolean(scope));

  return uniqueScopes(scopes).sort(compareScopes);
}

const builtInIgnorePatterns = [
  "**/.git/**",
  "**/node_modules/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.turbo/**",
  "**/.worktree/**",
  "**/.worktrees/**",
];

const builtInScopeIgnorePatterns = [
  ...builtInIgnorePatterns,
  "**/.*/**",
];

type GitignoreRuleSet = {
  basePath: string;
  matcher: ReturnType<typeof ignore>;
  globPatterns: string[];
};

export async function projectWatcherIgnorePatterns(projectPath: string): Promise<string[]> {
  const rules = await readGitignoreRules(projectPath);
  return [
    ...builtInScopeIgnorePatterns,
    ...rules.flatMap((rule) => rule.globPatterns),
  ];
}

async function readGitignoreRules(projectPath: string): Promise<GitignoreRuleSet[]> {
  const ignoreFiles = await fastGlob([".gitignore", "**/.gitignore"], {
    cwd: projectPath,
    onlyFiles: true,
    dot: true,
    followSymbolicLinks: false,
    suppressErrors: true,
    ignore: builtInIgnorePatterns,
  });
  const rules = await Promise.all(
    ignoreFiles.map(async (ignoreFile): Promise<GitignoreRuleSet | null> => {
      try {
        const content = await readFile(path.join(projectPath, ignoreFile), "utf8");
        return {
          basePath: path.posix.dirname(ignoreFile) === "." ? "" : path.posix.dirname(ignoreFile),
          matcher: ignore().add(content),
          globPatterns: gitignoreContentToGlobPatterns(
            content,
            path.posix.dirname(ignoreFile) === "." ? "" : path.posix.dirname(ignoreFile),
          ),
        };
      } catch {
        return null;
      }
    }),
  );

  return rules.filter((rule): rule is GitignoreRuleSet => Boolean(rule));
}

function isIgnoredByGitignore(
  relativePath: string,
  rules: GitignoreRuleSet[],
): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  return rules.some((rule) => {
    if (rule.basePath && normalized !== rule.basePath && !normalized.startsWith(`${rule.basePath}/`)) {
      return false;
    }

    const target = rule.basePath
      ? normalized.slice(rule.basePath.length + 1)
      : normalized;

    return Boolean(target) && rule.matcher.ignores(target);
  });
}

function gitignoreContentToGlobPatterns(content: string, basePath: string): string[] {
  const rawLines = content.split(/\r?\n/);
  if (rawLines.some((line) => line.trim().startsWith("!"))) {
    return [];
  }

  return rawLines.flatMap((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      return [];
    }

    return gitignorePatternToGlobPatterns(line, basePath);
  });
}

function gitignorePatternToGlobPatterns(pattern: string, basePath: string): string[] {
  const directoryPattern = pattern.endsWith("/");
  const normalized = pattern
    .replace(/^\/+/, "")
    .replace(/\/+$/g, "");

  if (!normalized) {
    return [];
  }

  if (normalized.includes("/")) {
    const scoped = joinGitignoreBase(basePath, normalized);
    return directoryPattern ? [scoped, `${scoped}/**`] : [scoped];
  }

  const direct = joinGitignoreBase(basePath, normalized);
  const nested = joinGitignoreBase(basePath, `**/${normalized}`);
  return [direct, `${direct}/**`, nested, `${nested}/**`];
}

function joinGitignoreBase(basePath: string, pattern: string): string {
  return basePath ? `${basePath}/${pattern}` : pattern;
}

function scopeFromOpenSpecMatch(match: string): SpecScope | null {
  const normalized = match.replaceAll("\\", "/").replace(/\/+$/g, "");
  if (normalized !== "openspec" && !normalized.endsWith("/openspec")) {
    return null;
  }

  const scopePath = normalized === "openspec" ? "" : normalized.slice(0, -"/openspec".length);
  const label = scopePath || "root";

  return {
    id: scopeIdFromPath(scopePath),
    label,
    path: scopePath,
  };
}

function uniqueScopes(scopes: SpecScope[]): SpecScope[] {
  return Array.from(new Map(scopes.map((scope) => [scope.path, scope])).values());
}

function compareScopes(first: SpecScope, second: SpecScope): number {
  if (first.path === second.path) {
    return 0;
  }
  if (first.path === "") {
    return -1;
  }
  if (second.path === "") {
    return 1;
  }
  return first.path.localeCompare(second.path, undefined, {
    numeric: true,
    sensitivity: "base",
  });
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

function resolveDialect(discovery: DiscoveryFlags): SpecDialect {
  if (!discovery.hasOpenSpecDir) {
    return "none";
  }

  if (
    discovery.hasConfig ||
    discovery.hasSpecsDir ||
    discovery.hasChangesDir ||
    discovery.isEmptyOpenSpec
  ) {
    return "openspec";
  }

  return "unsupported";
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}
