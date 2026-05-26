"use client";

import type {
  DashboardData,
  LanguageMode,
  NormalizedChangeLifecycle,
  RuntimeSettings,
  ThemeMode,
} from "@spec-ui/core/dashboard/types";
import type { DashboardSection } from "@spec-ui/core/navigation/routes";
import { ActivitySection } from "../sections/activity/activity-section";
import { ChangeDetailSection } from "../sections/details/change-detail-section";
import { SpecDetailSection } from "../sections/details/spec-detail-section";
import { ProjectsSection } from "../sections/projects/projects-section";
import { SettingsSection } from "../sections/settings/settings-section";
import { EmptyProjectState } from "../sections/shared/section-shared";
import { ValidationSection } from "../sections/validation/validation-section";
import { WorkboardSection } from "../sections/workboard/workboard-section";

export function SectionContent({
  section,
  specDetail,
  changeDetail,
  data,
  settings,
  busy,
  onAddProject,
  onFocusProject,
  onRemoveProject,
  onRelocateProject,
  onUpdateProjectWorkspaceDirectory,
  onUpdateProjectWorktreesDirectory,
  onAddProjectWorktreePath,
  onRemoveProjectWorktreePath,
  onToggleTask,
  onRunValidation,
  onThemeChange,
  onLanguageChange,
}: {
  section: DashboardSection;
  specDetail?: {
    projectId: string;
    specId: string;
  };
  changeDetail?: {
    projectId: string;
    changeId: string;
    lifecycle: NormalizedChangeLifecycle;
  };
  data: DashboardData;
  settings?: RuntimeSettings;
  busy: boolean;
  onAddProject: (path: string) => void;
  onFocusProject: (path: string | null) => void;
  onRemoveProject: (path: string) => void;
  onRelocateProject: (projectId: string, path: string) => void;
  onUpdateProjectWorkspaceDirectory: (projectId: string, path: string | null) => void;
  onUpdateProjectWorktreesDirectory: (projectId: string, path: string | null) => void;
  onAddProjectWorktreePath: (projectId: string, path: string) => void;
  onRemoveProjectWorktreePath: (projectId: string, path: string) => void;
  onToggleTask: (sourcePath: string, lineNumber: number, completed: boolean) => Promise<void>;
  onRunValidation: () => void;
  onThemeChange: (mode: ThemeMode) => void;
  onLanguageChange: (language: LanguageMode) => void;
}) {
  if (section === "projects") {
    return (
      <ProjectsSection
        data={data}
        busy={busy}
        onAddProject={onAddProject}
        onFocusProject={onFocusProject}
        onRemoveProject={onRemoveProject}
        onRelocateProject={onRelocateProject}
        onUpdateProjectWorkspaceDirectory={onUpdateProjectWorkspaceDirectory}
        onUpdateProjectWorktreesDirectory={onUpdateProjectWorktreesDirectory}
        onAddProjectWorktreePath={onAddProjectWorktreePath}
        onRemoveProjectWorktreePath={onRemoveProjectWorktreePath}
      />
    );
  }

  if (section === "settings") {
    return (
      <SettingsSection
        data={data}
        settings={settings}
        onThemeChange={onThemeChange}
        onLanguageChange={onLanguageChange}
      />
    );
  }

  if (section === "specs" && specDetail) {
    return (
      <SpecDetailSection
        data={data}
        projectId={specDetail.projectId}
        specId={specDetail.specId}
      />
    );
  }

  if (section === "changes" && changeDetail) {
    return (
      <ChangeDetailSection
        data={data}
        projectId={changeDetail.projectId}
        changeId={changeDetail.changeId}
        lifecycle={changeDetail.lifecycle}
        onToggleTask={onToggleTask}
      />
    );
  }

  if (data.projects.length === 0) {
    return <EmptyProjectState />;
  }

  if (section === "changes") {
    return <WorkboardSection data={data} kind="changes" />;
  }

  if (section === "validation") {
    return <ValidationSection validation={data.validation} onRunValidation={onRunValidation} />;
  }

  if (section === "activity") {
    return <ActivitySection activity={data.activity} />;
  }

  return <WorkboardSection data={data} kind="specs" />;
}
