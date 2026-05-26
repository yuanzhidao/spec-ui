import { mkdir, utimes, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ProjectBinding } from "@spec-ui/core/dashboard/types";
import { projectDashboardData } from "../adapters";

async function fixtureProject() {
  const projectPath = await mkdtemp(path.join(tmpdir(), "spec-ui-adapter-"));
  await mkdir(path.join(projectPath, "openspec", "specs", "dashboard"), {
    recursive: true,
  });
  await mkdir(
    path.join(projectPath, "openspec", "changes", "add-shell", "specs", "dashboard"),
    { recursive: true },
  );
  await writeFile(
    path.join(projectPath, "openspec", "specs", "dashboard", "spec.md"),
    "# Dashboard\n\n### Requirement: Existing dashboard requirement\n",
  );
  await writeFile(
    path.join(projectPath, "openspec", "changes", "add-shell", "proposal.md"),
    "# Add shell\n\n## Why\n\nUsers need a shell.\n\n## What Changes\n\nAdd the dashboard shell.\n",
  );
  await writeFile(
    path.join(projectPath, "openspec", "changes", "add-shell", "design.md"),
    "## Design\n\nUse a workbench layout.\n",
  );
  await writeFile(
    path.join(projectPath, "openspec", "changes", "add-shell", "tasks.md"),
    "- [x] Prepare\n- [ ] Build\n",
  );
  await writeFile(
    path.join(
      projectPath,
      "openspec",
      "changes",
      "add-shell",
      "specs",
      "dashboard",
      "spec.md",
    ),
    "## ADDED Requirements\n\n### Requirement: Dashboard shell\n",
  );
  await mkdir(path.join(projectPath, "openspec", "changes", "archive", "old-shell"), {
    recursive: true,
  });
  await writeFile(
    path.join(projectPath, "openspec", "changes", "archive", "old-shell", "proposal.md"),
    "# Old shell\n",
  );

  return projectPath;
}

