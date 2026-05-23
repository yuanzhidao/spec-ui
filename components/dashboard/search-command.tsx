"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import type { DashboardData } from "@/lib/dashboard-types";
import { dashboardSectionIds, paths } from "@/lib/routes";
import { useNavigation } from "@/lib/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations("sidebar");

  return (
    <SidebarMenuButton
      type="button"
      className="text-muted-foreground"
      onClick={onOpen}
    >
      <Search className="size-4" />
      <span className="min-w-0 flex-1 truncate text-left">{t("search")}</span>
      <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
        ⌘K
      </kbd>
    </SidebarMenuButton>
  );
}

export function SearchCommand({
  open,
  onOpenChange,
  data,
  onRunValidation,
  onFocusProject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DashboardData;
  onRunValidation: () => void;
  onFocusProject: (path: string | null) => void;
}) {
  const t = useTranslations("search");
  const navT = useTranslations("navigation.sections");
  const nav = useNavigation();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      onOpenChange(!open);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  function choose(action: () => void) {
    action();
    onOpenChange(false);
  }

  function openSection(section: (typeof dashboardSectionIds)[number]) {
    nav.push(paths.section(section));
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      className="top-[20%] translate-y-0 sm:max-w-xl!"
    >
      <Command>
        <CommandInput placeholder={t("placeholder")} />
        <CommandList>
          <CommandEmpty>{t("empty")}</CommandEmpty>
          <CommandGroup heading={t("groups.sections")}>
            {dashboardSectionIds.map((section) => (
              <CommandItem key={section} onSelect={() => choose(() => openSection(section))}>
                {navT(section)}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t("groups.commands")}>
            <CommandItem onSelect={() => choose(() => onFocusProject(null))}>
              {t("commands.showAllProjects")}
            </CommandItem>
            <CommandItem onSelect={() => choose(onRunValidation)}>
              {t("commands.runValidation")}
            </CommandItem>
            <CommandItem onSelect={() => choose(() => openSection("validation"))}>
              {t("commands.openValidation")}
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t("groups.projects")}>
            {data.projects.map((project) => (
              <CommandItem
                key={project.project.path}
                value={`project ${project.project.name} ${project.project.path}`}
                onSelect={() => choose(() => onFocusProject(project.project.path))}
              >
                {project.project.name}
              </CommandItem>
            ))}
            {data.projects.length === 0 ? <CommandItem disabled>{t("emptyStates.projects")}</CommandItem> : null}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t("groups.changes")}>
            {data.changes.map((change) => (
              <CommandItem
                key={change.id}
                value={`change ${change.id} ${change.title}`}
                onSelect={() => choose(() => openSection("changes"))}
              >
                {change.title}
              </CommandItem>
            ))}
            {data.changes.length === 0 ? <CommandItem disabled>{t("emptyStates.changes")}</CommandItem> : null}
          </CommandGroup>
          <CommandGroup heading={t("groups.specs")}>
            {data.specs.map((spec) => (
              <CommandItem
                key={spec.id}
                value={`spec ${spec.id} ${spec.title}`}
                onSelect={() => choose(() => openSection("specs"))}
              >
                {spec.title}
              </CommandItem>
            ))}
            {data.specs.length === 0 ? <CommandItem disabled>{t("emptyStates.specs")}</CommandItem> : null}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
