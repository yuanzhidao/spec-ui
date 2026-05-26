import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ChangeTaskCompletionUpdate,
  RuntimeIssue,
} from "@spec-ui/core/dashboard/types";

export function validateTaskSourcePath(
  sourcePath: string,
  checkoutPaths: string[],
): RuntimeIssue | null {
  const target = path.resolve(sourcePath);

  if (!isOpenSpecTasksFile(target)) {
    return {
      code: "runtime-error",
      message: "Only OpenSpec tasks.md files can be updated.",
      detail: sourcePath,
    };
  }

  const allowed = checkoutPaths.some((checkoutPath) =>
    isPathInside(path.resolve(checkoutPath), target),
  );
  if (!allowed) {
    return {
      code: "runtime-error",
      message: "The task file does not belong to an added project checkout.",
      detail: sourcePath,
    };
  }

  return null;
}

export async function writeTaskCompletion(
  update: ChangeTaskCompletionUpdate,
): Promise<RuntimeIssue | null> {
  if (!Number.isInteger(update.lineNumber) || update.lineNumber < 1) {
    return {
      code: "runtime-error",
      message: "Task line number must be a positive integer.",
      detail: String(update.lineNumber),
    };
  }

  const sourcePath = path.resolve(update.sourcePath);
  let content: string;
  try {
    content = await readFile(sourcePath, "utf8");
  } catch (error) {
    return {
      code: "missing-path",
      message: "The task file could not be read.",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const lineIndex = update.lineNumber - 1;
  const line = lines[lineIndex];
  if (line === undefined) {
    return {
      code: "runtime-error",
      message: "The selected task no longer exists in tasks.md.",
      detail: `${sourcePath}:${update.lineNumber}`,
    };
  }

  const nextLine = setTaskLineCompletion(line, update.completed);
  if (!nextLine) {
    return {
      code: "runtime-error",
      message: "The selected line is no longer a markdown task.",
      detail: `${sourcePath}:${update.lineNumber}`,
    };
  }

  lines[lineIndex] = nextLine;
  try {
    await writeFile(sourcePath, lines.join(newline), "utf8");
  } catch (error) {
    return {
      code: "runtime-error",
      message: "The task file could not be updated.",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  return null;
}

function setTaskLineCompletion(line: string, completed: boolean): string | null {
  const match = line.match(/^(\s*[-*]\s+\[)([ xX])(\]\s+.+)$/);
  if (!match) {
    return null;
  }

  return `${match[1]}${completed ? "x" : " "}${match[3]}`;
}

function isOpenSpecTasksFile(sourcePath: string): boolean {
  const parts = sourcePath.split(path.sep);
  if (parts.at(-1) !== "tasks.md") {
    return false;
  }

  return parts.some(
    (part, index) => part === "openspec" && parts[index + 1] === "changes",
  );
}

function isPathInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}
