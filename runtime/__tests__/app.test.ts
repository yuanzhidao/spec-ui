import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntimeApp } from "../app";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("runtime origin boundary", () => {
  it("allows requests without a browser origin", async () => {
    const app = createRuntimeApp();

    const response = await app.request("/health");

    expect(response.status).toBe(200);
  });

  it("allows configured local browser origins", async () => {
    const app = createRuntimeApp();

    const response = await app.request("/health", {
      headers: {
        origin: "http://localhost:3000",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  it("rejects untrusted browser origins", async () => {
    const app = createRuntimeApp();

    const response = await app.request("/health", {
      headers: {
        origin: "https://example.invalid",
      },
    });

    expect(response.status).toBe(403);
  });

  it("uses the configured origin allowlist when provided", async () => {
    vi.stubEnv("SPEC_UI_RUNTIME_ALLOWED_ORIGINS", "http://localhost:4000");
    const app = createRuntimeApp();

    const allowed = await app.request("/health", {
      headers: {
        origin: "http://localhost:4000",
      },
    });
    const denied = await app.request("/health", {
      headers: {
        origin: "http://localhost:3000",
      },
    });

    expect(allowed.status).toBe(200);
    expect(denied.status).toBe(403);
  });
});
