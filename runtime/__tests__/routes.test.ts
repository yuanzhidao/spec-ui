import { describe, expect, it } from "vitest";
import { normalizeChangeLifecycle, paths } from "../../lib/routes";

describe("dashboard routes", () => {
  it("keeps active change detail routes clean and disambiguates archived changes", () => {
    expect(paths.changeDetail("project 1", "add-shell")).toBe(
      "/changes/project%201/add-shell",
    );
    expect(paths.changeDetail("project 1", "add-shell", "archived")).toBe(
      "/changes/project%201/add-shell?lifecycle=archived",
    );
  });

  it("normalizes unsupported change lifecycle route params to active", () => {
    expect(normalizeChangeLifecycle("archived")).toBe("archived");
    expect(normalizeChangeLifecycle(["archived"])).toBe("archived");
    expect(normalizeChangeLifecycle("active")).toBe("active");
    expect(normalizeChangeLifecycle("other")).toBe("active");
    expect(normalizeChangeLifecycle(undefined)).toBe("active");
  });
});
