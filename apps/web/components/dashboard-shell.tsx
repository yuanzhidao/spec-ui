"use client";

import type { NormalizedChangeLifecycle } from "@spec-ui/core/dashboard/types";
import type { DashboardSection } from "@spec-ui/core/navigation/routes";
import { DashboardWorkbench } from "@spec-ui/views/dashboard/shell/workbench";
import { WebNavigationProvider } from "./navigation-provider";

export function DashboardShell({
  initialSection = "specs",
  specDetail,
  changeDetail,
}: {
  initialSection?: DashboardSection;
  specDetail?: {
    projectId: string;
    specId: string;
  };
  changeDetail?: {
    projectId: string;
    changeId: string;
    lifecycle: NormalizedChangeLifecycle;
  };
}) {
  return (
    <WebNavigationProvider>
      <DashboardWorkbench
        initialSection={initialSection}
        specDetail={specDetail}
        changeDetail={changeDetail}
      />
    </WebNavigationProvider>
  );
}
