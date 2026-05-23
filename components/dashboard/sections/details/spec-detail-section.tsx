"use client";

import { useTranslations } from "next-intl";
import type { DashboardData } from "@/lib/dashboard-types";
import { AppLink } from "@/components/navigation/app-link";
import { buttonVariants } from "@/components/ui/button";
import { paths } from "@/lib/routes";
import { relativeOpenSpecPath } from "../shared";
import { MarkdownSection } from "./markdown";

export function SpecDetailSection({
  data,
  projectId,
  specId,
}: {
  data: DashboardData;
  projectId: string;
  specId: string;
}) {
  const t = useTranslations("details.spec");
  const project = data.projects.find((item) => item.project.id === projectId);
  const spec = project?.specs.find((item) => item.id === specId);

  if (!project || !spec) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t("notFoundTitle")}</p>
            <p className="mt-1">{t("notFoundDescription")}</p>
            <AppLink href={paths.specs()} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}>
              {t("back")}
            </AppLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-5xl">
          <MarkdownSection
            title={relativeOpenSpecPath(spec.sourcePath)}
            subtitle={spec.sourcePath}
            markdown={spec.detail?.content || t("emptyContent")}
          />
        </div>
      </div>
    </div>
  );
}
