import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { discoverProject } from "../project";
import { discoverWorktreeCheckouts } from "../worktrees";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]) {
  await execFileAsync("git", ["-C", cwd, ...args], { encoding: "utf8" });
}

async function fixtureGitProject() {
  const projectPath = await mkdtemp(path.join(tmpdir(), "spec-ui-git-project-"));
  await git(projectPath, ["init"]);
  await git(projectPath, ["config", "user.email", "spec-ui@example.test"]);
  await git(projectPath, ["config", "user.name", "spec-ui"]);
  await mkdir(path.join(projectPath, "openspec", "changes", "init"), { recursive: true });
  await writeFile(path.join(projectPath, "openspec", "changes", "init", "proposal.md"), "# Init\n");
  await git(projectPath, ["add", "."]);
  await git(projectPath, ["commit", "-m", "init"]);
  return projectPath;
}

async function projectBinding(projectPath: string) {
  const result = await discoverProject(projectPath);
  if (!result.ok) {
    throw new Error(result.issue.message);
  }
  return { ...result.binding, id: "prj_git000000" };
}

describe("discoverWorktreeCheckouts", () => {
  it("discovers only direct child worktrees for the same git common dir", async () => {
    const projectPath = await fixtureGitProject();
    const workspace = await mkdtemp(path.join(tmpdir(), "spec-ui-worktrees-"));
    const validWorktree = path.join(workspace, "feature-a");
    const nestedRoot = path.join(workspace, "nested");
    const nestedWorktree = path.join(nestedRoot, "feature-nested");
    await mkdir(nestedRoot);
    await git(projectPath, ["worktree", "add", "-b", "feature-a", validWorktree]);
    await git(projectPath, ["worktree", "add", "-b", "feature-nested", nestedWorktree]);

    const result = await discoverWorktreeCheckouts(
      { id: "prj_git000000", path: projectPath, worktreesPath: workspace, worktreePaths: [] },
      await projectBinding(projectPath),
    );

    expect(result.issues).toEqual([]);
    expect(result.checkouts.map((checkout) => checkout.path)).toEqual([validWorktree]);
    expect(result.checkouts[0]).toMatchObject({
      kind: "worktree",
      source: "worktrees-directory",
      label: "feature-a",
      branch: "feature-a",
    });
  });

  it("supports manual orphan worktree paths and rejects unrelated repositories", async () => {
    const projectPath = await fixtureGitProject();
    const workspace = await mkdtemp(path.join(tmpdir(), "spec-ui-worktrees-"));
    const orphanWorktree = path.join(tmpdir(), `spec-ui-orphan-${Date.now()}`);
    const unrelatedRepo = path.join(workspace, "unrelated");
    await git(projectPath, ["worktree", "add", "-b", "orphan-feature", orphanWorktree]);
    await mkdir(unrelatedRepo);
    await git(unrelatedRepo, ["init"]);

    const result = await discoverWorktreeCheckouts(
      {
        id: "prj_git000000",
        path: projectPath,
        worktreesPath: workspace,
        worktreePaths: [orphanWorktree, unrelatedRepo],
      },
      await projectBinding(projectPath),
    );

    expect(result.checkouts.map((checkout) => checkout.path)).toEqual([orphanWorktree]);
    expect(result.checkouts[0]).toMatchObject({
      source: "manual",
      label: "orphan-feature",
      branch: "orphan-feature",
    });
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe("worktree-error");
  });

  it("reports a recoverable issue when the saved worktrees directory is missing", async () => {
    const projectPath = await fixtureGitProject();
    const missingWorktreesPath = path.join(projectPath, "missing-worktrees");

    const result = await discoverWorktreeCheckouts(
      {
        id: "prj_git000000",
        path: projectPath,
        worktreesPath: missingWorktreesPath,
        worktreePaths: [],
      },
      await projectBinding(projectPath),
    );

    expect(result.checkouts).toEqual([]);
    expect(result.issues).toEqual([
      {
        code: "worktree-error",
        message: "The saved worktrees directory does not exist.",
        detail: missingWorktreesPath,
      },
    ]);
  });
});
