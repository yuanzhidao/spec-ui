import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeState } from "../state";

const execFileAsync = promisify(execFile);
const states: RuntimeState[] = [];

async function git(cwd: string, args: string[]) {
  await execFileAsync("git", ["-C", cwd, ...args], { encoding: "utf8" });
}

async function tempHome() {
  const home = await mkdtemp(path.join(tmpdir(), "spec-ui-home-"));
  vi.stubEnv("HOME", home);
  return home;
}

async function fixtureGitProject() {
  const projectPath = await mkdtemp(path.join(tmpdir(), "spec-ui-realtime-project-"));
  await git(projectPath, ["init"]);
  await git(projectPath, ["config", "user.email", "spec-ui@example.test"]);
  await git(projectPath, ["config", "user.name", "spec-ui"]);
  await mkdir(path.join(projectPath, "openspec", "changes", "init"), { recursive: true });
  await writeFile(path.join(projectPath, "openspec", "changes", "init", "proposal.md"), "# Init\n");
  await git(projectPath, ["add", "."]);
  await git(projectPath, ["commit", "-m", "init"]);
  return projectPath;
}

afterEach(async () => {
  await Promise.all(states.splice(0).map((state) => state.clearProjects()));
  vi.unstubAllEnvs();
});

describe("RuntimeState worktrees realtime discovery", () => {
  it("updates directory-derived worktrees when the saved worktrees directory changes", async () => {
    await tempHome();
    const projectPath = await fixtureGitProject();
    const worktreesPath = await mkdtemp(path.join(tmpdir(), "spec-ui-realtime-worktrees-"));
    const state = new RuntimeState();
    states.push(state);

    await state.initialize();
    await state.addProject(projectPath);
    const projectId = (await state.snapshot()).settings.projects[0].id;
    await state.updateProjectWorktreesPath(projectId, worktreesPath);

    const worktreePath = path.join(worktreesPath, "feature-auto");
    await git(projectPath, ["worktree", "add", "-b", "feature-auto", worktreePath]);

    await waitFor(async () => {
      const snapshot = await state.snapshot();
      return Boolean(
        snapshot.dashboard.projects[0]?.checkouts.some((checkout) => checkout.path === worktreePath),
      );
    });

    let snapshot = await state.snapshot();
    expect(snapshot.dashboard.projects[0].checkouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: worktreePath,
          source: "worktrees-directory",
          branch: "feature-auto",
        }),
      ]),
    );

    await git(projectPath, ["worktree", "remove", "--force", worktreePath]);

    await waitFor(async () => {
      const nextSnapshot = await state.snapshot();
      return !nextSnapshot.dashboard.projects[0]?.checkouts.some(
        (checkout) => checkout.path === worktreePath,
      );
    });

    snapshot = await state.snapshot();
    expect(snapshot.dashboard.projects[0].checkouts).toHaveLength(1);
  }, 20_000);
});

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 8_000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error("Timed out waiting for worktrees realtime discovery.");
}
