import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { DashboardData, SpecDialect, ValidationResult } from "@spec-ui/core/dashboard/types";
import { Badge } from "@spec-ui/ui/badge";
import { HoverExpandFrame } from "../shared/section-shared";

const metricTileTransition = { type: "spring", stiffness: 420, damping: 34, mass: 0.6 } as const;

export function ProjectMetric({ label, value }: { label: string; value: number }) {
  return <MetricTile label={label} value={String(value)} valueClassName="tabular-nums" />;
}

export function DialectTag({
  dialect,
  compact = false,
}: {
  dialect: SpecDialect;
  compact?: boolean;
}) {
  const t = useTranslations("projects.dialects");

  if (dialect !== "openspec") {
    if (compact) {
      return null;
    }
    return <p className="truncate text-xs text-muted-foreground">{dialect}</p>;
  }

  return (
    <Badge className={`${compact ? "" : "mt-1"} h-5 shrink-0 rounded border-brand/20 bg-brand/10 px-1.5 text-[11px] text-brand`}>
      {t("openspec")}
    </Badge>
  );
}

export function CheckoutTag({ count }: { count: number }) {
  const t = useTranslations("projects");

  if (count <= 1) {
    return null;
  }

  return (
    <HoverExpandFrame compactWidth={96} expandedWidth={180} title={t("checkouts", { count })}>
      <Badge
        variant="secondary"
        className="h-5 min-w-0 max-w-full rounded bg-muted/70 px-1.5 text-[11px] text-muted-foreground"
      >
        <span className="truncate">{t("checkouts", { count })}</span>
      </Badge>
    </HoverExpandFrame>
  );
}

export function ProjectStatusMetric({
  validation,
  watcher,
}: {
  validation: ValidationResult["status"];
  watcher: DashboardData["realtime"]["watcher"];
}) {
  return <MetricTile label={watcher} value={validation} valueClassName="text-[11px]" />;
}

function MetricTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="group max-w-full min-w-0 flex-1 basis-0 overflow-hidden rounded-md bg-muted/60 px-2 py-1 hover:bg-muted"
      title={`${label}: ${value}`}
      animate={{ flexGrow: 1 }}
      whileHover={{ flexGrow: 2 }}
      transition={reduceMotion ? { duration: 0 } : metricTileTransition}
    >
      <p className="max-w-full truncate text-[11px] text-muted-foreground">{label}</p>
      <p className={`max-w-full truncate font-medium ${valueClassName || ""}`}>{value}</p>
    </motion.div>
  );
}
