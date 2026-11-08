import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";

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
        <Link href="/app" className="text-sm text-muted">
          ← All clients
        </Link>
        <h1 className="mt-2 text-3xl">{workspace.name}</h1>
      </div>
      {children}
    </div>
  );
}
