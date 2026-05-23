import { chmod, mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { discoverProject, projectWatcherIgnorePatterns } from "../project";

async function tempProject() {
  return mkdtemp(path.join(tmpdir(), "spec-ui-project-"));
}

describe("discoverProject", () => {
  it("binds a readable directory with no supported spec structure", async () => {
    const projectPath = await tempProject();

    const result = await discoverProject(projectPath);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.binding.id).toBe("");
      expect(result.binding.dialect).toBe("none");
      expect(result.issue?.code).toBe("unsupported-dialect");
    }
  });

  it("detects OpenSpec from config.yaml", async () => {
    const projectPath = await tempProject();
    await mkdir(path.join(projectPath, "openspec"));
    await writeFile(path.join(projectPath, "openspec", "config.yaml"), "project: test\n");

    const result = await discoverProject(projectPath);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.binding.dialect).toBe("openspec");
      expect(result.binding.discovery.hasConfig).toBe(true);
      expect(result.binding.discovery.scopes).toEqual([{ id: "root", label: "root", path: "" }]);
    }
  });

  it("detects an empty openspec directory as an empty OpenSpec project", async () => {
    const projectPath = await tempProject();
    await mkdir(path.join(projectPath, "openspec"));

    const result = await discoverProject(projectPath);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.binding.dialect).toBe("openspec");
      expect(result.binding.discovery.isEmptyOpenSpec).toBe(true);
    }
  });

  it("detects root and nested OpenSpec scopes with deterministic ordering", async () => {
    const projectPath = await tempProject();
    await mkdir(path.join(projectPath, "openspec"));
    await mkdir(path.join(projectPath, "packages", "api", "openspec"), { recursive: true });
    await mkdir(path.join(projectPath, "apps", "web", "openspec"), { recursive: true });

    const result = await discoverProject(projectPath);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.binding.dialect).toBe("openspec");
      expect(result.binding.discovery.scopes).toEqual([
        { id: "root", label: "root", path: "" },
        { id: "apps_web", label: "apps/web", path: "apps/web" },
        { id: "packages_api", label: "packages/api", path: "packages/api" },
      ]);
    }
  });

  it("detects nested-only OpenSpec scopes", async () => {
    const projectPath = await tempProject();
    await mkdir(path.join(projectPath, "apps", "web", "openspec"), { recursive: true });

    const result = await discoverProject(projectPath);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.binding.dialect).toBe("openspec");
      expect(result.binding.discovery.scopes).toEqual([
        { id: "apps_web", label: "apps/web", path: "apps/web" },
      ]);
    }
  });

  it("prunes built-in ignored directories and gitignored child directories", async () => {
    const projectPath = await tempProject();
    await mkdir(path.join(projectPath, "apps", "web", "openspec"), { recursive: true });
    await mkdir(path.join(projectPath, "node_modules", "pkg", "openspec"), { recursive: true });
    await mkdir(path.join(projectPath, "ignored", "openspec"), { recursive: true });
    await writeFile(path.join(projectPath, ".gitignore"), "ignored/\n");

    const result = await discoverProject(projectPath);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.binding.discovery.scopes).toEqual([
        { id: "apps_web", label: "apps/web", path: "apps/web" },
      ]);
    }
  });

  it("applies nested gitignore rules while discovering scopes", async () => {
    const projectPath = await tempProject();
    await mkdir(path.join(projectPath, "apps", "web", "openspec"), { recursive: true });
    await mkdir(path.join(projectPath, "apps", "ignored", "openspec"), { recursive: true });
    await writeFile(path.join(projectPath, "apps", ".gitignore"), "ignored/\n");

    const result = await discoverProject(projectPath);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.binding.discovery.scopes).toEqual([
        { id: "apps_web", label: "apps/web", path: "apps/web" },
      ]);
    }
  });

  it("projects gitignore rules into watcher ignore patterns", async () => {
    const projectPath = await tempProject();
    await mkdir(path.join(projectPath, "apps"), { recursive: true });
    await writeFile(path.join(projectPath, ".gitignore"), "ignored/\n");
    await writeFile(path.join(projectPath, "apps", ".gitignore"), "generated/\n");

    const patterns = await projectWatcherIgnorePatterns(projectPath);

    expect(patterns).toContain("ignored");
    expect(patterns).toContain("ignored/**");
    expect(patterns).toContain("apps/generated");
    expect(patterns).toContain("apps/generated/**");
  });

  it("keeps discovery recoverable when a gitignore file is unreadable", async () => {
    const projectPath = await tempProject();
    const gitignorePath = path.join(projectPath, ".gitignore");
    await mkdir(path.join(projectPath, "apps", "web", "openspec"), { recursive: true });
    await writeFile(gitignorePath, "ignored/\n");
    await chmod(gitignorePath, 0);

    try {
      const result = await discoverProject(projectPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.binding.discovery.scopes).toEqual([
          { id: "apps_web", label: "apps/web", path: "apps/web" },
        ]);
      }
    } finally {
      await chmod(gitignorePath, 0o600);
    }
  });

  it("rejects missing paths", async () => {
    const result = await discoverProject(path.join(tmpdir(), "missing-spec-ui-project"));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issue.code).toBe("invalid-path");
    }
  });
});
