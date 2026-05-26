"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@spec-ui/ui/badge";

export function RealtimeStatus({
  connection,
  watcher,
}: {
  connection: string;
  watcher: string;
}) {
  const t = useTranslations("status");
  const connected = connection === "connected" && watcher === "watching";

  return (
    <Badge variant="outline" className="h-7 gap-1.5 rounded-md px-2 text-xs">
      {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {connected ? t("realtime") : `${connection}/${watcher}`}
    </Badge>
  );
}
