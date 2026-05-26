import { DashboardShell } from "../../../../components/dashboard-shell";
import { normalizeChangeLifecycle } from "@spec-ui/core/navigation/routes";

export default async function ChangeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; changeId: string }>;
  searchParams: Promise<{ lifecycle?: string | string[] }>;
}) {
  const [{ projectId, changeId }, query] = await Promise.all([params, searchParams]);

  return (
    <DashboardShell
      initialSection="changes"
      changeDetail={{
        projectId,
        changeId,
        lifecycle: normalizeChangeLifecycle(query.lifecycle),
      }}
    />
  );
}
