import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type {
  NormalizedChange,
  NormalizedChangeDeltaSpec,
  NormalizedChangeFile,
  NormalizedScopedChange,
  NormalizedChangeTask,
  NormalizedRequirement,
  NormalizedSpec,
  SpecScope,
} from "@/lib/dashboard-types";
import type { SpecDialectAdapter } from "./types";

const requirementPrefix = "### Requirement:";

export const openSpecAdapter: SpecDialectAdapter = {
  dialect: "openspec",
  async projectData(binding, context) {
    const scopes = binding.discovery.scopes;
    const scopedData = await Promise.all(
      scopes.map(async (scope) => {
        const openspecPath = path.join(binding.path, scope.path, "openspec");
        const [changes, specs] = await Promise.all([
          readChanges(openspecPath, scope),
          readSpecs(openspecPath, scope),
        ]);

        return { scope, changes, specs };
      }),
    );
    const specs = scopedData.flatMap((data) => data.specs);
    const scopedChanges = scopedData.flatMap((data) => data.changes);
    const changes = aggregateScopedChanges(scopedChanges);

    const requirements = [
      ...specs.flatMap((spec) => spec.requirements),
      ...scopedChanges.flatMap((change) => change.requirements),
    ];

    return {
      project: binding,
      validation: context.validation,
      scopes,
      specs: specs.map(toSpec),
      changes,
      requirements,
      activity: context.activity,
    };
  },
};

type SpecWithRequirements = NormalizedSpec & {
  requirements: NormalizedRequirement[];
};

type ChangeWithRequirements = NormalizedChange & {
  requirements: NormalizedRequirement[];
};

async function readSpecs(
  openspecPath: string,
  scope: SpecScope,
): Promise<SpecWithRequirements[]> {
  const specsDir = path.join(openspecPath, "specs");
  const entries = await safeDirectoryEntries(specsDir);

  const specs = await Promise.all(
    entries.map(async (entry): Promise<SpecWithRequirements | null> => {
      const specDir = path.join(specsDir, entry.name);
      const specPath = path.join(specDir, "spec.md");
      if (!(await isFile(specPath))) {
        return null;
      }

      const [text, timestamps] = await Promise.all([
        readFile(specPath, "utf8"),
        directoryTimestamps(specDir),
      ]);
      const requirements = extractRequirements(text, specPath, {
        specId: entry.name,
        scope,
      });

      return {
        id: scopedEntityId(scope, entry.name),
        displayId: entry.name,
        title: firstHeading(text) || entry.name,
        sourcePath: specPath,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
        scopeId: scope.id,
        scopeLabel: scope.label,
        scopePath: scope.path,
        requirementCount: requirements.length,
        detail: {
          content: text,
        },
        requirements,
      };
    }),
  );

  return specs.filter((spec): spec is SpecWithRequirements => Boolean(spec));
}

function toSpec(spec: SpecWithRequirements): NormalizedSpec {
  return {
    id: spec.id,
    displayId: spec.displayId,
    title: spec.title,
    sourcePath: spec.sourcePath,
    createdAt: spec.createdAt,
    updatedAt: spec.updatedAt,
    scopeId: spec.scopeId,
    scopeLabel: spec.scopeLabel,
    scopePath: spec.scopePath,
    requirementCount: spec.requirementCount,
    detail: spec.detail,
  };
}

function toScopedChange(change: ChangeWithRequirements): NormalizedScopedChange {
  return {
    id: change.id,
    title: change.title,
    sourcePath: change.sourcePath,
    createdAt: change.createdAt,
    updatedAt: change.updatedAt,
    scopeId: change.scopeId || "root",
    scopeLabel: change.scopeLabel || "root",
    scopePath: change.scopePath || "",
    hasProposal: change.hasProposal,
    hasDesign: change.hasDesign,
    hasTasks: change.hasTasks,
    taskSummary: change.taskSummary,
    requirementCount: change.requirementCount,
    detail: change.detail,
  };
}

