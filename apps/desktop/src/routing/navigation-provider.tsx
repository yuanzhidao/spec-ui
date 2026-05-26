"use client";

import { useMemo } from "react";
import type { DataRouter } from "react-router-dom";
import { NavigationProvider, type NavigationAdapter } from "@spec-ui/core/navigation/provider";
import { useDesktopRouterState } from "./use-router-state";

export function DesktopNavigationProvider({
  router,
  children,
}: {
  router: DataRouter;
  children: React.ReactNode;
}) {
  const location = useDesktopRouterState(router).location;

  const adapter = useMemo<NavigationAdapter>(
    () => ({
      pathname: location.pathname,
      searchParams: new URLSearchParams(location.search),
      push: (path) => {
        void router.navigate(path);
      },
      replace: (path) => {
        void router.navigate(path, { replace: true });
      },
      back: () => {
        void router.navigate(-1);
      },
      prefetch: () => undefined,
    }),
    [location, router],
  );

  return <NavigationProvider value={adapter}>{children}</NavigationProvider>;
}
