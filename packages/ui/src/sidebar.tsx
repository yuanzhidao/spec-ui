"use client";

import * as React from "react";
import { PanelLeft } from "lucide-react";
import { Button } from "@spec-ui/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@spec-ui/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spec-ui/ui/tooltip";
import { cn } from "@spec-ui/core/shared/utils";

const sidebarStateCookie = "spec_ui_sidebar";
const sidebarCookieMaxAge = 60 * 60 * 24 * 7;
const sidebarWidth = 256;
const sidebarWidthMin = 224;
const sidebarWidthMax = 380;
const sidebarWidthIcon = "3rem";
const sidebarWidthMobile = "19rem";
const sidebarWidthStorageKey = "spec_ui_sidebar_width";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  state: "expanded" | "collapsed";
  width: number;
  setWidth: (width: number) => void;
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider.");
  }

  return context;
}

export function SidebarProvider({
  defaultOpen = true,
  children,
  className,
  style,
}: {
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [open, setOpenState] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);
  const [width, setWidthState] = React.useState(sidebarWidth);
  const [isResizing, setIsResizing] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(sidebarWidthStorageKey);
    if (!stored) {
      return;
    }

    const next = Number.parseInt(stored, 10);
    if (Number.isFinite(next)) {
      const frame = window.requestAnimationFrame(() => {
        setWidthState(clampSidebarWidth(next));
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  const setOpen = React.useCallback((next: boolean) => {
    setOpenState(next);
    document.cookie = `${sidebarStateCookie}=${next}; path=/; max-age=${sidebarCookieMaxAge}`;
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((value) => !value);
      return;
    }
    setOpen(!open);
  }, [isMobile, open, setOpen]);

  const setWidth = React.useCallback((next: number) => {
    const clamped = clampSidebarWidth(next);
    setWidthState(clamped);
    window.localStorage.setItem(sidebarWidthStorageKey, String(clamped));
  }, []);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
      state: open ? "expanded" : "collapsed",
      width,
      setWidth,
      isResizing,
      setIsResizing,
    }),
    [isMobile, open, openMobile, setOpen, toggleSidebar, width, setWidth, isResizing],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": `${width}px`,
            "--sidebar-width-icon": sidebarWidthIcon,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "group/sidebar-wrapper flex min-h-dvh w-full bg-sidebar",
          isResizing && "select-none",
          className,
        )}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  children,
  className,
  collapsible = "offcanvas",
  variant = "inset",
}: {
  children: React.ReactNode;
  className?: string;
  collapsible?: "offcanvas" | "icon" | "none";
  variant?: "sidebar" | "inset";
}) {
  const { isMobile, openMobile, setOpenMobile, state } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-(--sidebar-width) p-0 text-sidebar-foreground [&>button]:hidden" style={{ "--sidebar-width": sidebarWidthMobile } as React.CSSProperties}>
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
          </SheetHeader>
          <div className="flex h-full w-full flex-col bg-sidebar">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  if (collapsible === "none") {
    return (
      <aside
        data-slot="sidebar"
        data-variant={variant}
        className={cn("flex h-dvh w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground", className)}
      >
        {children}
      </aside>
    );
  }

  return (
    <div
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      className="group/sidebar relative hidden text-sidebar-foreground md:block"
    >
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]/sidebar:w-0",
          "group-data-[collapsible=icon]/sidebar:w-(--sidebar-width-icon)",
        )}
      />
      <aside
        data-slot="sidebar-container"
        data-variant={variant}
        className={cn(
          "fixed inset-y-0 left-0 z-10 hidden w-(--sidebar-width) p-2 transition-[left,width] duration-200 ease-linear md:flex",
          "group-data-[collapsible=offcanvas]/sidebar:left-[calc(var(--sidebar-width)*-1)]",
          "group-data-[collapsible=icon]/sidebar:w-(--sidebar-width-icon)",
          className,
        )}
      >
        <div className="flex size-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground group-data-[variant=floating]/sidebar:rounded-lg group-data-[variant=floating]/sidebar:shadow-sm group-data-[variant=floating]/sidebar:ring-1 group-data-[variant=floating]/sidebar:ring-sidebar-border">
          {children}
        </div>
      </aside>
      <SidebarRail />
    </div>
  );
}

