"use client";

import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ValidationResult } from "@/lib/dashboard-types";
import { Button } from "@/components/ui/button";
import { SectionHeader, ValidationBadge } from "./shared";

export function ValidationSection({
  validation,
  onRunValidation,
}: {
  validation: ValidationResult;
  onRunValidation: () => void;
}) {
  const t = useTranslations("validation");

  return (
    <div>
      <SectionHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button
            type="button"
            size="sm"
            onClick={onRunValidation}
            disabled={validation.status === "running"}
          >
            <Play className="size-4" />
            {t("run")}
          </Button>
        }
      />
      <ValidationSummary validation={validation} expanded />
    </div>
  );
}

export function ValidationSummary({
  validation,
  expanded = false,
}: {
  validation: ValidationResult;
  expanded?: boolean;
}) {
  return (
    <div className="space-y-3 px-4 py-4">
      <ValidationBadge status={validation.status} />
      {validation.command ? (
        <p className="text-xs text-muted-foreground">{validation.command}</p>
      ) : null}
      {validation.message ? (
        <p className="rounded-md border border-destructive/25 bg-destructive/5 p-2 text-xs text-destructive">
          {validation.message}
        </p>
      ) : null}
      {expanded && (validation.stdout || validation.stderr) ? (
        <pre className="max-h-96 overflow-auto rounded-md border bg-muted p-3 text-xs text-muted-foreground">
          {[validation.stdout, validation.stderr].filter(Boolean).join("\n")}
        </pre>
      ) : null}
    </div>
  );
}
