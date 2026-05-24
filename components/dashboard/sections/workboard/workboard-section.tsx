"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ChevronDown,
  Clock3,
  Columns3,
  FileText,
  Filter,
  FolderKanban,
  FolderTree,
  GitBranch,
  List,
  ListTodo,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  DashboardData,
  NormalizedChange,
  NormalizedChangeLifecycle,
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
import {
  EmptyRows,
  HoverExpandFrame,
  MotionCollapse,
  PresenceBadge,
  relativeOpenSpecPath,
} from "../shared";

type BoardMode = "board" | "list";
type WorkboardSortMode = "createdAt" | "updatedAt" | "name";
export type WorkboardKind = "specs" | "changes";
type WorkboardItem = NormalizedSpec | NormalizedChange;

type WorkboardColumn = {
  project: DashboardData["projects"][number];
  items: WorkboardItem[];
};

type WorkboardRow = {
  key: string;
  project: DashboardData["projects"][number];
  item: WorkboardItem;
};

type ChangeWorkboardRow = WorkboardRow & {
  item: NormalizedChange;
};

const changeLifecycles: NormalizedChangeLifecycle[] = ["active", "archived"];

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
  const items = workboardRows(columns);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<NormalizedChangeLifecycle, boolean>>({
    active: false,
    archived: false,
  });

  if (items.length === 0) {
    return <EmptyRows icon={Icon} label={kind === "specs" ? t("noSpecsFound") : t("noChangesFound")} />;
  }

  if (kind === "changes") {
    const changeRows = changeWorkboardRows(items);

    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full space-y-4">
          {changeLifecycles.map((lifecycle) => (
            <ChangeLifecycleBoardGroup
              key={lifecycle}
              lifecycle={lifecycle}
              rows={changeRows.filter((row) => row.item.lifecycle === lifecycle)}
              collapsed={collapsedGroups[lifecycle]}
              showMetadata={showMetadata}
              onToggle={() =>
                setCollapsedGroups((current) => ({
                  ...current,
                  [lifecycle]: !current[lifecycle],
                }))
              }
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto w-full space-y-2">
        {items.map(({ key, item }) => (
          <SpecCard key={key} spec={item as NormalizedSpec} showMetadata={showMetadata} />
        ))}
      </div>
    </div>
  );
}

function ChangeLifecycleBoardGroup({
  lifecycle,
  rows,
  collapsed,
  showMetadata,
  onToggle,
}: {
  lifecycle: NormalizedChangeLifecycle;
  rows: ChangeWorkboardRow[];
  collapsed: boolean;
  showMetadata: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="space-y-2">
      <ChangeLifecycleHeader lifecycle={lifecycle} count={rows.length} collapsed={collapsed} onToggle={onToggle} />
      <MotionCollapse open={!collapsed}>
        {rows.length > 0 ? (
          <div className="space-y-2">
            {rows.map(({ key, item }) => (
              <ChangeCard
                key={key}
                change={item}
                showMetadata={showMetadata}
                showScopeProgress={(item.scopedChanges?.length ?? 0) > 1}
              />
            ))}
          </div>
        ) : (
          <EmptyLifecycleGroup lifecycle={lifecycle} />
        )}
      </MotionCollapse>
    </section>
  );
}

function ChangeLifecycleHeader({
  lifecycle,
  count,
  collapsed,
  onToggle,
}: {
  lifecycle: NormalizedChangeLifecycle;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("workboard.groups");
  const Icon = lifecycle === "active" ? ListTodo : Archive;

  return (
    <button
      type="button"
      className="flex h-9 w-full items-center justify-between gap-3 border-b px-1 text-left text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={onToggle}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{t(lifecycle)}</span>
        <Badge variant="secondary" className="h-5 shrink-0 rounded px-1.5 text-[10px] tabular-nums">
          {count}
        </Badge>
      </span>
      <ChevronDown className={`size-3.5 shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
    </button>
  );
}

function EmptyLifecycleGroup({ lifecycle }: { lifecycle: NormalizedChangeLifecycle }) {
  const t = useTranslations("workboard.groupsEmpty");

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
      {t(lifecycle)}
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
            <HoverExpandFrame compactWidth={160} expandedWidth={280} title={spec.projectName}>
              <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                <FolderKanban className="size-3 shrink-0" />
                <span className="truncate">{spec.projectName}</span>
              </span>
            </HoverExpandFrame>
          ) : null}
          {spec.scopeLabel && spec.scopeLabel !== "root" ? (
            <HoverExpandFrame compactWidth={120} expandedWidth={240} title={spec.scopeLabel}>
              <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                <FolderTree className="size-3 shrink-0" />
                <span className="truncate">{spec.scopeLabel}</span>
              </span>
            </HoverExpandFrame>
          ) : null}
          {spec.checkoutKind === "worktree" && spec.checkoutLabel ? (
            <HoverExpandFrame compactWidth={140} expandedWidth={260} title={spec.checkoutLabel}>
              <PresenceBadge active tone="success" className="max-w-full min-w-0">
                <GitBranch className="size-3" />
                <span className="truncate">{spec.checkoutLabel}</span>
              </PresenceBadge>
            </HoverExpandFrame>
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
            {change.scopedChanges && change.scopedChanges.length > 1 ? (
              <PresenceBadge active>{t("badges.scopes", { count: change.scopedChanges.length })}</PresenceBadge>
            ) : null}
            {change.checkoutSources?.filter((source) => source.checkoutKind === "worktree").map((source) => (
              <HoverExpandFrame
                key={source.checkoutId}
                compactWidth={140}
                expandedWidth={260}
                title={source.checkoutLabel}
              >
                <PresenceBadge active tone="success" className="max-w-full min-w-0">
                  <GitBranch className="size-3" />
                  <span className="truncate">{source.checkoutLabel}</span>
                </PresenceBadge>
              </HoverExpandFrame>
            ))}
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
    <AppLink href={paths.changeDetail(change.projectId, change.id, change.lifecycle)} className="block">
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
  const rows = workboardRows(columns);
  const Icon = kind === "specs" ? FileText : ListTodo;
  const [collapsedGroups, setCollapsedGroups] = useState<Record<NormalizedChangeLifecycle, boolean>>({
    active: false,
    archived: false,
  });

  if (rows.length === 0) {
    return <EmptyRows icon={Icon} label={kind === "specs" ? t("noSpecsFound") : t("noChangesFound")} />;
  }

  if (kind === "changes") {
    const changeRows = changeWorkboardRows(rows);

    return (
      <div className="divide-y">
        {changeLifecycles.map((lifecycle) => (
          <ChangeLifecycleListGroup
            key={lifecycle}
            lifecycle={lifecycle}
            rows={changeRows.filter((row) => row.item.lifecycle === lifecycle)}
            collapsed={collapsedGroups[lifecycle]}
            showMetadata={showMetadata}
            onToggle={() =>
              setCollapsedGroups((current) => ({
                ...current,
                [lifecycle]: !current[lifecycle],
              }))
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y">
      {rows.map(({ project, item }) => {
        return (
          <WorkboardListRow
            key={workboardItemKey(project, item)}
            kind={kind}
            project={project}
            item={item}
            showMetadata={showMetadata}
          />
        );
      })}
    </div>
  );
}

function ChangeLifecycleListGroup({
  lifecycle,
  rows,
  collapsed,
  showMetadata,
  onToggle,
}: {
  lifecycle: NormalizedChangeLifecycle;
  rows: ChangeWorkboardRow[];
  collapsed: boolean;
  showMetadata: boolean;
  onToggle: () => void;
}) {
  return (
    <section>
      <div className="px-4">
        <ChangeLifecycleHeader lifecycle={lifecycle} count={rows.length} collapsed={collapsed} onToggle={onToggle} />
      </div>
      <MotionCollapse open={!collapsed}>
        {rows.length > 0 ? (
          <div className="divide-y">
            {rows.map(({ key, project, item }) => (
              <WorkboardListRow
                key={key}
                kind="changes"
                project={project}
                item={item}
                showMetadata={showMetadata}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-2">
            <EmptyLifecycleGroup lifecycle={lifecycle} />
          </div>
        )}
      </MotionCollapse>
    </section>
  );
}

function WorkboardListRow({
  kind,
  project,
  item,
  showMetadata,
}: {
  kind: WorkboardKind;
  project: DashboardData["projects"][number];
  item: WorkboardItem;
  showMetadata: boolean;
}) {
  const t = useTranslations("workboard");
  const Icon = kind === "specs" ? FileText : ListTodo;
  const href =
    kind === "specs"
      ? paths.specDetail(project.project.id, item.id)
      : paths.changeDetail(
          project.project.id,
          item.id,
          (item as NormalizedChange).lifecycle,
        );
  const metric =
    kind === "specs"
      ? t("requirementsShort", { count: (item as NormalizedSpec).requirementCount })
      : `${(item as NormalizedChange).taskSummary.completed}/${(item as NormalizedChange).taskSummary.total}`;

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
      <span className="shrink-0 text-xs text-muted-foreground">{metric}</span>
    </div>
  );

  return (
    <AppLink href={href} className="block">
      {content}
    </AppLink>
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
    "lifecycle" in item ? item.lifecycle : undefined,
    "displayId" in item ? item.displayId : undefined,
    "sourcePath" in item ? item.sourcePath : undefined,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

function workboardRows(columns: WorkboardColumn[]): WorkboardRow[] {
  return columns.flatMap((column) =>
    column.items.map((item) => ({
      key: workboardItemKey(column.project, item),
      project: column.project,
      item,
    })),
  );
}

function workboardItemKey(
  project: DashboardData["projects"][number],
  item: WorkboardItem,
): string {
  const lifecycle = "lifecycle" in item ? item.lifecycle : "spec";
  return `${project.project.path}:${lifecycle}:${item.id}`;
}

function changeWorkboardRows(rows: WorkboardRow[]): ChangeWorkboardRow[] {
  return rows.filter((row): row is ChangeWorkboardRow => "lifecycle" in row.item);
}
