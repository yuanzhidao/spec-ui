import { mkdir, readFile, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readSettings, settingsPath, writeSettings } from "../settings";

async function tempHome() {
  const home = await mkdtemp(path.join(tmpdir(), "spec-ui-home-"));
  vi.stubEnv("HOME", home);
  return home;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("runtime settings", () => {
  it("returns defaults when settings file is missing", async () => {
    await tempHome();

    const result = await readSettings();

    expect(result.settings.themeMode).toBe("light");
    expect(result.settings.language).toBe("en");
    expect(result.settings.projects).toEqual([]);
    expect(result.settings.focusedProjectId).toBeNull();
  });

  it("writes schema-valid settings atomically to the runtime settings path", async () => {
    await tempHome();

    await writeSettings({
      version: 2,
      themeMode: "system",
      language: "zh",
      projects: [{
        id: "prj_test000000",
        path: "/tmp/spec-ui",
        worktreesPath: "/tmp/spec-ui-worktrees",
        worktreePaths: ["/tmp/orphan-worktree"],
      }],
      focusedProjectId: "prj_test000000",
    });

    const raw = await readFile(settingsPath(), "utf8");
    const parsed = JSON.parse(raw);

    expect(parsed).toEqual({
      version: 2,
      themeMode: "system",
      language: "zh",
      projects: [{
        id: "prj_test000000",
        path: "/tmp/spec-ui",
        worktreesPath: "/tmp/spec-ui-worktrees",
        worktreePaths: ["/tmp/orphan-worktree"],
      }],
      focusedProjectId: "prj_test000000",
    });
  });

  it("migrates v1 project path settings to persistent random project ids", async () => {
    await tempHome();
    await mkdir(path.dirname(settingsPath()), { recursive: true });
    await writeFile(
      settingsPath(),
      JSON.stringify({
        version: 1,
        themeMode: "system",
        language: "zh",
        projects: ["/tmp/spec-ui"],
        focusedProjectPath: "/tmp/spec-ui",
      }),
      "utf8",
    );

    const result = await readSettings();

    expect(result.settings.version).toBe(2);
    expect(result.settings.projects).toHaveLength(1);
    expect(result.settings.projects[0].path).toBe("/tmp/spec-ui");
    expect(result.settings.projects[0].worktreePaths).toEqual([]);
    expect(result.settings.projects[0].id).toMatch(/^prj_[a-z0-9]{8}$/);
    expect(result.settings.focusedProjectId).toBe(result.settings.projects[0].id);
  });

  it("migrates legacy activeProjectPath settings to a project collection", async () => {
    await tempHome();
    await mkdir(path.dirname(settingsPath()), { recursive: true });
    await writeFile(
      settingsPath(),
      JSON.stringify({
        version: 1,
        themeMode: "dark",
        activeProjectPath: "/tmp/legacy-project",
      }),
      "utf8",
    );

    const result = await readSettings();

    expect(result.settings.version).toBe(2);
    expect(result.settings.themeMode).toBe("dark");
    expect(result.settings.language).toBe("en");
    expect(result.settings.projects).toHaveLength(1);
    expect(result.settings.projects[0].path).toBe("/tmp/legacy-project");
    expect(result.settings.projects[0].worktreePaths).toEqual([]);
    expect(result.settings.projects[0].id).toMatch(/^prj_[a-z0-9]{8}$/);
    expect(result.settings.focusedProjectId).toBe(result.settings.projects[0].id);
  });

  it("ignores malformed settings and reports a recoverable issue", async () => {
    await tempHome();
    await mkdir(path.dirname(settingsPath()), { recursive: true });
    await writeFile(settingsPath(), "{bad json", "utf8");

    const result = await readSettings();

    expect(result.settings.projects).toEqual([]);
    expect(result.issue?.code).toBe("settings-invalid");
  });
});
