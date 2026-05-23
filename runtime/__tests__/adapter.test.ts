import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ProjectBinding } from "@/lib/dashboard-types";
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

    expect(data.specs).toHaveLength(1);
    expect(data.changes).toHaveLength(1);
    expect(data.specs[0].projectId).toBe("prj_fixture0001");
    expect(data.specs[0].projectPath).toBe(projectPath);
    expect(data.specs[0].detail?.content).toContain("Existing dashboard requirement");
    expect(data.changes[0].projectName).toBe("fixture");
    expect(data.changes[0].taskSummary).toEqual({ total: 2, completed: 1 });
    expect(data.changes[0].detail?.proposal.why).toBe("Users need a shell.");
    expect(data.changes[0].detail?.proposal.whatChanges).toBe("Add the dashboard shell.");
    expect(data.changes[0].detail?.design).toContain("workbench layout");
    expect(data.changes[0].detail?.tasks.map((task) => task.text)).toEqual([
      "Prepare",
      "Build",
    ]);
    expect(data.changes[0].detail?.deltaSpecs).toHaveLength(1);
    expect(data.changes[0].detail?.files.map((file) => file.path)).toEqual([
      "design.md",
      "proposal.md",
      "specs/dashboard/spec.md",
      "tasks.md",
    ]);
    expect(data.requirements.map((requirement) => requirement.title)).toEqual([
      "Existing dashboard requirement",
      "Dashboard shell",
    ]);
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
    expect(data.changes).toHaveLength(1);
    expect(data.changes[0]).toMatchObject({
      id: "add-shell",
      taskSummary: { total: 4, completed: 3 },
      requirementCount: 1,
    });
    expect(data.changes[0].scopedChanges?.map((change) => change.scopeId)).toEqual([
      "root",
      "apps_web",
    ]);
  });
});
