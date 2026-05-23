import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { isDashboardSection } from "@/lib/routes";

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
