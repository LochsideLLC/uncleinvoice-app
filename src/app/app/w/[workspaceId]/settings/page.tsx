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
