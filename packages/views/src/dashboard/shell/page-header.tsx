"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProjectBinding } from "@spec-ui/core/dashboard/types";
import type { DashboardSection } from "@spec-ui/core/navigation/routes";
import { SidebarTrigger } from "@spec-ui/ui/sidebar";
import { AppLink } from "@spec-ui/views/navigation/app-link";
import { cn } from "@spec-ui/core/shared/utils";

export type PageHeaderBreadcrumb = {
  label: string;
  href?: string;
  tone?: "muted" | "default";
};

export type PageHeaderProgress = {
  label: string;
  value: number;
};

export function PageHeader({
  section,
  description,
  project,
  backHref,
  breadcrumbs,
  title,
  meta,
  progress,
  actions,
}: {
  section: DashboardSection;
  description?: string;
  project?: ProjectBinding;
  backHref?: string;
  breadcrumbs?: PageHeaderBreadcrumb[];
  title?: string;
  meta?: string;
  progress?: PageHeaderProgress;
  actions?: React.ReactNode;
}) {
  const t = useTranslations("navigation.sections");
  const tHeader = useTranslations("header");
  const routeItems = breadcrumbs || [
    ...(project ? [{ label: project.name, tone: "muted" as const }] : []),
    { label: t(section), tone: "default" as const },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3 lg:px-4">
      <SidebarTrigger className="md:hidden" />
      {backHref ? (
        <AppLink
          href={backHref}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={tHeader("back")}
        >
          <ArrowLeft className="size-4" />
        </AppLink>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        {routeItems.map((item, index) => (
          <div key={`${item.label}:${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 ? <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" /> : null}
            {item.href ? (
              <AppLink
                href={item.href}
                className={cn(
                  "min-w-0 truncate transition-colors hover:text-foreground",
                  item.tone === "default" ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </AppLink>
            ) : (
              <span
                className={cn(
                  "min-w-0 truncate",
                  item.tone === "default" ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            )}
          </div>
        ))}
        {title ? (
          <>
            <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />
            <h1 className="min-w-0 truncate font-medium text-foreground">{title}</h1>
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!backHref && !title && description ? (
          <span className="hidden max-w-[36rem] truncate text-xs text-muted-foreground lg:inline">
            {description}
          </span>
        ) : null}
        {progress ? (
          <div className="hidden w-36 items-center gap-2 md:flex">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-brand" style={{ width: `${progress.value}%` }} />
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">{progress.label}</span>
          </div>
        ) : null}
        {meta ? (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {meta}
          </span>
        ) : null}
        {actions}
      </div>
    </header>
  );
}
