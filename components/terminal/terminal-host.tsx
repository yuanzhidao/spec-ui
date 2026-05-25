"use client";

import { I18nProvider } from "@/components/providers/i18n-provider";
import { useRuntimeDashboard } from "@/lib/hooks/use-runtime-dashboard";
import { TerminalDock } from "./terminal-dock";

export function TerminalHost() {
  const runtime = useRuntimeDashboard();
  const snapshot = runtime.snapshot;
  const locale = snapshot?.settings.language || "en";
  const projectContextReady = Boolean(snapshot || runtime.error);

  return (
    <I18nProvider locale={locale}>
      <TerminalDock
        focusedProjectPath={snapshot?.dashboard.focusedProjectPath ?? null}
        projectContextReady={projectContextReady}
      />
    </I18nProvider>
  );
}
