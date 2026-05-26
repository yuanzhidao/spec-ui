import { notFound } from "next/navigation";
import { DashboardShell } from "../../components/dashboard-shell";
import { isDashboardSection } from "@spec-ui/core/navigation/routes";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!isDashboardSection(section)) {
    notFound();
  }

  return <DashboardShell initialSection={section} />;
}