export function SidebarInset({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "relative flex min-h-dvh min-w-0 flex-1 flex-col bg-background md:m-2 md:ml-0 md:min-h-[calc(100dvh-1rem)] md:overflow-hidden md:rounded-xl",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className={className}
      onClick={toggleSidebar}
      aria-label="Toggle sidebar"
    >
      <PanelLeft className="size-4" />
    </Button>
  );
}

export function SidebarRail() {
  const { state, toggleSidebar, setWidth, setIsResizing } = useSidebar();
  const dragRef = React.useRef<{ startX: number; startWidth: number } | null>(null);
  const didDragRef = React.useRef(false);

  const onMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      didDragRef.current = false;
      const sidebar = (event.target as HTMLElement).closest("[data-slot='sidebar']");
      const container = sidebar?.querySelector("[data-slot='sidebar-container']");
      if (!container) {
        return;
      }

      dragRef.current = {
        startX: event.clientX,
        startWidth: container.getBoundingClientRect().width,
      };
      setIsResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current || state === "collapsed") {
          return;
        }

        didDragRef.current = true;
        const delta = moveEvent.clientX - dragRef.current.startX;
        setWidth(dragRef.current.startWidth + delta);
      };

      const onMouseUp = () => {
        dragRef.current = null;
        setIsResizing(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [setIsResizing, setWidth, state],
  );

  const handleClick = React.useCallback(() => {
    if (!didDragRef.current) {
      toggleSidebar();
    }
  }, [toggleSidebar]);

  return (
    <button
      type="button"
      aria-label="Toggle sidebar"
      onClick={handleClick}
      onMouseDown={onMouseDown}
      className={cn(
        "absolute inset-y-0 -right-4 z-40 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 hover:after:bg-sidebar-border md:block",
        "cursor-col-resize",
        "group-data-[collapsible=offcanvas]/sidebar:translate-x-0 group-data-[collapsible=offcanvas]/sidebar:after:left-full hover:group-data-[collapsible=offcanvas]/sidebar:bg-sidebar",
        "group-data-[collapsible=offcanvas]/sidebar:-right-2",
      )}
    />
  );
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("flex shrink-0 flex-col gap-2 p-2", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("min-h-0 flex-1 overflow-y-auto", className)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("flex shrink-0 flex-col gap-2 p-2", className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn("flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70", className)}
      {...props}
    />
  );
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group-content" className={cn("w-full text-sm", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-menu" className={cn("flex w-full min-w-0 flex-col gap-0.5", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-menu-item" className={className} {...props} />;
}

export function SidebarMenuButton({
  active,
  children,
  className,
  render,
  tooltip,
  ...props
}: React.ComponentProps<"button"> & {
  active?: boolean;
  render?: React.ReactElement<{ className?: string }>;
  tooltip?: string;
}) {
  const buttonClassName = cn(
    "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors",
    "text-sidebar-foreground/72 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    className,
    render?.props.className,
  );

  const sharedProps = {
    "data-active": active ? "true" : "false",
    "data-slot": "sidebar-menu-button",
    className: buttonClassName,
  };

  const button = render ? (
    React.cloneElement(render, sharedProps, children)
  ) : (
    <button type="button" {...sharedProps} {...props}>
      {children}
    </button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    React.useCallback(
      (callback) => {
        const media = window.matchMedia(query);
        const listener = () => callback();
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
      },
      [query],
    ),
    React.useCallback(() => window.matchMedia(query).matches, [query]),
    () => false,
  );
}

function clampSidebarWidth(width: number) {
  return Math.min(Math.max(width, sidebarWidthMin), sidebarWidthMax);
}
