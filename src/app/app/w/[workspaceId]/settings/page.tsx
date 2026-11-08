import { requireWorkspace } from "@/lib/workspace";
import { db } from "@/lib/db";
import { WorkspaceSettingsForm } from "@/components/workspace-settings-form";
import { WorkspaceServicesManager } from "@/components/workspace-services-manager";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { workspace } = await requireWorkspace(workspaceId);
  const services = await db.serviceItem.findMany({
    where: { workspaceId },
    orderBy: { description: "asc" },
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h2 className="text-2xl">Customer details</h2>
      <p className="text-muted">
        Finished invoices are emailed to this office address, and it prints on the bill-to
        block.
      </p>
      <WorkspaceSettingsForm workspace={workspace} />
      <WorkspaceServicesManager
        workspaceId={workspaceId}
        initialItems={services.map((item) => ({
          id: item.id,
          description: item.description,
          unitPriceCents: item.unitPrice,
          taxable: item.taxable,
        }))}
      />
    </div>
  );
}
