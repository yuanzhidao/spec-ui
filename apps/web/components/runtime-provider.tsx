"use client";

import { RuntimeDashboardProvider } from "@spec-ui/core/runtime/dashboard-provider";
import type { ReactNode } from "react";
import { webRuntimeClient } from "../runtime-client";

export function WebRuntimeProvider({ children }: { children: ReactNode }) {
  return (
    <RuntimeDashboardProvider client={webRuntimeClient}>
      {children}
    </RuntimeDashboardProvider>
  );
}
