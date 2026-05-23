import { spawn } from "node:child_process";
import path from "node:path";
import type { ProjectBinding, ValidationResult } from "@/lib/dashboard-types";

export function notRunValidation(): ValidationResult {
  return { status: "not-run" };
}

export function staleValidation(previous: ValidationResult): ValidationResult {
  if (previous.status === "passing" || previous.status === "failing") {
    return { ...previous, status: "stale" };
  }

  return previous;
}

export async function runProjectValidation(
  binding: ProjectBinding,
): Promise<ValidationResult> {
  if (binding.dialect !== "openspec") {
    return {
      status: "failing",
      message: "Validation is only implemented for OpenSpec projects in the MVP.",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      exitCode: null,
    };
  }

  const scopes = binding.discovery.scopes.length
    ? binding.discovery.scopes
    : [{ id: "root", label: "root", path: "" }];
  const command =
    scopes.length > 1
      ? `openspec validate --all (${scopes.length} scopes)`
      : "openspec validate --all";
  const startedAt = new Date().toISOString();
  const results = await Promise.all(
    scopes.map(async (scope) => ({
      scope,
      result: await runOpenSpecValidation(
        scope.path ? path.join(binding.path, scope.path) : binding.path,
      ),
    })),
  );
  const failing = results.find((item) => item.result.exitCode !== 0);

  return {
    status: failing ? "failing" : "passing",
    command,
    stdout: results
      .map(({ scope, result }) => formatScopeOutput(scope.label, result.stdout))
      .filter(Boolean)
      .join("\n"),
    stderr: results
      .map(({ scope, result }) => formatScopeOutput(scope.label, result.stderr))
      .filter(Boolean)
      .join("\n"),
    exitCode: failing?.result.exitCode ?? 0,
    startedAt,
    endedAt: new Date().toISOString(),
    message: results.find((item) => item.result.message)?.result.message,
  };
}

function runOpenSpecValidation(cwd: string): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number | null;
  message?: string;
}> {
  return new Promise((resolve) => {
    const child = spawn("openspec", ["validate", "--all"], {
      cwd,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({
        stdout,
        stderr,
        exitCode: null,
        message: error.message,
      });
    });

    child.on("close", (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode,
      });
    });
  });
}

function formatScopeOutput(scopeLabel: string, output: string): string {
  const trimmed = output.trim();
  return trimmed ? `[${scopeLabel}]\n${trimmed}` : "";
}
