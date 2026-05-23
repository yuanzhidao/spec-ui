"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Clock3,
  Columns3,
  FileText,
  Filter,
  FolderKanban,
  FolderTree,
  List,
  ListTodo,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  DashboardData,
  NormalizedChange,
  NormalizedScopedChange,
  NormalizedSpec,
} from "@/lib/dashboard-types";
import { AppLink } from "@/components/navigation/app-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { paths } from "@/lib/routes";
import { EmptyRows, PresenceBadge, relativeOpenSpecPath } from "../shared";

type BoardMode = "board" | "list";
type WorkboardSortMode = "createdAt" | "updatedAt" | "name";
export type WorkboardKind = "specs" | "changes";
type WorkboardItem = NormalizedSpec | NormalizedChange;

type WorkboardColumn = {
  project: DashboardData["projects"][number];
  items: WorkboardItem[];
};

export function WorkboardSection({
  data,
  kind,
}: {
  data: DashboardData;
  kind: WorkboardKind;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<BoardMode>("board");
  const [sortMode, setSortMode] = useState<WorkboardSortMode>("createdAt");
  const [showMetadata, setShowMetadata] = useState(true);

  const columns = useMemo(
    () => projectWorkColumns(data, kind, query, sortMode),
    [data, kind, query, sortMode],
  );
  const visibleCount = columns.reduce((sum, column) => sum + column.items.length, 0);
  const totalCount = kind === "specs" ? data.specs.length : data.changes.length;

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <WorkboardToolbar
        kind={kind}
        query={query}
        onQueryChange={setQuery}
        mode={mode}
        onModeChange={setMode}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        showMetadata={showMetadata}
        onShowMetadataChange={setShowMetadata}
        visibleCount={visibleCount}
        totalCount={totalCount}
      />
      {mode === "board" ? (
        <WorkboardBoard kind={kind} columns={columns} showMetadata={showMetadata} />
      ) : (
        <WorkboardList kind={kind} columns={columns} showMetadata={showMetadata} />
      )}
    </div>
  );
}

