import type {
  DashboardProject,
  ProjectBinding,
  ProjectEvent,
  ValidationResult,
} from "@spec-ui/core/dashboard/types";

export type AdapterProjectionContext = {
  validation: ValidationResult;
  activity: ProjectEvent[];
};

export type SpecDialectAdapter = {
  dialect: ProjectBinding["dialect"];
  projectData(
    binding: ProjectBinding,
    context: AdapterProjectionContext,
  ): Promise<Omit<DashboardProject, "realtime">>;
};
