import { spawn } from "node:child_process";
import path from "node:path";
import type { ProjectBinding, SpecScope, ValidationResult } from "@/lib/dashboard-types";

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
  const targets = validationTargetsForProject(binding);
  if (targets.length === 0) {
    return {
      status: "failing",
      message: "Validation is only implemented for OpenSpec projects in the MVP.",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      exitCode: null,
    };
  }

  const command = targets.length > 1
    ? `openspec validate --all (${targets.length} targets)`
    : "openspec validate --all";
  const startedAt = new Date().toISOString();
  const results = await Promise.all(
    targets.map(async (target) => ({
      target,
      result: await runOpenSpecValidation(target.cwd),
    })),
  );
  const failing = results.find((item) => item.result.exitCode !== 0);

  return {
    status: failing ? "failing" : "passing",
    command,
    stdout: results
      .map(({ target, result }) => formatTargetOutput(target.label, result.stdout))
      .filter(Boolean)
      .join("\n"),
    stderr: results
      .map(({ target, result }) => formatTargetOutput(target.label, result.stderr))
      .filter(Boolean)
      .join("\n"),
    exitCode: failing?.result.exitCode ?? 0,
    startedAt,
    endedAt: new Date().toISOString(),
    message: results.find((item) => item.result.message)?.result.message,
  };
}

export type ValidationTarget = {
  label: string;
  cwd: string;
};

export function validationTargetsForProject(binding: ProjectBinding): ValidationTarget[] {
  const checkouts = binding.checkouts.length > 0
    ? binding.checkouts
    : [{
        id: "primary",
        kind: "primary" as const,
        source: "primary" as const,
        path: binding.path,
        label: binding.name,
        dialect: binding.dialect,
        discovery: binding.discovery,
      }];
  const openSpecCheckouts = checkouts.filter((checkout) => checkout.dialect === "openspec");
  const multipleCheckouts = openSpecCheckouts.length > 1;

  return openSpecCheckouts.flatMap((checkout) => {
    const scopes = checkout.discovery.scopes.length
      ? checkout.discovery.scopes
      : [{ id: "root", label: "root", path: "" }];
    const multipleScopes = scopes.length > 1;

    return scopes.map((scope) => ({
      label: validationTargetLabel(checkout.label, scope, multipleCheckouts, multipleScopes),
      cwd: scope.path ? path.join(checkout.path, scope.path) : checkout.path,
    }));
  });
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

function validationTargetLabel(
  checkoutLabel: string,
  scope: SpecScope,
  multipleCheckouts: boolean,
  multipleScopes: boolean,
): string {
  if (multipleCheckouts && multipleScopes) {
    return `${checkoutLabel} / ${scope.label}`;
  }
  if (multipleCheckouts) {
    return checkoutLabel;
  }
  return scope.label;
}

function formatTargetOutput(label: string, output: string): string {
  const trimmed = output.trim();
  return trimmed ? `[${label}]\n${trimmed}` : "";
}
