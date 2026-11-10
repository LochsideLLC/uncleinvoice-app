import { Suspense } from "react";
import { requireWorkspace } from "@/lib/workspace";
import { WorkspaceProfileHeading } from "@/components/workspace-profile-heading";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { workspace } = await requireWorkspace(workspaceId);

  return (
    <div className="space-y-4">
      <div>
        <Suspense fallback={<h1 className="mt-2 text-3xl">{workspace.name}</h1>}>
          <WorkspaceProfileHeading workspaceId={workspaceId} name={workspace.name} />
        </Suspense>
      </div>
      {children}
    </div>
  );
}
