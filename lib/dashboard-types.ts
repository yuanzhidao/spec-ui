export type ThemeMode = "light" | "dark" | "system";
export type LanguageMode = "en" | "zh";

export type SpecDialect = "openspec" | "none" | "unsupported";

export type RuntimeIssueCode =
  | "invalid-path"
  | "missing-path"
  | "unreadable-path"
  | "not-directory"
  | "settings-invalid"
  | "adapter-error"
  | "watcher-error"
  | "unsupported-dialect"
  | "runtime-error";

export type RuntimeIssue = {
  code: RuntimeIssueCode;
  message: string;
  detail?: string;
};

export type DiscoveryFlags = {
  hasOpenSpecDir: boolean;
  hasConfig: boolean;
  hasSpecsDir: boolean;
  hasChangesDir: boolean;
  isEmptyOpenSpec: boolean;
  scopes: SpecScope[];
};

export type SpecScope = {
  id: string;
  label: string;
  path: string;
};

export type ProjectBinding = {
  id: string;
  path: string;
  name: string;
  dialect: SpecDialect;
  discovery: DiscoveryFlags;
};

export type ValidationStatus =
  | "not-run"
  | "running"
  | "passing"
  | "failing"
  | "stale";

export type ValidationResult = {
  status: ValidationStatus;
  command?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  startedAt?: string;
  endedAt?: string;
  message?: string;
};

export type NormalizedRequirement = {
  id: string;
  title: string;
  sourcePath: string;
  projectId?: string;
  projectPath?: string;
  projectName?: string;
  scopeId?: string;
  scopeLabel?: string;
  scopePath?: string;
  specId?: string;
  changeId?: string;
};

export type NormalizedSpec = {
  id: string;
  displayId?: string;
  title: string;
  sourcePath: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectPath?: string;
  projectName?: string;
  scopeId?: string;
  scopeLabel?: string;
  scopePath?: string;
  requirementCount: number;
  detail?: {
    content: string;
  };
};

export type NormalizedChangeTask = {
  id: string;
  text: string;
  completed: boolean;
  section?: string;
};

export type NormalizedChangeDeltaSpec = {
  specId: string;
  sourcePath: string;
  content: string;
};

export type NormalizedChangeFile = {
  path: string;
  sourcePath: string;
  content: string;
};

export type NormalizedChangeDetail = {
  proposal: {
    content: string;
    why: string;
    whatChanges: string;
  };
  design?: string;
  tasks: NormalizedChangeTask[];
  deltaSpecs: NormalizedChangeDeltaSpec[];
  files: NormalizedChangeFile[];
};

export type NormalizedScopedChange = {
  id: string;
  title: string;
  sourcePath: string;
  createdAt: string;
  updatedAt: string;
  scopeId: string;
  scopeLabel: string;
  scopePath: string;
  hasProposal: boolean;
  hasDesign: boolean;
  hasTasks: boolean;
  taskSummary: {
    total: number;
    completed: number;
  };
  requirementCount: number;
  detail?: NormalizedChangeDetail;
};

export type NormalizedChange = {
  id: string;
  title: string;
  sourcePath: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectPath?: string;
  projectName?: string;
  scopeId?: string;
  scopeLabel?: string;
  scopePath?: string;
  hasProposal: boolean;
  hasDesign: boolean;
  hasTasks: boolean;
  taskSummary: {
    total: number;
    completed: number;
  };
  requirementCount: number;
  detail?: NormalizedChangeDetail;
  scopedChanges?: NormalizedScopedChange[];
};

export type ProjectEventType = "create" | "update" | "delete";

export type ProjectEvent = {
  projectPath: string;
  dialect: SpecDialect;
  eventType: ProjectEventType;
  filePath: string;
  timestamp: string;
  entityId?: string;
  scopeId?: string;
  scopeLabel?: string;
  scopePath?: string;
};

export type RealtimeState = {
  watcher: "idle" | "watching" | "error";
  connection: "disconnected" | "connecting" | "connected" | "reconnecting";
  issue?: RuntimeIssue;
};

export type DashboardProject = {
  project: ProjectBinding;
  issue?: RuntimeIssue;
  validation: ValidationResult;
  scopes: SpecScope[];
  specs: NormalizedSpec[];
  changes: NormalizedChange[];
  requirements: NormalizedRequirement[];
  activity: ProjectEvent[];
  realtime: Pick<RealtimeState, "watcher" | "issue">;
};

export type DashboardData = {
  projects: DashboardProject[];
  focusedProjectId: string | null;
  focusedProjectPath: string | null;
  project?: ProjectBinding;
  issue?: RuntimeIssue;
  settingsIssue?: RuntimeIssue;
  validation: ValidationResult;
  specs: NormalizedSpec[];
  changes: NormalizedChange[];
  requirements: NormalizedRequirement[];
  activity: ProjectEvent[];
  realtime: RealtimeState;
};

export type RuntimeSettings = {
  version: 2;
  themeMode: ThemeMode;
  language: LanguageMode;
  projects: RuntimeProjectSetting[];
  focusedProjectId: string | null;
};

export type RuntimeProjectSetting = {
  id: string;
  path: string;
};

export type RuntimeSnapshot = {
  settings: RuntimeSettings;
  dashboard: DashboardData;
};
