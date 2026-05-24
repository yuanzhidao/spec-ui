import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ProjectBinding } from "@/lib/dashboard-types";
import { validationTargetsForProject } from "../validation";

describe("validation targets", () => {
  it("expands OpenSpec validation across valid checkouts and scopes", () => {
    const binding: ProjectBinding = {
      id: "prj_validation",
      path: "/workspace/spec-ui",
      name: "spec-ui",
      dialect: "openspec",
      worktreePaths: [],
      worktreeIssues: [],
      discovery: {
        hasOpenSpecDir: true,
        hasConfig: true,
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
          path: "/workspace/spec-ui",
          label: "main",
          dialect: "openspec",
          discovery: {
            hasOpenSpecDir: true,
            hasConfig: true,
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
          path: "/workspace/spec-ui-worktrees/feature",
          label: "feature",
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
        },
      ],
    };

    expect(validationTargetsForProject(binding)).toEqual([
      {
        label: "main",
        cwd: "/workspace/spec-ui",
      },
      {
        label: "feature / root",
        cwd: "/workspace/spec-ui-worktrees/feature",
      },
      {
        label: "feature / apps/web",
        cwd: path.join("/workspace/spec-ui-worktrees/feature", "apps/web"),
      },
    ]);
  });
});
