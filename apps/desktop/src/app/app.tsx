"use client";

import { useMemo } from "react";
import { ThemeProvider } from "@spec-ui/views/providers/theme-provider";
import { RuntimeDashboardProvider } from "@spec-ui/core/runtime/dashboard-provider";
import { createDesktopRouter } from "../routing/routes";
import { DesktopShell } from "./shell";
import { desktopRuntimeClient } from "../runtime/client";

export function DesktopApp() {
  const router = useMemo(() => createDesktopRouter(), []);

  return (
    <ThemeProvider>
      <RuntimeDashboardProvider client={desktopRuntimeClient}>
        <DesktopShell router={router} />
      </RuntimeDashboardProvider>
    </ThemeProvider>
  );
}
