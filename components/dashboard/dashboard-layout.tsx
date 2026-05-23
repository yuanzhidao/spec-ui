"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { NavigationProgress } from "@/components/navigation/navigation-progress";

export function DashboardLayout({
  sidebar,
  header,
  children,
}: {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset className="h-dvh overflow-hidden md:h-[calc(100dvh-1rem)]">
        <NavigationProgress />
        {header}
        <ScrollArea className="min-h-0 flex-1">
          <main className="min-h-0">{children}</main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