describe("OpenSpec adapter projection", () => {
  it("projects specs, active changes, requirements, and task summaries", async () => {
    const projectPath = await fixtureProject();
    const binding: ProjectBinding = {
      id: "prj_fixture0001",
      path: projectPath,
      name: "fixture",
      dialect: "openspec",
      worktreePaths: [],
      checkouts: [],
      worktreeIssues: [],
      discovery: {
        hasOpenSpecDir: true,
        hasConfig: false,
        hasSpecsDir: true,
        hasChangesDir: true,
        isEmptyOpenSpec: false,
        scopes: [{ id: "root", label: "root", path: "" }],
      },
    };

    const data = await projectDashboardData(
      binding,
      { status: "not-run" },
      [],
    );

    const activeChange = data.changes.find((change) => change.lifecycle === "active");
    const archivedChange = data.changes.find((change) => change.lifecycle === "archived");

    expect(data.specs).toHaveLength(1);
    expect(data.changes.map((change) => `${change.lifecycle}:${change.id}`).sort()).toEqual([
      "active:add-shell",
      "archived:old-shell",
    ]);
    expect(data.specs[0].projectId).toBe("prj_fixture0001");
    expect(data.specs[0].projectPath).toBe(projectPath);
    expect(data.specs[0].detail?.content).toContain("Existing dashboard requirement");
    expect(activeChange?.projectName).toBe("fixture");
    expect(activeChange?.taskSummary).toEqual({ total: 2, completed: 1 });
    expect(activeChange?.detail?.proposal.why).toBe("Users need a shell.");
    expect(activeChange?.detail?.proposal.whatChanges).toBe("Add the dashboard shell.");
    expect(activeChange?.detail?.design).toContain("workbench layout");
    expect(activeChange?.detail?.tasks.map((task) => task.text)).toEqual([
      "Prepare",
      "Build",
    ]);
    expect(activeChange?.detail?.tasks.map((task) => task.lineNumber)).toEqual([1, 2]);
    expect(activeChange?.detail?.tasks[0].sourcePath).toBe(
      path.join(projectPath, "openspec", "changes", "add-shell", "tasks.md"),
    );
    expect(activeChange?.detail?.deltaSpecs).toHaveLength(1);
    expect(activeChange?.detail?.files.map((file) => file.path)).toEqual([
      "design.md",
      "proposal.md",
      "specs/dashboard/spec.md",
      "tasks.md",
    ]);
    expect(archivedChange).toMatchObject({
      id: "old-shell",
      lifecycle: "archived",
      title: "Old shell",
    });
    expect(data.requirements.map((requirement) => requirement.title)).toEqual([
      "Existing dashboard requirement",
      "Dashboard shell",
    ]);
  });

  it("keeps active and archived changes with the same ID separate", async () => {
    const projectPath = await fixtureProject();
    await mkdir(path.join(projectPath, "openspec", "changes", "archive", "add-shell"), {
      recursive: true,
    });
    await writeFile(
      path.join(projectPath, "openspec", "changes", "archive", "add-shell", "proposal.md"),
      "# Archived shell\n",
    );

    const binding: ProjectBinding = {
      id: "prj_fixture0001",
      path: projectPath,
      name: "fixture",
      dialect: "openspec",
      worktreePaths: [],
      checkouts: [],
      worktreeIssues: [],
      discovery: {
        hasOpenSpecDir: true,
        hasConfig: false,
        hasSpecsDir: true,
        hasChangesDir: true,
        isEmptyOpenSpec: false,
        scopes: [{ id: "root", label: "root", path: "" }],
      },
    };

    const data = await projectDashboardData(binding, { status: "not-run" }, []);
    const shellChanges = data.changes
      .filter((change) => change.id === "add-shell")
      .sort((first, second) => first.lifecycle.localeCompare(second.lifecycle));

    expect(shellChanges.map((change) => change.lifecycle)).toEqual([
      "active",
      "archived",
    ]);
    expect(shellChanges.find((change) => change.lifecycle === "archived")?.title).toBe(
      "Archived shell",
    );
  });

  it("projects nested scopes and aggregates same-id changes inside one project", async () => {
    const projectPath = await fixtureProject();
    await mkdir(path.join(projectPath, "apps", "web", "openspec", "changes", "add-shell"), {
      recursive: true,
    });
    await mkdir(path.join(projectPath, "apps", "web", "openspec", "specs", "dashboard"), {
      recursive: true,
    });
    await writeFile(
      path.join(projectPath, "apps", "web", "openspec", "changes", "add-shell", "proposal.md"),
      "# Add web shell\n\n## Why\n\nThe web app needs the shell.\n",
    );
    await writeFile(
      path.join(projectPath, "apps", "web", "openspec", "changes", "add-shell", "tasks.md"),
      "- [x] Web prepare\n- [x] Web build\n",
    );
    await writeFile(
      path.join(projectPath, "apps", "web", "openspec", "specs", "dashboard", "spec.md"),
      "# Web dashboard\n\n### Requirement: Web dashboard requirement\n",
    );

    const binding: ProjectBinding = {
      id: "prj_fixture0001",
      path: projectPath,
      name: "fixture",
      dialect: "openspec",
      worktreePaths: [],
      checkouts: [],
      worktreeIssues: [],
      discovery: {
        hasOpenSpecDir: true,
        hasConfig: false,
        hasSpecsDir: true,
        hasChangesDir: true,
        isEmptyOpenSpec: false,
        scopes: [
          { id: "root", label: "root", path: "" },
          { id: "apps_web", label: "apps/web", path: "apps/web" },
        ],
      },
    };

    const data = await projectDashboardData(binding, { status: "not-run" }, []);

    expect(data.scopes).toHaveLength(2);
    expect(data.specs.map((spec) => spec.scopeId).sort()).toEqual(["apps_web", "root"]);
    expect(data.specs.find((spec) => spec.scopeId === "apps_web")?.id).toBe("apps_web__dashboard");
    const activeChange = data.changes.find((change) => change.id === "add-shell" && change.lifecycle === "active");

    expect(activeChange).toMatchObject({
      id: "add-shell",
      lifecycle: "active",
      taskSummary: { total: 4, completed: 3 },
      requirementCount: 1,
    });
    expect(activeChange?.scopedChanges?.map((change) => change.scopeId)).toEqual([
      "root",
      "apps_web",
    ]);
  });

  it("merges same-id changes across checkouts and uses the latest checkout as primary", async () => {
    const primaryPath = await fixtureProject();
    const worktreePath = await fixtureProject();
    const worktreeChangePath = path.join(worktreePath, "openspec", "changes", "add-shell");
    const future = new Date(Date.now() + 60_000);
    await writeFile(
      path.join(worktreeChangePath, "proposal.md"),
      "# Add shell from worktree\n\n## Why\n\nThe worktree has the latest change.\n",
    );
    await utimes(worktreeChangePath, future, future);

    const binding: ProjectBinding = {
      id: "prj_fixture0001",
      path: primaryPath,
      name: "fixture",
      dialect: "openspec",
      worktreePaths: [],
      worktreeIssues: [],
      discovery: {
        hasOpenSpecDir: true,
        hasConfig: false,
        hasSpecsDir: true,
        hasChangesDir: true,
        isEmptyOpenSpec: false,
        scopes: [{ id: "root", label: "root", path: "" }],
      },
      checkouts: [
        {
          id: "primary",
          kind: "primary",
          source: "primary",
          path: primaryPath,
          label: "main",
          branch: "main",
          dialect: "openspec",
          discovery: {
            hasOpenSpecDir: true,
            hasConfig: false,
            hasSpecsDir: true,
            hasChangesDir: true,
            isEmptyOpenSpec: false,
            scopes: [{ id: "root", label: "root", path: "" }],
          },
        },
        {
          id: "wt_feature",
          kind: "worktree",
          source: "worktrees-directory",
          path: worktreePath,
          label: "feature",
          branch: "feature",
          dialect: "openspec",
          discovery: {
            hasOpenSpecDir: true,
            hasConfig: false,
            hasSpecsDir: true,
            hasChangesDir: true,
            isEmptyOpenSpec: false,
            scopes: [{ id: "root", label: "root", path: "" }],
          },
        },
      ],
    };

    const data = await projectDashboardData(binding, { status: "not-run" }, []);

    expect(data.specs).toHaveLength(2);
    expect(data.specs.find((spec) => spec.checkoutId === "wt_feature")?.id).toBe(
      "wt_feature__dashboard",
    );
    expect(data.scopes.map((scope) => scope.id)).toEqual(["root", "wt_feature__root"]);
    const activeChange = data.changes.find((change) => change.id === "add-shell" && change.lifecycle === "active");

    expect(activeChange?.id).toBe("add-shell");
    expect(activeChange?.title).toBe("Add shell from worktree");
    expect(activeChange?.checkoutId).toBe("wt_feature");
    expect(activeChange?.checkoutSources?.map((source) => source.checkoutId)).toEqual([
      "wt_feature",
      "primary",
    ]);
  });
});
