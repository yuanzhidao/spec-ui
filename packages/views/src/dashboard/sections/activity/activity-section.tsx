"use client";

import { Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProjectEvent } from "@spec-ui/core/dashboard/types";
import { Badge } from "@spec-ui/ui/badge";
import { EmptyRows, SectionHeader } from "../shared/section-shared";

export function ActivitySection({ activity }: { activity: ProjectEvent[] }) {
  const t = useTranslations("activity");

  return (
    <div>
      <SectionHeader title={t("title")} description={t("description")} />
      {activity.length === 0 ? (
        <EmptyRows icon={Activity} label={t("empty")} />
      ) : (
        <div className="divide-y">
          {activity.map((event) => (
            <ActivityRow key={`${event.timestamp}-${event.filePath}`} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ event }: { event: ProjectEvent }) {
  return (
    <div className="flex min-h-12 items-center gap-3 px-4 py-2 transition-colors hover:bg-accent/50">
      <Activity className="size-4 shrink-0 text-muted-foreground" />
      <Badge variant="secondary" className="h-5 rounded text-[11px]">
        {event.eventType}
      </Badge>
      {event.scopeLabel ? (
        <Badge variant="outline" className="h-5 rounded text-[11px]">
          {event.scopeLabel}
        </Badge>
      ) : null}
      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{event.filePath}</p>
      <span className="shrink-0 text-xs text-muted-foreground">
        {new Date(event.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}
