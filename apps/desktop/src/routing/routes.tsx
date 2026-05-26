"use client";

import { createMemoryRouter, Navigate } from "react-router-dom";
import { useNavigation } from "@spec-ui/core/navigation/provider";
import { parseDashboardRoute, paths } from "@spec-ui/core/navigation/routes";
import { DashboardWorkbench } from "@spec-ui/views/dashboard/shell/workbench";
import { desktopRouteHandles } from "./route-handles";

const ROUTE_BASE_URL = "http://spec-ui.local";

export function createDesktopRouter() {
  return createMemoryRouter(
    [
      {
        path: "/",
        element: <Navigate to={paths.specs()} replace />,
        handle: desktopRouteHandles.specs,
      },
      {
        path: "/specs",
        element: <DesktopDashboardRoute />,
        handle: desktopRouteHandles.specs,
      },
      {
        path: "/specs/:projectId/:specId",
        element: <DesktopDashboardRoute />,
        handle: desktopRouteHandles.specDetail,
      },
      {
        path: "/changes",
        element: <DesktopDashboardRoute />,
        handle: desktopRouteHandles.changes,
      },
      {
        path: "/changes/:projectId/:changeId",
        element: <DesktopDashboardRoute />,
        handle: desktopRouteHandles.changeDetail,
      },
      {
        path: "/projects",
        element: <DesktopDashboardRoute />,
        handle: desktopRouteHandles.projects,
      },
      {
        path: "/activity",
        element: <DesktopDashboardRoute />,
        handle: desktopRouteHandles.activity,
      },
      {
        path: "/validation",
        element: <DesktopDashboardRoute />,
        handle: desktopRouteHandles.validation,
      },
      {
        path: "/settings",
        element: <DesktopDashboardRoute />,
        handle: desktopRouteHandles.settings,
      },
      {
        path: "*",
        element: <Navigate to={paths.specs()} replace />,
      },
    ],
    {
      initialEntries: [readInitialRoutePath()],
    },
  );
}

function DesktopDashboardRoute() {
  const navigation = useNavigation();
  const route = parseDashboardRoute(navigation.pathname, navigation.searchParams);

  return (
    <DashboardWorkbench
      initialSection={route.section}
      specDetail={route.specDetail}
      changeDetail={route.changeDetail}
    />
  );
}

function readInitialRoutePath() {
  const hashPath = window.location.hash.slice(1);
  if (hashPath) {
    return normalizeRoutePath(hashPath);
  }

  const path = `${window.location.pathname}${window.location.search}`;
  return normalizeRoutePath(path);
}

function normalizeRoutePath(path: string) {
  const url = new URL(path || paths.specs(), ROUTE_BASE_URL);
  const pathname = url.pathname === "/" || url.pathname === "/index.html"
    ? paths.specs()
    : url.pathname;

  return `${pathname}${url.search}`;
}
