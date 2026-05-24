import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ProjectBinding } from "@/lib/dashboard-types";
import { normalizeWatcherEvent } from "../watcher";

const binding: ProjectBinding = {
  id: "prj_demo000000",
  path: "/workspace/demo",
  name: "demo",
  dialect: "openspec",
  worktreePaths: [],
  checkouts: [],
  worktreeIssues: [],
  discovery: {
    hasOpenSpecDir: true,
    hasConfig: true,
    hasSpecsDir: true,
    hasChangesDir: true,
    isEmptyOpenSpec: false,
    scopes: [{ id: "root", label: "root", path: "" }],
  },
};

describe("normalizeWatcherEvent", () => {
  it("emits required fields for relevant OpenSpec files", () => {
    const event = normalizeWatcherEvent(
      binding,
      path.join(binding.path, "openspec", "changes", "add-shell", "tasks.md"),
      "update",
    );

    expect(event).toMatchObject({
      projectPath: binding.path,
      dialect: "openspec",
      eventType: "update",
      entityId: "add-shell",
      scopeId: "root",
      scopeLabel: "root",
      scopePath: "",
    });
    expect(event?.timestamp).toBeTruthy();
  });

  it("emits scope fields for nested OpenSpec files", () => {
    const nestedBinding: ProjectBinding = {
      ...binding,
      discovery: {
        ...binding.discovery,
        scopes: [
          { id: "root", label: "root", path: "" },
          { id: "apps_web", label: "apps/web", path: "apps/web" },
        ],
      },
    };

    const event = normalizeWatcherEvent(
      nestedBinding,
      path.join(nestedBinding.path, "apps", "web", "openspec", "changes", "add-shell", "tasks.md"),
      "update",
    );

    expect(event).toMatchObject({
      entityId: "add-shell",
      scopeId: "apps_web",
      scopeLabel: "apps/web",
      scopePath: "apps/web",
    });
  });

  it("emits rediscovery events for newly created OpenSpec directories", () => {
    const event = normalizeWatcherEvent(
      binding,
      path.join(binding.path, "packages", "api", "openspec"),
      "create",
    );

    expect(event).toMatchObject({
      scopeId: "packages_api",
      scopeLabel: "packages/api",
      scopePath: "packages/api",
    });
  });

  it("filters irrelevant files", () => {
    const event = normalizeWatcherEvent(
      binding,
      path.join(binding.path, "README.md"),
      "update",
    );

    expect(event).toBeNull();
  });

  it("filters ignored directory files", () => {
    const event = normalizeWatcherEvent(
      binding,
      path.join(binding.path, "node_modules", "pkg", "openspec", "changes", "bad", "tasks.md"),
      "update",
    );

    expect(event).toBeNull();
  });
});
