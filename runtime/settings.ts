import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { z } from "zod";
import type {
  LanguageMode,
  RuntimeIssue,
  RuntimeProjectSetting,
  RuntimeSettings,
  ThemeMode,
} from "@/lib/dashboard-types";
import { SETTINGS_DIR_NAME, SETTINGS_FILE_NAME } from "./config";

const projectSettingSchema = z.object({
  id: z.string().regex(/^prj_[a-z0-9]+$/),
  path: z.string().min(1),
});

const settingsSchemaV2 = z.object({
  version: z.literal(2),
  themeMode: z.enum(["light", "dark", "system"]),
  language: z.enum(["en", "zh"]).default("en"),
  projects: z.array(projectSettingSchema).default([]),
  focusedProjectId: z.string().regex(/^prj_[a-z0-9]+$/).nullable().default(null),
});

const settingsSchemaV1 = z.object({
  version: z.literal(1),
  themeMode: z.enum(["light", "dark", "system"]),
  language: z.enum(["en", "zh"]).default("en"),
  projects: z.array(z.string().min(1)).default([]),
  focusedProjectPath: z.string().min(1).nullable().default(null),
});

const legacySettingsSchema = z.object({
  version: z.literal(1),
  themeMode: z.enum(["light", "dark", "system"]),
  activeProjectPath: z.string().min(1).nullable(),
});

export const defaultSettings: RuntimeSettings = {
  version: 2,
  themeMode: "light",
  language: "en",
  projects: [],
  focusedProjectId: null,
};

export type SettingsReadResult = {
  settings: RuntimeSettings;
  issue?: RuntimeIssue;
};

export function settingsDir(): string {
  return path.join(homedir(), SETTINGS_DIR_NAME);
}

export function settingsPath(): string {
  return path.join(settingsDir(), SETTINGS_FILE_NAME);
}

