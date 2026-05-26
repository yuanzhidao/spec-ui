"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@spec-ui/ui/skeleton";

export function DashboardContentLoading() {
  const t = useTranslations("loading");

  return (
    <div
      className="flex min-h-[calc(100dvh-3rem)] flex-col"
      aria-busy="true"
      aria-label={t("workspace")}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="hidden h-8 w-56 rounded-md md:block" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-12 rounded-md" />
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {["alpha", "beta", "gamma"].map((column, index) => (
          <section
            key={column}
            className="flex w-[280px] shrink-0 flex-col rounded-xl bg-muted/40 p-2"
          >
            <div className="mb-2 flex items-center justify-between gap-2 px-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <Skeleton className="size-[18px] rounded-full" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              <Skeleton className="size-4 rounded" />
            </div>
            <div className="min-h-[280px] flex-1 space-y-2 rounded-lg p-1">
              {Array.from({ length: index === 1 ? 2 : 3 }).map((_, itemIndex) => (
                <div key={itemIndex} className="rounded-lg border bg-card p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-4/5 rounded" />
                      <Skeleton className="h-3 w-2/3 rounded" />
                    </div>
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-3 w-14 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function SidebarProjectSwitcherLoading() {
  const t = useTranslations("loading");

  return (
    <div
      className="flex h-9 w-full min-w-0 items-center gap-2 rounded-md px-2"
      aria-busy="true"
      aria-label={t("projectContext")}
    >
      <Skeleton className="size-6 shrink-0 rounded" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24 rounded" />
        <Skeleton className="h-2.5 w-16 rounded" />
      </div>
      <Skeleton className="size-3.5 shrink-0 rounded" />
    </div>
  );
}
