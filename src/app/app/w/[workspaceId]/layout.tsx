import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";

const links = [
  { label: "Work queue", path: "/contractors", icon: <><path d="M7 3.5h6l3 3v10H5v-13h2Z" /><path d="M8 9h5M8 12h5M8 15h3M12.5 3.5v3h3" /></> },
  { label: "Invoices", path: "/invoices", icon: <><path d="M5 2.5h7l4 4v11H5v-15Z" /><path d="M12 2.5v4h4M8 10h5M8 13h5" /></> },
  { label: "Import payments", path: "/import", icon: <><path d="M10 3v9M6.5 8.5 10 12l3.5-3.5" /><path d="M4 13v4h12v-4" /></> },
  { label: "Client settings", path: "/settings", icon: <><circle cx="10" cy="10" r="3" /><path d="m8.8 2.8.4 1.5a6 6 0 0 1 1.6 0l.4-1.5 2.1.9-.7 1.4a6 6 0 0 1 1.1 1.1l1.4-.7.9 2.1-1.5.4a6 6 0 0 1 0 1.6l1.5.4-.9 2.1-1.4-.7a6 6 0 0 1-1.1 1.1l.7 1.4-2.1.9-.4-1.5a6 6 0 0 1-1.6 0l-.4 1.5-2.1-.9.7-1.4a6 6 0 0 1-1.1-1.1l-1.4.7-.9-2.1 1.5-.4a6 6 0 0 1 0-1.6L4 7.8l.9-2.1 1.4.7a6 6 0 0 1 1.1-1.1l-.7-1.4 2.1-.9Z" /></> },
] as const;

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
    <div className="space-y-8">
      <div>
        <Link href="/app" className="text-sm text-muted">
          ← All clients
        </Link>
        <h1 className="mt-2 text-3xl">{workspace.name}</h1>
        <nav aria-label="Client pages" className="mt-4 flex gap-2">
          {links.map(({ label, path, icon }) => (
            <Link
              key={label}
              href={`/app/w/${workspace.id}${path}`}
              aria-label={label}
              title={label}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper text-ink ring-1 ring-line hover:bg-paper-2"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {icon}
              </svg>
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
