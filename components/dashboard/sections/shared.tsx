"use client";

import { Clock3, FolderKanban, FolderOpen } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ValidationResult } from "@/lib/dashboard-types";
import { AppLink } from "@/components/navigation/app-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { paths } from "@/lib/routes";
import { cn } from "@/lib/utils";

const hoverExpandTransition = { type: "tween", duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } as const;
const collapseHeightTransition = { type: "tween", duration: 0.24, ease: [0.32, 0.72, 0, 1] } as const;
const collapseContentTransition = { type: "tween", duration: 0.18, ease: [0.22, 1, 0.36, 1] } as const;

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

export function HoverExpandFrame({
  compactWidth,
  expandedWidth,
  className,
  title,
  children,
}: {
  compactWidth: number;
  expandedWidth: number;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      className={cn("inline-flex min-w-0 max-w-full shrink overflow-hidden", className)}
      title={title}
      initial={false}
      style={{ maxWidth: compactWidth }}
      whileHover={{ maxWidth: expandedWidth }}
      transition={reduceMotion ? { duration: 0 } : hoverExpandTransition}
    >
      {children}
    </motion.span>
  );
}

export function MotionCollapse({
  open,
  className,
  children,
}: {
  open: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const heightTransition = reduceMotion ? { duration: 0 } : collapseHeightTransition;
  const contentTransition = reduceMotion ? { duration: 0 } : collapseContentTransition;

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          className={cn("overflow-hidden", className)}
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          exit={{ height: 0 }}
          transition={heightTransition}
        >
          <motion.div
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={contentTransition}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function PresenceBadge({
  active,
  tone = "neutral",
  className,
  children,
}: {
  active: boolean;
  tone?: "neutral" | "success" | "protocol";
  className?: string;
  children: React.ReactNode;
}) {
  const toneClass = {
    neutral: "",
    success: "border-status-success/20 bg-status-success/10 text-status-success",
    protocol: "border-brand/20 bg-brand/10 text-brand",
  }[tone];

  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className={cn("h-5 rounded text-[11px]", active && toneClass, className)}
    >
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
