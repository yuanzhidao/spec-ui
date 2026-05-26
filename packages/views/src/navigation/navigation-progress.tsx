"use client";

import { useIsNavigating } from "@spec-ui/core/navigation/provider";

export function NavigationProgress() {
  const isNavigating = useIsNavigating();

  return (
    <div
      aria-hidden
      data-visible={isNavigating ? "true" : "false"}
      className="navigation-progress pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 overflow-hidden opacity-0 transition-opacity duration-200 data-[visible=true]:opacity-100"
    >
      <div className="navigation-progress-sweep h-full w-1/3 bg-brand" />
    </div>
  );
}