function WorkboardToolbar({
  kind,
  query,
  onQueryChange,
  mode,
  onModeChange,
  sortMode,
  onSortModeChange,
  showMetadata,
  onShowMetadataChange,
  visibleCount,
  totalCount,
}: {
  kind: WorkboardKind;
  query: string;
  onQueryChange: (query: string) => void;
  mode: BoardMode;
  onModeChange: (mode: BoardMode) => void;
  sortMode: WorkboardSortMode;
  onSortModeChange: (mode: WorkboardSortMode) => void;
  showMetadata: boolean;
  onShowMetadataChange: (show: boolean) => void;
  visibleCount: number;
  totalCount: number;
}) {
  const t = useTranslations("workboard");
  const label = kind === "specs" ? t("specs") : t("changes");
  const filtered = query.trim().length > 0;

  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
      <div className="flex min-w-0 items-center gap-1.5">
        <Badge variant="secondary" className="h-6 rounded-full px-2 text-[11px]">
          {visibleCount}/{totalCount} {label}
        </Badge>
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <div className="relative hidden w-56 md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("searchPlaceholder", { kind: label })}
            className="h-8 rounded-md pl-8 text-xs"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="relative text-muted-foreground md:hidden"
          aria-label={t("filterAria", { label })}
        >
          <Filter className="size-4" />
          {filtered ? <span className="absolute right-1 top-1 size-1.5 rounded-full bg-brand" /> : null}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="text-muted-foreground"
                aria-label={t("displayOptions")}
              >
                <SlidersHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{t("display")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onShowMetadataChange(!showMetadata)}>
              {showMetadata ? t("hideMetadata") : t("showMetadata")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("sort.title")}</DropdownMenuLabel>
            <SortItem active={sortMode === "createdAt"} onClick={() => onSortModeChange("createdAt")} icon={<Clock3 className="size-4" />} label={t("sort.createdAt")} />
            <SortItem active={sortMode === "updatedAt"} onClick={() => onSortModeChange("updatedAt")} icon={<Clock3 className="size-4" />} label={t("sort.updatedAt")} />
            <SortItem active={sortMode === "name"} onClick={() => onSortModeChange("name")} icon={<List className="size-4" />} label={t("sort.name")} />
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>{t("groupByProject")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                {mode === "board" ? <Columns3 className="size-4" /> : <List className="size-4" />}
                <ChevronDown className="size-3" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("view")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onModeChange("board")}>
              <Columns3 className="size-4" />
              {t("board")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onModeChange("list")}>
              <List className="size-4" />
              {t("list")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function SortItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  const t = useTranslations("workboard.sort");

  return (
    <DropdownMenuItem onClick={onClick}>
      {icon}
      {label}
      {active ? <span className="ml-auto text-xs">{t("active")}</span> : null}
    </DropdownMenuItem>
  );
}

function WorkboardBoard({
  kind,
  columns,
  showMetadata,
}: {
  kind: WorkboardKind;
  columns: WorkboardColumn[];
  showMetadata: boolean;
}) {
  const t = useTranslations("workboard");
  const Icon = kind === "specs" ? FileText : ListTodo;
  const items = columns.flatMap((column) =>
    column.items.map((item) => ({
      key: `${column.project.project.path}:${item.id}`,
      project: column.project,
      item,
    })),
  );

  if (items.length === 0) {
    return <EmptyRows icon={Icon} label={kind === "specs" ? t("noSpecsFound") : t("noChangesFound")} />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto w-full space-y-2">
        {items.map(({ key, project, item }) =>
          kind === "specs" ? (
            <SpecCard key={key} spec={item as NormalizedSpec} showMetadata={showMetadata} />
          ) : (
            <ChangeCard
              key={key}
              change={item as NormalizedChange}
              showMetadata={showMetadata}
              showScopeProgress={project.scopes.length > 1}
            />
          ),
        )}
      </div>
    </div>
  );
}

function ScopedChangeProgressRows({ scopedChanges }: { scopedChanges: NormalizedScopedChange[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {scopedChanges.map((scopedChange) => (
        <ScopedChangeProgressRow key={`${scopedChange.scopeId}:${scopedChange.id}`} change={scopedChange} />
      ))}
    </div>
  );
}

function ScopedChangeProgressRow({ change }: { change: NormalizedScopedChange }) {
  const progress =
    change.taskSummary.total > 0
      ? Math.round((change.taskSummary.completed / change.taskSummary.total) * 100)
      : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <FolderTree className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{change.scopeLabel}</span>
        </span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {change.taskSummary.completed}/{change.taskSummary.total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
      </div>
      <p className="truncate text-[11px] text-muted-foreground">{change.title}</p>
    </div>
  );
}

function SpecCard({
  spec,
  showMetadata,
}: {
  spec: NormalizedSpec;
  showMetadata: boolean;
}) {
  const t = useTranslations("workboard");
  const content = (
    <article className="group/card rounded-lg border-[0.5px] border-border bg-card px-2.5 py-3 shadow-[0_3px_6px_-2px_rgba(0,0,0,0.02),0_1px_1px_0_rgba(0,0,0,0.04)] transition-colors hover:border-accent hover:bg-accent">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          <p className="truncate text-xs text-muted-foreground">{spec.displayId || spec.id}</p>
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
          {t("requirementsShort", { count: spec.requirementCount })}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{spec.title}</p>
      {showMetadata ? (
        <div className="mt-2 flex items-center gap-1.5">
          {spec.projectName ? (
            <span className="inline-flex max-w-[160px] items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
              <FolderKanban className="size-3" />
              <span className="truncate">{spec.projectName}</span>
            </span>
          ) : null}
          {spec.scopeLabel && spec.scopeLabel !== "root" ? (
            <span className="inline-flex max-w-[120px] items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
              <FolderTree className="size-3" />
              <span className="truncate">{spec.scopeLabel}</span>
            </span>
          ) : null}
          <span className="ml-auto truncate text-[11px] text-muted-foreground">
            {relativeOpenSpecPath(spec.sourcePath)}
          </span>
        </div>
      ) : null}
    </article>
  );

  if (!spec.projectId) {
    return content;
  }

  return (
    <AppLink href={paths.specDetail(spec.projectId, spec.id)} className="block">
      {content}
    </AppLink>
  );
}

function ChangeCard({
  change,
  showMetadata,
  showScopeProgress,
}: {
  change: NormalizedChange;
  showMetadata: boolean;
  showScopeProgress: boolean;
}) {
  const t = useTranslations("workboard");
  const progress =
    change.taskSummary.total > 0
      ? Math.round((change.taskSummary.completed / change.taskSummary.total) * 100)
      : 0;
  const scopedChanges = change.scopedChanges || [];
  const shouldShowScopeProgress = showScopeProgress && scopedChanges.length > 0;
  const content = (
    <article className="group/card rounded-lg border-[0.5px] border-border bg-card px-2.5 py-3 shadow-[0_3px_6px_-2px_rgba(0,0,0,0.02),0_1px_1px_0_rgba(0,0,0,0.04)] transition-colors hover:border-accent hover:bg-accent">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <ListTodo className="size-3.5 shrink-0 text-muted-foreground" />
          <p className="truncate text-xs text-muted-foreground">{change.id}</p>
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
          {change.taskSummary.completed}/{change.taskSummary.total}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{change.title}</p>
      {showMetadata ? (
        <>
          <div className="mt-2">
            {shouldShowScopeProgress ? (
              <ScopedChangeProgressRows scopedChanges={scopedChanges} />
            ) : (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PresenceBadge active={change.hasProposal}>{t("badges.proposal")}</PresenceBadge>
            <PresenceBadge active={change.hasDesign}>{t("badges.design")}</PresenceBadge>
            <PresenceBadge active={change.hasTasks}>{t("badges.tasks")}</PresenceBadge>
            {change.scopedChanges && change.scopedChanges.length > 1 ? (
              <PresenceBadge active>{t("badges.scopes", { count: change.scopedChanges.length })}</PresenceBadge>
            ) : null}
            <span className="ml-auto text-[11px] text-muted-foreground">
              {t("requirementsShort", { count: change.requirementCount })}
            </span>
          </div>
        </>
      ) : null}
    </article>
  );

  if (!change.projectId) {
    return content;
  }

  return (
    <AppLink href={paths.changeDetail(change.projectId, change.id)} className="block">
      {content}
    </AppLink>
  );
}

function WorkboardList({
  kind,
  columns,
  showMetadata,
}: {
  kind: WorkboardKind;
  columns: WorkboardColumn[];
  showMetadata: boolean;
}) {
  const t = useTranslations("workboard");
  const rows = columns.flatMap((column) =>
    column.items.map((item) => ({
      project: column.project,
      item,
    })),
  );
  const Icon = kind === "specs" ? FileText : ListTodo;

  if (rows.length === 0) {
    return <EmptyRows icon={Icon} label={kind === "specs" ? t("noSpecsFound") : t("noChangesFound")} />;
  }

  return (
    <div className="divide-y">
      {rows.map(({ project, item }) => {
        const content = (
          <div className="flex min-h-12 items-center gap-3 px-4 py-2 transition-colors hover:bg-accent/50">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.id}</p>
            </div>
            {showMetadata ? (
              <span className="hidden max-w-44 truncate text-xs text-muted-foreground md:inline">
                {project.project.name}
              </span>
            ) : null}
            <span className="shrink-0 text-xs text-muted-foreground">
              {kind === "specs"
                ? t("requirementsShort", { count: (item as NormalizedSpec).requirementCount })
                : `${(item as NormalizedChange).taskSummary.completed}/${(item as NormalizedChange).taskSummary.total}`}
            </span>
          </div>
        );

        const href =
          kind === "specs"
            ? paths.specDetail(project.project.id, item.id)
            : paths.changeDetail(project.project.id, item.id);

        return (
          <AppLink key={`${project.project.path}:${item.id}`} href={href} className="block">
            {content}
          </AppLink>
        );
      })}
    </div>
  );
}

function projectWorkColumns(
  data: DashboardData,
  kind: WorkboardKind,
  query: string,
  sortMode: WorkboardSortMode,
): WorkboardColumn[] {
  const visibleProjects = data.project
    ? data.projects.filter((project) => project.project.path === data.project?.path)
    : data.projects;
  const normalizedQuery = query.trim().toLowerCase();

  return visibleProjects.flatMap((project) => {
    const items: WorkboardItem[] = kind === "specs" ? project.specs : project.changes;

    return [{
      project,
      items: sortWorkboardItems(filterWorkboardItems(items, normalizedQuery), sortMode),
    }];
  });
}

function filterWorkboardItems(
  items: WorkboardItem[],
  normalizedQuery: string,
): WorkboardItem[] {
  return normalizedQuery
    ? items.filter((item) => workboardItemMatches(item, normalizedQuery))
    : items;
}

function sortWorkboardItems(
  items: WorkboardItem[],
  sortMode: WorkboardSortMode,
): WorkboardItem[] {
  return [...items].sort((first, second) => {
    if (sortMode === "name") {
      return first.title.localeCompare(second.title, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }

    const field = sortMode === "updatedAt" ? "updatedAt" : "createdAt";
    return Date.parse(second[field]) - Date.parse(first[field]);
  });
}

function workboardItemMatches(item: WorkboardItem, query: string) {
  return [
    item.id,
    item.title,
    item.projectName,
    item.scopeLabel,
    "displayId" in item ? item.displayId : undefined,
    "sourcePath" in item ? item.sourcePath : undefined,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}