async function readChanges(
  openspecPath: string,
  scope: SpecScope,
): Promise<ChangeWithRequirements[]> {
  const changesDir = path.join(openspecPath, "changes");
  const entries = await safeDirectoryEntries(changesDir);

  const changes = await Promise.all(
    entries.map(async (entry) => {
      const changePath = path.join(changesDir, entry.name);
      const [proposal, design, tasks, specRequirements, timestamps, deltaSpecs, files] = await Promise.all([
        readOptionalFile(path.join(changePath, "proposal.md")),
        readOptionalFile(path.join(changePath, "design.md")),
        readOptionalFile(path.join(changePath, "tasks.md")),
        readChangeRequirements(changePath, entry.name, scope),
        directoryTimestamps(changePath),
        readDeltaSpecs(changePath),
        readMarkdownFiles(changePath),
      ]);
      const parsedTasks = tasks ? parseTasks(tasks) : [];
      const proposalContent = proposal || "";
      const proposalSections = parseProposalSections(proposalContent);

      return {
        id: entry.name,
        title: firstHeading(proposalContent || design || tasks || "") || entry.name,
        sourcePath: changePath,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
        scopeId: scope.id,
        scopeLabel: scope.label,
        scopePath: scope.path,
        hasProposal: proposal !== null,
        hasDesign: design !== null,
        hasTasks: tasks !== null,
        taskSummary: {
          total: parsedTasks.length,
          completed: parsedTasks.filter((task) => task.completed).length,
        },
        requirementCount: specRequirements.length,
        requirements: specRequirements,
        detail: {
          proposal: {
            content: proposalContent,
            why: proposalSections.why,
            whatChanges: proposalSections.whatChanges,
          },
          design: design || undefined,
          tasks: parsedTasks,
          deltaSpecs,
          files,
        },
      };
    }),
  );

  return changes;
}

function aggregateScopedChanges(changes: ChangeWithRequirements[]): NormalizedChange[] {
  const groups = new Map<string, ChangeWithRequirements[]>();
  for (const change of changes) {
    groups.set(change.id, [...(groups.get(change.id) || []), change]);
  }

  return Array.from(groups.values()).map((group) => aggregateChangeGroup(group));
}

function aggregateChangeGroup(group: ChangeWithRequirements[]): NormalizedChange {
  const sorted = [...group].sort(compareScopedChanges);
  const primary = sorted.find((change) => change.scopeId === "root") || sorted[0];
  const scopedChanges = sorted.map(toScopedChange);

  return {
    id: primary.id,
    title: primary.title,
    sourcePath: primary.sourcePath,
    createdAt: earliestTimestamp(sorted.map((change) => change.createdAt)),
    updatedAt: latestTimestamp(sorted.map((change) => change.updatedAt)),
    scopeId: sorted.length === 1 ? primary.scopeId : undefined,
    scopeLabel: sorted.length === 1 ? primary.scopeLabel : undefined,
    scopePath: sorted.length === 1 ? primary.scopePath : undefined,
    hasProposal: sorted.some((change) => change.hasProposal),
    hasDesign: sorted.some((change) => change.hasDesign),
    hasTasks: sorted.some((change) => change.hasTasks),
    taskSummary: {
      total: sorted.reduce((sum, change) => sum + change.taskSummary.total, 0),
      completed: sorted.reduce((sum, change) => sum + change.taskSummary.completed, 0),
    },
    requirementCount: sorted.reduce((sum, change) => sum + change.requirementCount, 0),
    detail: primary.detail,
    scopedChanges,
  };
}

function compareScopedChanges(first: ChangeWithRequirements, second: ChangeWithRequirements): number {
  if (first.scopePath === second.scopePath) {
    return 0;
  }
  if (!first.scopePath) {
    return -1;
  }
  if (!second.scopePath) {
    return 1;
  }
  return String(first.scopePath).localeCompare(String(second.scopePath), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function earliestTimestamp(timestamps: string[]): string {
  return timestamps.reduce((earliest, timestamp) =>
    Date.parse(timestamp) < Date.parse(earliest) ? timestamp : earliest,
  );
}

function latestTimestamp(timestamps: string[]): string {
  return timestamps.reduce((latest, timestamp) =>
    Date.parse(timestamp) > Date.parse(latest) ? timestamp : latest,
  );
}

async function readDeltaSpecs(changePath: string): Promise<NormalizedChangeDeltaSpec[]> {
  const specsRoot = path.join(changePath, "specs");
  const specDirs = await safeDirectoryEntries(specsRoot);
  const deltaSpecs = await Promise.all(
    specDirs.map(async (entry) => {
      const sourcePath = path.join(specsRoot, entry.name, "spec.md");
      const content = await readOptionalFile(sourcePath);
      if (!content) {
        return null;
      }

      return {
        specId: entry.name,
        sourcePath,
        content,
      };
    }),
  );

  return deltaSpecs.filter(
    (deltaSpec): deltaSpec is NormalizedChangeDeltaSpec => Boolean(deltaSpec),
  );
}

async function readMarkdownFiles(changePath: string): Promise<NormalizedChangeFile[]> {
  const files = await collectMarkdownFiles(changePath, changePath);
  return files.sort((first, second) => first.path.localeCompare(second.path));
}

async function collectMarkdownFiles(
  root: string,
  current: string,
): Promise<NormalizedChangeFile[]> {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch {
    return [];
  }

  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry) => {
        const sourcePath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          return collectMarkdownFiles(root, sourcePath);
        }

        if (!entry.isFile() || !entry.name.endsWith(".md")) {
          return [];
        }

        const content = await readOptionalFile(sourcePath);
        if (content === null) {
          return [];
        }

        return [
          {
            path: path.relative(root, sourcePath).replaceAll(path.sep, "/"),
            sourcePath,
            content,
          },
        ];
      }),
  );

  return nested.flat();
}

