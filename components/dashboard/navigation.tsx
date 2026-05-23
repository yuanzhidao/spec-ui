"use client";

import {
  Activity,
  CheckCircle2,
  FileText,
  FolderKanban,
  ListTodo,
  Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { DashboardSection } from "@/lib/routes";
import { paths } from "@/lib/routes";
import { AppLink } from "@/components/navigation/app-link";

type SectionItem = {
  id: DashboardSection;
  icon: React.ComponentType<{ className?: string }>;
};

export const sections: SectionItem[] = [
  { id: "specs", icon: FileText },
  { id: "changes", icon: ListTodo },
  { id: "projects", icon: FolderKanban },
  { id: "activity", icon: Activity },
  { id: "validation", icon: CheckCircle2 },
  { id: "settings", icon: Settings },
];

const groups: Array<{ label: "workbench" | "operate"; items: SectionItem[] }> = [
  {
    label: "workbench",
    items: sections.filter((section) =>
      ["specs", "changes", "projects", "activity"].includes(section.id),
    ),
  },
  {
    label: "operate",
    items: sections.filter((section) =>
      ["validation", "settings"].includes(section.id),
    ),
  },
];

export function DashboardNavigation({
  active,
}: {
  active: DashboardSection;
}) {
  const t = useTranslations("navigation");

  return (
    <nav>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{t(`groups.${group.label}`)}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((section) => {
                const Icon = section.icon;
                const selected = active === section.id;

                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      active={selected}
                      render={<AppLink href={paths.section(section.id)} />}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{t(`sections.${section.id}`)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </nav>
  );
}
