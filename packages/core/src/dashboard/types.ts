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
  | "worktree-error"
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
  workspacePath?: string;
  name: string;
  dialect: SpecDialect;
  discovery: DiscoveryFlags;
  worktreesPath?: string;
  worktreePaths: string[];
  checkouts: ProjectCheckout[];
  worktreeIssues: RuntimeIssue[];
};

export type ProjectCheckoutKind = "primary" | "worktree";

export type ProjectCheckoutSource = "primary" | "worktrees-directory" | "manual";

export type ProjectCheckout = {
  id: string;
  kind: ProjectCheckoutKind;
  source: ProjectCheckoutSource;
  path: string;
  label: string;
  branch?: string;
  dialect: SpecDialect;
  discovery: DiscoveryFlags;
  issue?: RuntimeIssue;
};

export type NormalizedCheckoutSource = {
  checkoutId: string;
  checkoutKind: ProjectCheckoutKind;
  checkoutPath: string;
  checkoutLabel: string;
  checkoutBranch?: string;
  updatedAt?: string;
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
  dialect?: SpecDialect;
  projectId?: string;
  projectPath?: string;
  projectName?: string;
  scopeId?: string;
  scopeLabel?: string;
  scopePath?: string;
  specId?: string;
  changeId?: string;
  checkoutId?: string;
  checkoutKind?: ProjectCheckoutKind;
  checkoutPath?: string;
  checkoutLabel?: string;
  checkoutBranch?: string;
};

export type NormalizedSpec = {
  id: string;
  displayId?: string;
  title: string;
  sourcePath: string;
  dialect?: SpecDialect;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectPath?: string;
  projectName?: string;
  scopeId?: string;
  scopeLabel?: string;
  scopePath?: string;
  checkoutId?: string;
  checkoutKind?: ProjectCheckoutKind;
  checkoutPath?: string;
  checkoutLabel?: string;
  checkoutBranch?: string;
  requirementCount: number;
  detail?: {
    content: string;
  };
};

export type NormalizedChangeTask = {
  id: string;
  text: string;
  completed: boolean;
  sourcePath: string;
  lineNumber: number;
  section?: string;
};

export type ChangeTaskCompletionUpdate = {
  sourcePath: string;
  lineNumber: number;
  completed: boolean;
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

export type NormalizedChangeLifecycle = "active" | "archived";

export type NormalizedScopedChange = {
  id: string;
  title: string;
  sourcePath: string;
  dialect?: SpecDialect;
  lifecycle: NormalizedChangeLifecycle;
  createdAt: string;
  updatedAt: string;
  scopeId: string;
  scopeLabel: string;
  scopePath: string;
  checkoutId?: string;
  checkoutKind?: ProjectCheckoutKind;
  checkoutPath?: string;
  checkoutLabel?: string;
  checkoutBranch?: string;
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
  dialect?: SpecDialect;
  lifecycle: NormalizedChangeLifecycle;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectPath?: string;
  projectName?: string;
  scopeId?: string;
  scopeLabel?: string;
  scopePath?: string;
  checkoutId?: string;
  checkoutKind?: ProjectCheckoutKind;
  checkoutPath?: string;
  checkoutLabel?: string;
  checkoutBranch?: string;
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
  checkoutSources?: NormalizedCheckoutSource[];
};

export type ProjectEventType = "create" | "update" | "delete";

export type ProjectEvent = {
  projectPath: string;
  dialect: SpecDialect;
  eventType: ProjectEventType;
  filePath: string;
  timestamp: string;
  checkoutId?: string;
  checkoutKind?: ProjectCheckoutKind;
  checkoutPath?: string;
  checkoutLabel?: string;
  checkoutBranch?: string;
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
  checkouts: ProjectCheckout[];
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
  workspacePath?: string;
  worktreesPath?: string;
  worktreePaths: string[];
};

export type RuntimeSnapshot = {
  settings: RuntimeSettings;
  dashboard: DashboardData;
};