async function readChangeRequirements(
  changePath: string,
  changeId: string,
  scope: SpecScope,
): Promise<NormalizedRequirement[]> {
  const specsRoot = path.join(changePath, "specs");
  const specDirs = await safeDirectoryEntries(specsRoot);
  const nested = await Promise.all(
    specDirs.map(async (entry) => {
      const specPath = path.join(specsRoot, entry.name, "spec.md");
      const text = await readOptionalFile(specPath);
      if (!text) {
        return [];
      }

      return extractRequirements(text, specPath, {
        changeId,
        specId: entry.name,
        scope,
      });
    }),
  );

  return nested.flat();
}

function extractRequirements(
  text: string,
  sourcePath: string,
  ids: { specId?: string; changeId?: string; scope?: SpecScope },
): NormalizedRequirement[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith(requirementPrefix))
    .map((line) => {
      const title = line.slice(requirementPrefix.length).trim();
      return {
        id: slug([ids.changeId, ids.specId, title].filter(Boolean).join("-")),
        title,
        sourcePath,
        specId: ids.specId,
        changeId: ids.changeId,
        scopeId: ids.scope?.id,
        scopeLabel: ids.scope?.label,
        scopePath: ids.scope?.path,
      };
    });
}

function parseTasks(text: string): NormalizedChangeTask[] {
  let section: string | undefined;
  let index = 0;
  const tasks: NormalizedChangeTask[] = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^#+\s+(.+)$/);
    if (heading) {
      section = heading[1].trim();
      continue;
    }

    const task = line.match(/^- \[([ xX])\]\s+(.+)$/);
    if (!task) {
      continue;
    }

    index += 1;
    tasks.push({
      id: `task-${index}`,
      text: task[2].trim(),
      completed: task[1].toLowerCase() === "x",
      section,
    });
  }

  return tasks;
}

function parseProposalSections(text: string): { why: string; whatChanges: string } {
  const sections = new Map<string, string[]>();
  let current: string | null = null;

  for (const rawLine of text.split("\n")) {
    const heading = rawLine.match(/^##\s+(.+)$/);
    if (heading) {
      const title = heading[1].trim().toLowerCase();
      if (title.includes("why")) {
        current = "why";
      } else if (title.includes("what") || title.includes("change")) {
        current = "whatChanges";
      } else {
        current = null;
      }
      continue;
    }

    if (current) {
      const lines = sections.get(current) || [];
      lines.push(rawLine);
      sections.set(current, lines);
    }
  }

  return {
    why: (sections.get("why") || []).join("\n").trim(),
    whatChanges: (sections.get("whatChanges") || []).join("\n").trim(),
  };
}

function firstHeading(text: string): string | null {
  const heading = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));

  return heading ? heading.replace(/^#\s+/, "").trim() : null;
}

async function safeDirectoryEntries(target: string) {
  try {
    const entries = await readdir(target, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."));
  } catch {
    return [];
  }
}

async function readOptionalFile(target: string): Promise<string | null> {
  try {
    return await readFile(target, "utf8");
  } catch {
    return null;
  }
}

async function isFile(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

async function directoryTimestamps(
  target: string,
): Promise<{ createdAt: string; updatedAt: string }> {
  const stats = await stat(target);
  return {
    createdAt: stats.birthtime.toISOString(),
    updatedAt: stats.mtime.toISOString(),
  };
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function scopedEntityId(scope: SpecScope, id: string): string {
  return scope.id === "root" ? id : `${scope.id}__${id}`;
}
