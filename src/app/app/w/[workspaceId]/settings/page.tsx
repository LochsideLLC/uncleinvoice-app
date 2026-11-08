import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";
import { db } from "@/lib/db";
import { WorkspaceSettingsForm } from "@/components/workspace-settings-form";
import { WorkspaceServicesManager } from "@/components/workspace-services-manager";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspaceId } = await params;
  const query = await searchParams;
  const view = query.view === "customer" ? "customer" : "client";
  const { workspace } = await requireWorkspace(workspaceId);
  const services = await db.serviceItem.findMany({
    where: { workspaceId },
    orderBy: { description: "asc" },
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href={`/app/w/${workspaceId}${view === "customer" ? "?view=customer" : ""}`} className="inline-flex text-sm font-semibold text-muted hover:text-ink">
        ← Back to profile
      </Link>
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
