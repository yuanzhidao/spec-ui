import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeState } from "../state";

async function tempHome() {
  const home = await mkdtemp(path.join(tmpdir(), "spec-ui-home-"));
  vi.stubEnv("HOME", home);
  return home;
}

async function fixtureProject(name: string) {
  const projectPath = await mkdtemp(path.join(tmpdir(), `spec-ui-${name}-`));
  await mkdir(path.join(projectPath, "openspec", "specs", name), { recursive: true });
  await mkdir(path.join(projectPath, "openspec", "changes", `change-${name}`), {
    recursive: true,
  });
  await writeFile(
    path.join(projectPath, "openspec", "specs", name, "spec.md"),
    `# ${name}\n\n### Requirement: ${name} requirement\n`,
  );
  await writeFile(
    path.join(projectPath, "openspec", "changes", `change-${name}`, "proposal.md"),
    `# ${name} change\n`,
  );

  return projectPath;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("RuntimeState project collection", () => {
  it("adds projects once, focuses a project, and removes it", async () => {
    await tempHome();
    const state = new RuntimeState();
    await state.initialize();
    const projectPath = await fixtureProject("alpha");

    await state.addProject(projectPath);
    await state.addProject(projectPath);

    let snapshot = await state.snapshot();
    expect(snapshot.settings.projects).toHaveLength(1);
    expect(snapshot.settings.projects[0].path).toBe(projectPath);
    expect(snapshot.settings.projects[0].id).toMatch(/^prj_[a-z0-9]{8}$/);
    expect(snapshot.settings.focusedProjectId).toBe(snapshot.settings.projects[0].id);
    expect(snapshot.dashboard.focusedProjectPath).toBe(projectPath);

    await state.focusProject(null);
    snapshot = await state.snapshot();
    expect(snapshot.settings.focusedProjectId).toBeNull();

    await state.removeProject(projectPath);
    snapshot = await state.snapshot();
    expect(snapshot.settings.projects).toEqual([]);
    expect(snapshot.dashboard.projects).toEqual([]);
  });

  it("aggregates all project data and filters by focused project", async () => {
    await tempHome();
    const state = new RuntimeState();
    await state.initialize();
    const alpha = await fixtureProject("alpha");
    const beta = await fixtureProject("beta");

    await state.addProject(alpha);
    await state.addProject(beta);
    await state.focusProject(null);

    let snapshot = await state.snapshot();
    expect(snapshot.dashboard.projects).toHaveLength(2);
    expect(snapshot.dashboard.specs.map((spec) => spec.projectPath).sort()).toEqual(
      [alpha, beta].sort(),
    );

    await state.focusProject(alpha);
    snapshot = await state.snapshot();
    expect(snapshot.dashboard.focusedProjectId).toBe(snapshot.dashboard.project?.id);
    expect(snapshot.dashboard.specs).toHaveLength(1);
    expect(snapshot.dashboard.specs[0].projectPath).toBe(alpha);
  });

  it("relocates a project path while preserving its project id", async () => {
    await tempHome();
    const state = new RuntimeState();
    await state.initialize();
    const oldPath = await fixtureProject("alpha");
    const newPath = await fixtureProject("alpha-moved");

    await state.addProject(oldPath);
    let snapshot = await state.snapshot();
    const projectId = snapshot.settings.projects[0].id;

    await state.relocateProject(projectId, newPath);
    snapshot = await state.snapshot();

    expect(snapshot.settings.projects).toEqual([{ id: projectId, path: newPath, worktreePaths: [] }]);
    expect(snapshot.settings.focusedProjectId).toBe(projectId);
    expect(snapshot.dashboard.projects).toHaveLength(1);
    expect(snapshot.dashboard.projects[0].project.id).toBe(projectId);
    expect(snapshot.dashboard.projects[0].project.path).toBe(newPath);
    expect(snapshot.dashboard.specs[0].id).toBe("alpha-moved");
  });

  it("persists worktrees directory and manual orphan worktree paths", async () => {
    await tempHome();
    const state = new RuntimeState();
    await state.initialize();
    const projectPath = await fixtureProject("alpha");

    await state.addProject(projectPath);
    let snapshot = await state.snapshot();
    const projectId = snapshot.settings.projects[0].id;

    await state.updateProjectWorktreesPath(projectId, "/tmp/spec-ui-worktrees");
    await state.addProjectWorktreePath(projectId, "/tmp/spec-ui-orphan");
    snapshot = await state.snapshot();

    expect(snapshot.settings.projects[0]).toMatchObject({
      id: projectId,
      path: projectPath,
      worktreesPath: "/tmp/spec-ui-worktrees",
      worktreePaths: ["/tmp/spec-ui-orphan"],
    });

    await state.removeProjectWorktreePath(projectId, "/tmp/spec-ui-orphan");
    snapshot = await state.snapshot();
    expect(snapshot.settings.projects[0].worktreePaths).toEqual([]);
  });

  it("refreshes an explicitly selected project even when another project is focused", async () => {
    await tempHome();
    const state = new RuntimeState();
    await state.initialize();
    const alpha = await fixtureProject("alpha");
    const beta = await fixtureProject("beta");

    await state.addProject(alpha);
    await state.addProject(beta);
    await state.focusProject(alpha);
    let snapshot = await state.snapshot();
    const betaId = snapshot.settings.projects.find((project) => project.path === beta)?.id;
    if (!betaId) {
      throw new Error("beta project id was not created");
    }

    await mkdir(path.join(beta, "apps", "web", "openspec", "specs", "beta-web"), {
      recursive: true,
    });
    await writeFile(
      path.join(beta, "apps", "web", "openspec", "specs", "beta-web", "spec.md"),
      "# beta web\n\n### Requirement: beta web requirement\n",
    );

    await state.refreshProject(betaId);
    snapshot = await state.snapshot();
    const betaProject = snapshot.dashboard.projects.find((project) => project.project.id === betaId);

    expect(betaProject?.scopes.map((scope) => scope.id).sort()).toEqual(["apps_web", "root"]);
  });
});
