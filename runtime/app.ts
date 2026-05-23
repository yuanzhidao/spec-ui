import { Hono } from "hono";
import { cors } from "hono/cors";
import { upgradeWebSocket } from "@hono/node-server";
import { z } from "zod";
import type { LanguageMode, ThemeMode } from "@/lib/dashboard-types";
import { isRuntimeOriginAllowed } from "./config";
import { runtimeState } from "./state";

const projectPathSchema = z.object({
  path: z.string().min(1),
});

const themeSchema = z.object({
  themeMode: z.enum(["light", "dark", "system"]),
});

const languageSchema = z.object({
  language: z.enum(["en", "zh"]),
});

const focusProjectSchema = z.object({
  path: z.string().min(1).nullable(),
});

const relocateProjectSchema = z.object({
  path: z.string().min(1),
});

const validationRunSchema = z
  .object({
    path: z.string().min(1).optional(),
  })
  .optional();

export function createRuntimeApp() {
  const app = new Hono();

  app.use("*", async (c, next) => {
    const origin = c.req.header("origin");
    if (!isRuntimeOriginAllowed(origin)) {
      return c.json(
        {
          issue: {
            code: "runtime-error",
            message: "Request origin is not allowed by the local runtime.",
          },
        },
        403,
      );
    }

    await next();
  });

  app.use(
    "*",
    cors({
      origin: (origin) => (isRuntimeOriginAllowed(origin) ? origin : null),
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  );

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "spec-ui-runtime",
    }),
  );

  app.get("/api/snapshot", async (c) => c.json(await runtimeState.snapshot()));

  app.post("/api/projects", async (c) => {
    const body = projectPathSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json(
        {
          issue: {
            code: "missing-path",
            message: "Project path is required.",
          },
        },
        400,
      );
    }

    return c.json(await runtimeState.addProject(body.data.path));
  });

  app.post("/api/project", async (c) => {
    const body = projectPathSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json(
        {
          issue: {
            code: "missing-path",
            message: "Project path is required.",
          },
        },
        400,
      );
    }

    return c.json(await runtimeState.bindProject(body.data.path));
  });

  app.put("/api/projects/focus", async (c) => {
    const body = focusProjectSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json(
        {
          issue: {
            code: "runtime-error",
            message: "Focused project path must be a string or null.",
          },
        },
        400,
      );
    }

    return c.json(await runtimeState.focusProject(body.data.path));
  });

  app.delete("/api/projects", async (c) => c.json(await runtimeState.clearProjects()));

  app.delete("/api/projects/:encodedPath", async (c) =>
    c.json(await runtimeState.removeProject(decodeURIComponent(c.req.param("encodedPath")))),
  );

  app.put("/api/projects/:projectId/path", async (c) => {
    const body = relocateProjectSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json(
        {
          issue: {
            code: "missing-path",
            message: "Project path is required.",
          },
        },
        400,
      );
    }

    return c.json(await runtimeState.relocateProject(c.req.param("projectId"), body.data.path));
  });

  app.delete("/api/project", async (c) => c.json(await runtimeState.clearProject()));

  app.post("/api/project/refresh", async (c) =>
    c.json(await runtimeState.refreshProject()),
  );

  app.put("/api/settings/theme", async (c) => {
    const body = themeSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json(
        {
          issue: {
            code: "runtime-error",
            message: "Theme mode must be light, dark, or system.",
          },
        },
        400,
      );
    }

    return c.json(await runtimeState.setTheme(body.data.themeMode as ThemeMode));
  });

  app.put("/api/settings/language", async (c) => {
    const body = languageSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json(
        {
          issue: {
            code: "runtime-error",
            message: "Language must be en or zh.",
          },
        },
        400,
      );
    }

    return c.json(await runtimeState.setLanguage(body.data.language as LanguageMode));
  });

  app.post("/api/validation/run", async (c) => {
    const body = validationRunSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) {
      return c.json(
        {
          issue: {
            code: "runtime-error",
            message: "Validation project path must be a string when provided.",
          },
        },
        400,
      );
    }

    return c.json(await runtimeState.runValidation(body.data?.path));
  });

  app.get(
    "/ws",
    upgradeWebSocket(() => ({
      onOpen(_event, ws) {
        runtimeState.addClient(ws);
      },
      onClose(_event, ws) {
        runtimeState.removeClient(ws);
      },
      onError(_event, ws) {
        runtimeState.removeClient(ws);
      },
    })),
  );

  return app;
}
