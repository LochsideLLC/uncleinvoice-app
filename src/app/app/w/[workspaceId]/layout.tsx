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

  const links = [
    ["Work queue", "/contractors"],
    ["Invoices", "/invoices"],
    ["Import payments", "/import"],
    ["Client settings", "/settings"],
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app" className="text-sm text-muted">
          ← All clients
        </Link>
        <h1 className="mt-2 text-3xl">{workspace.name}</h1>
        <nav className="mt-4 flex flex-wrap gap-2">
          {links.map(([label, suffix]) => (
            <Link
              key={label}
              href={`/app/w/${workspace.id}${suffix}`}
          className="min-h-10 rounded-full bg-paper px-3 py-2 text-sm ring-1 ring-line"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
