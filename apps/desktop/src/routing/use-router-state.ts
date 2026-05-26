"use client";

import { useSyncExternalStore } from "react";
import type { DataRouter } from "react-router-dom";

export function useDesktopRouterState(router: DataRouter) {
  return useSyncExternalStore(
    (onStoreChange) => router.subscribe(() => onStoreChange()),
    () => router.state,
    () => router.state,
  );
}
