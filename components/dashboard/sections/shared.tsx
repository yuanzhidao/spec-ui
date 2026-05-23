"use client";

import { Clock3, FolderKanban, FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ValidationResult } from "@/lib/dashboard-types";
import { AppLink } from "@/components/navigation/app-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { paths } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function relativeOpenSpecPath(sourcePath: string) {
  const normalized = sourcePath.replaceAll("\\", "/");
  const marker = "openspec/";
  const index = normalized.indexOf(marker);
  return index >= 0 ? normalized.slice(index) : normalized;
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-14 items-center justify-between gap-3 px-4">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function PresenceBadge({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Badge variant={active ? "secondary" : "outline"} className="h-5 rounded text-[11px]">
      {children}
    </Badge>
  );
}

export function ValidationBadge({ status }: { status: ValidationResult["status"] }) {
  const t = useTranslations("validation.status");
  const tone = {
    "not-run": "bg-muted text-muted-foreground",
    running: "bg-status-info/10 text-status-info",
    passing: "bg-status-success/10 text-status-success",
    failing: "bg-destructive/10 text-destructive",
    stale: "bg-status-warning/10 text-status-warning",
  }[status];

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs", tone)}>
      <Clock3 className="size-3.5" />
      {t(status)}
    </span>
  );
}

export function EmptyProjectState() {
  const t = useTranslations("emptyProject");

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-3">
        <div className="mx-auto flex size-10 items-center justify-center rounded-lg border bg-muted/40">
          <FolderOpen className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <AppLink href={paths.projects()} className={buttonVariants({ size: "sm" })}>
          <FolderKanban className="size-4" />
          {t("action")}
        </AppLink>
      </div>
    </div>
  );
}

export function EmptyRows({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-2 border-t text-sm text-muted-foreground">
      <Icon className="size-4" />
      {label}
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-11 items-center gap-1 px-4 py-2 text-sm sm:grid-cols-[180px_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}
