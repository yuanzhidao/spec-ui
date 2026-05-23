import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function ChangeDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; changeId: string }>;
}) {
  const { projectId, changeId } = await params;

  return (
    <DashboardShell
      initialSection="changes"
      changeDetail={{
        projectId,
        changeId,
      }}
    />
  );
}
