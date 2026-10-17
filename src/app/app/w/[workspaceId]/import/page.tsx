import { requireWorkspace } from "@/lib/workspace";
import { canImportInvoices } from "@/lib/plan";
import { FeatureGate } from "@/components/upgrade-offer";
import { ImportInvoicesForm } from "@/components/import-invoices-form";

export default async function ImportPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { user } = await requireWorkspace(workspaceId);
  if (!canImportInvoices(user.plan)) return <FeatureGate feature="import" />;
  return <ImportInvoicesForm workspaceId={workspaceId} />;
}
