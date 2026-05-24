"use client";

import { CheckCircle2, CheckSquare2, FileText, FolderTree, ListTodo } from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  DashboardData,
  NormalizedChange,
  NormalizedChangeLifecycle,
} from "@/lib/dashboard-types";
import { AppLink } from "@/components/navigation/app-link";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { paths } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { EmptyRows, relativeOpenSpecPath } from "../shared";
import { MarkdownSection } from "./markdown";

export function ChangeDetailSection({
  data,
  projectId,
  changeId,
  lifecycle,
}: {
  data: DashboardData;
  projectId: string;
  changeId: string;
  lifecycle: NormalizedChangeLifecycle;
}) {
  const t = useTranslations("details.change");
  const project = data.projects.find((item) => item.project.id === projectId);
  const change = project?.changes.find(
    (item) => item.id === changeId && item.lifecycle === lifecycle,
  );

  if (!project || !change) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t("notFoundTitle")}</p>
            <p className="mt-1">{t("notFoundDescription")}</p>
            <AppLink href={paths.changes()} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}>
              {t("back")}
            </AppLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col">
      <Tabs defaultValue="overview" className="min-h-0 flex-1 gap-0 overflow-hidden">
        <div className="sticky top-0 z-20 border-b bg-background px-4 py-2">
          <TabsList variant="line">
            <TabsTrigger value="overview">
              <FileText className="size-4" />
              {t("tabs.overview")}
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <CheckSquare2 className="size-4" />
              {t("tabs.tasks")}
            </TabsTrigger>
            <TabsTrigger value="delta-specs">
              <ListTodo className="size-4" />
              {t("tabs.deltaSpecs")}
            </TabsTrigger>
            <TabsTrigger value="files">
              <FolderTree className="size-4" />
              {t("tabs.files")}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 p-4">
          <TabsContent value="overview" className="h-full overflow-y-auto">
            <ChangeOverviewPanel change={change} />
          </TabsContent>
          <TabsContent value="tasks" className="h-full overflow-hidden">
            <ChangeTasksPanel change={change} />
          </TabsContent>
          <TabsContent value="delta-specs" className="h-full overflow-y-auto">
            <ChangeDeltaSpecsPanel change={change} />
          </TabsContent>
          <TabsContent value="files" className="h-full overflow-y-auto">
            <ChangeFilesPanel change={change} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function ChangeOverviewPanel({ change }: { change: NormalizedChange }) {
  const t = useTranslations("details.change.empty");
  const groups = changeDetailGroups(change);
  if (groups.length === 0) {
    return <EmptyRows icon={FileText} label={t("detail")} />;
  }

  if (groups.length > 1) {
    return (
      <ScopedDetailTabs groups={groups} maxWidth="5xl">
        {(group) => <ChangeOverviewContent detail={group.detail} />}
      </ScopedDetailTabs>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ChangeOverviewContent detail={groups[0].detail} />
    </div>
  );
}

function ChangeOverviewContent({
  detail,
}: {
  detail: ReturnType<typeof changeDetailGroups>[number]["detail"];
}) {
  const t = useTranslations("details.change.overview");
  const hasStructuredOverview = Boolean(detail.proposal.why || detail.proposal.whatChanges || detail.design);

  return (
    <div className="space-y-4">
      {detail.proposal.why ? (
        <MarkdownSection title={t("why")} markdown={detail.proposal.why} />
      ) : null}
      {detail.proposal.whatChanges ? (
        <MarkdownSection title={t("whatChanges")} markdown={detail.proposal.whatChanges} />
      ) : null}
      {detail.design ? <MarkdownSection title={t("design")} markdown={detail.design} /> : null}
      {!hasStructuredOverview ? (
        <MarkdownSection title={t("proposal")} markdown={detail.proposal.content || t("emptyProposal")} />
      ) : null}
    </div>
  );
}

function ChangeTasksPanel({ change }: { change: NormalizedChange }) {
  const t = useTranslations("details.change.tasks");
  const groups = changeDetailGroups(change).filter((group) => group.detail.tasks.length > 0);
  if (groups.length === 0) {
    return <EmptyRows icon={CheckSquare2} label={t("empty")} />;
  }

  if (groups.length > 1) {
    return (
      <div className="flex h-full min-h-0 gap-4 overflow-x-auto pb-2">
        {groups.map((group) => (
          <section key={group.key} className="flex min-h-0 w-[min(360px,80vw)] shrink-0 flex-col rounded-xl bg-muted/40 p-2">
            <div className="mb-2 flex items-center justify-between gap-2 px-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
                  <FolderTree className="size-3.5" />
                </span>
                <h3 className="truncate text-sm font-medium" title={group.label}>
                  {group.label}
                </h3>
              </div>
              <span className="shrink-0 rounded-full bg-background px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                {completedTaskCount(group)}/{group.detail.tasks.length}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg p-1">
              {shouldShowTodoGroup(group.detail.tasks) ? (
                <TaskStatusGroup
                  title={t("todo")}
                  tasks={todoTasks(group.detail.tasks)}
                  emptyLabel={t("emptyTodo")}
                />
              ) : null}
              <TaskStatusGroup
                title={t("completed")}
                tasks={completedTasks(group.detail.tasks)}
                emptyLabel={t("emptyCompleted")}
              />
            </div>
          </section>
        ))}
      </div>
    );
  }

  const group = groups[0];

  return (
    <div className="mx-auto grid h-full min-h-0 max-w-5xl gap-4 md:grid-cols-2">
      {shouldShowTodoGroup(group.detail.tasks) ? (
        <TaskStatusColumn
          title={t("todo")}
          tasks={todoTasks(group.detail.tasks)}
          emptyLabel={t("emptyTodo")}
        />
      ) : null}
      <TaskStatusColumn
        title={t("completed")}
        tasks={completedTasks(group.detail.tasks)}
        emptyLabel={t("emptyCompleted")}
      />
    </div>
  );
}

function ChangeDeltaSpecsPanel({ change }: { change: NormalizedChange }) {
  const t = useTranslations("details.change.empty");
  const groups = changeDetailGroups(change).filter((group) => group.detail.deltaSpecs.length > 0);
  if (groups.length === 0) {
    return <EmptyRows icon={ListTodo} label={t("deltaSpecs")} />;
  }

  if (groups.length > 1) {
    return (
      <ScopedDetailTabs groups={groups} maxWidth="5xl">
        {(group) => (
          <div className="space-y-4">
            {group.detail.deltaSpecs.map((deltaSpec) => (
              <MarkdownSection
                key={`${group.key}:${deltaSpec.specId}`}
                title={deltaSpec.specId}
                subtitle={relativeOpenSpecPath(deltaSpec.sourcePath)}
                markdown={deltaSpec.content}
              />
            ))}
          </div>
        )}
      </ScopedDetailTabs>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {groups.map((group) => (
        <div key={group.key} className="space-y-4">
          {group.showScope ? <ScopeGroupHeading label={group.label} /> : null}
          {group.detail.deltaSpecs.map((deltaSpec) => (
            <MarkdownSection
              key={`${group.key}:${deltaSpec.specId}`}
              title={deltaSpec.specId}
              subtitle={relativeOpenSpecPath(deltaSpec.sourcePath)}
              markdown={deltaSpec.content}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ChangeFilesPanel({ change }: { change: NormalizedChange }) {
  const t = useTranslations("details.change.empty");
  const groups = changeDetailGroups(change).filter((group) => group.detail.files.length > 0);
  if (groups.length === 0) {
    return <EmptyRows icon={FolderTree} label={t("files")} />;
  }

  if (groups.length > 1) {
    return (
      <ScopedDetailTabs groups={groups} maxWidth="5xl">
        {(group) => (
          <div className="space-y-4">
            {group.detail.files.map((file) => (
              <MarkdownSection
                key={`${group.key}:${file.path}`}
                title={file.path}
                subtitle={relativeOpenSpecPath(file.sourcePath)}
                markdown={file.content}
              />
            ))}
          </div>
        )}
      </ScopedDetailTabs>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {groups.map((group) => (
        <div key={group.key} className="space-y-4">
          {group.showScope ? <ScopeGroupHeading label={group.label} /> : null}
          {group.detail.files.map((file) => (
            <MarkdownSection
              key={`${group.key}:${file.path}`}
              title={file.path}
              subtitle={relativeOpenSpecPath(file.sourcePath)}
              markdown={file.content}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type ChangeDetailGroup = ReturnType<typeof changeDetailGroups>[number];
type ChangeTask = ChangeDetailGroup["detail"]["tasks"][number];

function ScopedDetailTabs({
  groups,
  maxWidth,
  children,
}: {
  groups: ChangeDetailGroup[];
  maxWidth: "4xl" | "5xl";
  children: (group: ChangeDetailGroup) => React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto", maxWidth === "5xl" ? "max-w-5xl" : "max-w-4xl")}>
      <Tabs defaultValue={groups[0].key} className="gap-4">
        <div className="overflow-x-auto">
          <TabsList variant="line">
            {groups.map((group) => (
              <TabsTrigger key={group.key} value={group.key}>
                <FolderTree className="size-4" />
                {group.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {groups.map((group) => (
          <TabsContent key={group.key} value={group.key}>
            {children(group)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function TaskStatusColumn({
  title,
  tasks,
  emptyLabel,
}: {
  title: string;
  tasks: ChangeTask[];
  emptyLabel: string;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-xl bg-muted/40 p-2">
      <div className="mb-2 flex items-center justify-between gap-2 px-1.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="rounded-full bg-background px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg p-1">
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <TaskEmptyState label={emptyLabel} />
        )}
      </div>
    </section>
  );
}

function TaskStatusGroup({
  title,
  tasks,
  emptyLabel,
}: {
  title: string;
  tasks: ChangeTask[];
  emptyLabel: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
        <span className="text-[11px] tabular-nums text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <TaskEmptyState label={emptyLabel} compact />
        )}
      </div>
    </section>
  );
}

function TaskEmptyState({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border border-dashed bg-background/40 px-3 text-center text-xs text-muted-foreground",
        compact ? "min-h-14" : "min-h-24",
      )}
    >
      {label}
    </div>
  );
}

function todoTasks(tasks: ChangeTask[]) {
  return tasks.filter((task) => !task.completed);
}

function completedTasks(tasks: ChangeTask[]) {
  return tasks.filter((task) => task.completed);
}

function shouldShowTodoGroup(tasks: ChangeTask[]) {
  return todoTasks(tasks).length > 0 || completedTasks(tasks).length === 0;
}

function TaskCard({ task }: { task: ChangeTask }) {
  return (
    <div className="rounded-lg border-[0.5px] border-border bg-card px-3 py-2.5 shadow-[0_3px_6px_-2px_rgba(0,0,0,0.02),0_1px_1px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-2.5">
        {task.completed ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-success" />
        ) : (
          <span className="mt-0.5 size-4 shrink-0 rounded border border-muted-foreground/40" />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm leading-5", task.completed && "text-muted-foreground line-through")}>
            {task.text}
          </p>
          {task.section ? (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{task.section}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function completedTaskCount(group: ChangeDetailGroup) {
  return completedTasks(group.detail.tasks).length;
}

function changeDetailGroups(change: NormalizedChange) {
  const scoped = change.scopedChanges?.filter((item) => item.detail) || [];
  if (scoped.length > 1) {
    return scoped.map((item) => ({
      key: item.scopeId,
      label: item.scopeLabel,
      detail: item.detail!,
      showScope: true,
    }));
  }

  return change.detail
    ? [{
        key: change.scopeId || "change",
        label: change.scopeLabel || "root",
        detail: change.detail,
        showScope: false,
      }]
    : [];
}

function ScopeGroupHeading({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2 bg-muted/50 px-4", compact ? "py-2" : "rounded-lg border py-2")}>
      <FolderTree className="size-3.5 text-muted-foreground" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
