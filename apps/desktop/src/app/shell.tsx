"use client";

import { useEffect } from "react";
import { RouterProvider, type DataRouter } from "react-router-dom";
import { DesktopNavigationProvider } from "../routing/navigation-provider";
import {
  formatDesktopDocumentTitle,
  readDesktopRouteHandle,
} from "../routing/route-handles";
import { TerminalHost } from "../terminal/terminal-host";
import { useDesktopRouterState } from "../routing/use-router-state";

export function DesktopShell({ router }: { router: DataRouter }) {
  const routerState = useDesktopRouterState(router);
  const routeHandle = readDesktopRouteHandle(routerState.matches);

  useEffect(() => {
    document.title = formatDesktopDocumentTitle(routeHandle);
  }, [routeHandle]);

  return (
    <div
      data-slot="desktop-shell"
      data-route-label={routeHandle.label}
      className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground"
    >
      <DesktopNavigationProvider router={router}>
        <div data-slot="desktop-route-region" className="min-h-0 flex-1 overflow-hidden">
          <RouterProvider router={router} />
        </div>
        <div data-slot="desktop-overlay-root">
          <TerminalHost />
        </div>
      </DesktopNavigationProvider>
    </div>
  );
}
