export type DesktopRouteHandle = {
  title: string;
  label: string;
};

export const desktopRouteHandles = {
  specs: { title: "Specs", label: "Specs" },
  specDetail: { title: "Spec", label: "Spec" },
  changes: { title: "Changes", label: "Changes" },
  changeDetail: { title: "Change", label: "Change" },
  projects: { title: "Projects", label: "Projects" },
  activity: { title: "Activity", label: "Activity" },
  validation: { title: "Validation", label: "Validation" },
  settings: { title: "Settings", label: "Settings" },
} satisfies Record<string, DesktopRouteHandle>;

const fallbackHandle: DesktopRouteHandle = {
  title: "spec-ui",
  label: "spec-ui",
};

export function readDesktopRouteHandle(
  matches: readonly { handle?: unknown; route?: { handle?: unknown } }[],
): DesktopRouteHandle {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const handle = matches[index]?.handle ?? matches[index]?.route?.handle;
    if (isDesktopRouteHandle(handle)) {
      return handle;
    }
  }

  return fallbackHandle;
}

export function formatDesktopDocumentTitle(handle: DesktopRouteHandle) {
  return handle.title === fallbackHandle.title
    ? fallbackHandle.title
    : `${handle.title} - ${fallbackHandle.title}`;
}

function isDesktopRouteHandle(handle: unknown): handle is DesktopRouteHandle {
  return (
    typeof handle === "object" &&
    handle !== null &&
    "title" in handle &&
    "label" in handle &&
    typeof handle.title === "string" &&
    typeof handle.label === "string"
  );
}