export async function readSettings(): Promise<SettingsReadResult> {
  try {
    const raw = await readFile(settingsPath(), "utf8");
    const json = JSON.parse(raw);
    const parsed = settingsSchemaV2.safeParse(json);
    if (parsed.success) {
      return { settings: normalizeSettings(parsed.data) };
    }

    const legacy = legacySettingsSchema.safeParse(json);
    if (legacy.success) {
      return { settings: migrateLegacySettings(legacy.data) };
    }

    const v1 = settingsSchemaV1.safeParse(json);
    if (v1.success) {
      return { settings: migrateV1Settings(v1.data) };
    }

    {
      return {
        settings: defaultSettings,
        issue: {
          code: "settings-invalid",
          message: "Runtime settings are invalid. Defaults were loaded.",
          detail: parsed.error.message,
        },
      };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { settings: defaultSettings };
    }

    return {
      settings: defaultSettings,
      issue: {
        code: "settings-invalid",
        message: "Runtime settings could not be read. Defaults were loaded.",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function writeSettings(settings: RuntimeSettings): Promise<void> {
  const parsed = settingsSchemaV2.parse(normalizeSettings(settings));
  await mkdir(settingsDir(), { recursive: true });

  const target = settingsPath();
  const temporary = path.join(
    settingsDir(),
    `${SETTINGS_FILE_NAME}.${process.pid}.${Date.now()}.tmp`,
  );

  await writeFile(temporary, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

export function withTheme(settings: RuntimeSettings, themeMode: ThemeMode): RuntimeSettings {
  return { ...settings, themeMode };
}

export function withLanguage(
  settings: RuntimeSettings,
  language: LanguageMode,
): RuntimeSettings {
  return { ...settings, language };
}

export function withProjects(
  settings: RuntimeSettings,
  projects: RuntimeProjectSetting[],
  focusedProjectId = settings.focusedProjectId,
): RuntimeSettings {
  return normalizeSettings({ ...settings, projects, focusedProjectId });
}

export function addProjectPath(
  settings: RuntimeSettings,
  projectPath: string,
): RuntimeSettings {
  const existing = settings.projects.find((project) => project.path === projectPath);
  if (existing) {
    return withFocusedProjectId(settings, existing.id);
  }

  const project = createProjectSetting(projectPath, settings.projects);
  return withProjects(settings, [...settings.projects, project], project.id);
}

export function removeProjectPath(
  settings: RuntimeSettings,
  projectPath: string,
): RuntimeSettings {
  const removed = settings.projects.find((project) => project.path === projectPath);
  const projects = settings.projects.filter((project) => project.path !== projectPath);
  const focusedProjectId =
    removed && settings.focusedProjectId === removed.id
      ? projects[0]?.id ?? null
      : settings.focusedProjectId;

  return withProjects(settings, projects, focusedProjectId);
}

export function updateProjectPath(
  settings: RuntimeSettings,
  projectId: string,
  projectPath: string,
): RuntimeSettings {
  return withProjects(
    settings,
    settings.projects.map((project) =>
      project.id === projectId ? { ...project, path: projectPath } : project,
    ),
  );
}

export function withFocusedProjectId(
  settings: RuntimeSettings,
  focusedProjectId: string | null,
): RuntimeSettings {
  return normalizeSettings({ ...settings, focusedProjectId });
}

export function projectSettingById(
  settings: RuntimeSettings,
  projectId: string,
): RuntimeProjectSetting | undefined {
  return settings.projects.find((project) => project.id === projectId);
}

export function projectSettingByPath(
  settings: RuntimeSettings,
  projectPath: string,
): RuntimeProjectSetting | undefined {
  return settings.projects.find((project) => project.path === projectPath);
}

function migrateLegacySettings(settings: z.infer<typeof legacySettingsSchema>): RuntimeSettings {
  const projects = settings.activeProjectPath
    ? [createProjectSetting(settings.activeProjectPath, [])]
    : [];

  return normalizeSettings({
    version: 2,
    themeMode: settings.themeMode,
    language: "en",
    projects,
    focusedProjectId: projects[0]?.id ?? null,
  });
}

function migrateV1Settings(settings: z.infer<typeof settingsSchemaV1>): RuntimeSettings {
  const projects = settings.projects.reduce<RuntimeProjectSetting[]>((accumulator, projectPath) => {
    if (accumulator.some((project) => project.path === projectPath)) {
      return accumulator;
    }
    return [...accumulator, createProjectSetting(projectPath, accumulator)];
  }, []);
  const focusedProjectId =
    projects.find((project) => project.path === settings.focusedProjectPath)?.id ?? null;

  return normalizeSettings({
    version: 2,
    themeMode: settings.themeMode,
    language: settings.language,
    projects,
    focusedProjectId,
  });
}

function normalizeSettings(settings: RuntimeSettings): RuntimeSettings {
  const projects = uniqueProjects(settings.projects);
  const focusedProjectId =
    settings.focusedProjectId && projects.some((project) => project.id === settings.focusedProjectId)
      ? settings.focusedProjectId
      : null;

  return {
    version: 2,
    themeMode: settings.themeMode,
    language: settings.language,
    projects,
    focusedProjectId,
  };
}

function createProjectSetting(
  projectPath: string,
  existing: RuntimeProjectSetting[],
): RuntimeProjectSetting {
  const existingIds = new Set(existing.map((project) => project.id));
  let id = createProjectId();
  while (existingIds.has(id)) {
    id = createProjectId();
  }

  return {
    id,
    path: projectPath,
  };
}

function createProjectId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(8);
  let suffix = "";

  for (const byte of bytes) {
    suffix += alphabet[byte % alphabet.length];
  }

  return `prj_${suffix}`;
}

function uniqueProjects(projects: RuntimeProjectSetting[]): RuntimeProjectSetting[] {
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  const result: RuntimeProjectSetting[] = [];

  for (const project of projects) {
    if (!project.id || !project.path || seenIds.has(project.id) || seenPaths.has(project.path)) {
      continue;
    }
    seenIds.add(project.id);
    seenPaths.add(project.path);
    result.push(project);
  }

  return result;
}
