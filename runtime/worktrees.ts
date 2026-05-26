import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type {
  ProjectBinding,
  ProjectCheckout,
  ProjectCheckoutSource,
  RuntimeIssue,
  RuntimeProjectSetting,
} from "@spec-ui/core/dashboard/types";
import { discoverProject, expandProjectPath } from "./project";

const execFileAsync = promisify(execFile);

type GitInfo = {
  commonDir: string;
  branch?: string;
};

export async function primaryCheckoutFromBinding(
  binding: ProjectBinding,
): Promise<ProjectCheckout> {
  const gitInfo = await gitInfoForPath(binding.path).catch(() => null);

  return {
    id: "primary",
    kind: "primary",
    source: "primary",
    path: binding.path,
    label: gitInfo?.branch || path.basename(binding.path) || "primary",
    branch: gitInfo?.branch,
    dialect: binding.dialect,
    discovery: binding.discovery,
  };
}

export async function discoverWorktreeCheckouts(
  setting: RuntimeProjectSetting,
  primary: ProjectBinding,
): Promise<{ checkouts: ProjectCheckout[]; issues: RuntimeIssue[] }> {
  const candidates = await worktreeCandidateSources(setting);
  const sources = candidates.sources;
  if (sources.length === 0) {
    return { checkouts: [], issues: candidates.issues };
  }

  const primaryGitInfo = await gitInfoForPath(primary.path).catch(() => null);
  if (!primaryGitInfo) {
    return {
      checkouts: [],
      issues: [
        ...candidates.issues,
        {
          code: "worktree-error",
          message: "Worktree discovery requires the primary project to be a git working tree.",
          detail: primary.path,
        },
      ],
    };
  }

  const seen = new Set([primary.path]);
  const checkouts: ProjectCheckout[] = [];
  const issues: RuntimeIssue[] = [...candidates.issues];

  for (const source of sources) {
    const candidatePath = normalizeLocalPath(source.path);
    if (seen.has(candidatePath)) {
      continue;
    }
    seen.add(candidatePath);

    const candidate = await validateCandidate(candidatePath, primaryGitInfo, source.source);
    if (!candidate.valid) {
      if (source.source === "manual") {
        issues.push(candidate.issue);
      }
      continue;
    }

    const project = await discoverProject(candidatePath);
    if (!project.ok) {
      if (source.source === "manual") {
        issues.push(project.issue);
      }
      continue;
    }

    const branch = candidate.gitInfo.branch;
    checkouts.push({
      id: checkoutId(candidatePath),
      kind: "worktree",
      source: source.source,
      path: candidatePath,
      label: branch || path.basename(candidatePath) || "worktree",
      branch,
      dialect: project.binding.dialect,
      discovery: project.binding.discovery,
      issue: project.issue,
    });
  }

  return { checkouts, issues };
}

async function worktreeCandidateSources(
  setting: RuntimeProjectSetting,
): Promise<{
  sources: Array<{ path: string; source: ProjectCheckoutSource }>;
  issues: RuntimeIssue[];
}> {
  const sources = (setting.worktreePaths || []).map((worktreePath) => ({
    path: worktreePath,
    source: "manual" as const,
  }));

  if (!setting.worktreesPath) {
    return { sources, issues: [] };
  }

  const worktreesPath = normalizeLocalPath(setting.worktreesPath);
  let entries;
  try {
    entries = await readdir(worktreesPath, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      sources,
      issues: [
        {
          code: "worktree-error",
          message:
            code === "ENOENT"
              ? "The saved worktrees directory does not exist."
              : "The saved worktrees directory is not readable.",
          detail: worktreesPath,
        },
      ],
    };
  }

  return {
    sources: [
      ...sources,
      ...entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          path: path.join(worktreesPath, entry.name),
          source: "worktrees-directory" as const,
        })),
    ],
    issues: [],
  };
}

async function validateCandidate(
  candidatePath: string,
  primaryGitInfo: GitInfo,
  source: ProjectCheckoutSource,
): Promise<
  | { valid: true; gitInfo: GitInfo }
  | { valid: false; issue: RuntimeIssue }
> {
  try {
    const fileStat = await stat(candidatePath);
    if (!fileStat.isDirectory()) {
      return invalidCandidate("The saved worktree path is not a directory.", candidatePath);
    }
    await access(candidatePath, constants.R_OK);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return invalidCandidate(
      code === "ENOENT"
        ? "The saved worktree path does not exist."
        : "The saved worktree path is not readable.",
      candidatePath,
    );
  }

  const gitInfo = await gitInfoForPath(candidatePath).catch(() => null);
  if (!gitInfo) {
    return invalidCandidate(
      source === "manual"
        ? "The saved worktree path is not a git working tree."
        : "The detected directory is not a git working tree.",
      candidatePath,
    );
  }

  if (normalizeGitPath(gitInfo.commonDir) !== normalizeGitPath(primaryGitInfo.commonDir)) {
    return invalidCandidate(
      "The worktree belongs to a different git repository.",
      candidatePath,
    );
  }

  return { valid: true, gitInfo };
}

function invalidCandidate(message: string, detail: string): { valid: false; issue: RuntimeIssue } {
  return {
    valid: false,
    issue: {
      code: "worktree-error",
      message,
      detail,
    },
  };
}

async function gitInfoForPath(checkoutPath: string): Promise<GitInfo> {
  const commonDir = await gitOutput(checkoutPath, [
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  ]);
  const branch = await gitOutput(checkoutPath, ["branch", "--show-current"]).catch(() => "");

  return {
    commonDir: path.resolve(checkoutPath, commonDir),
    branch: branch || undefined,
  };
}

async function gitOutput(cwd: string, args: string[]): Promise<string> {
  const result = await execFileAsync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
  });
  return String(result.stdout).trim();
}

function normalizeLocalPath(input: string): string {
  return path.resolve(expandProjectPath(input.trim()));
}

function normalizeGitPath(input: string): string {
  return path.resolve(input);
}

function checkoutId(checkoutPath: string): string {
  const hash = createHash("sha1").update(checkoutPath).digest("hex").slice(0, 10);
  return `wt_${hash}`;
}
