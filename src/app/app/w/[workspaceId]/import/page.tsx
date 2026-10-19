import { requireWorkspace } from "@/lib/workspace";
import { ImportInvoicesForm } from "@/components/import-invoices-form";

export default async function ImportPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  await requireWorkspace(workspaceId);
  return <ImportInvoicesForm workspaceId={workspaceId} />;
}
