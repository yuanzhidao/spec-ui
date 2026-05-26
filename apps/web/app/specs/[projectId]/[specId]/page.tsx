import { DashboardShell } from "../../../../components/dashboard-shell";

export default async function SpecDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; specId: string }>;
}) {
  const { projectId, specId } = await params;

  return (
    <DashboardShell
      initialSection="specs"
      specDetail={{
        projectId,
        specId,
      }}
    />
  );
}
