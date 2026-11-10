"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function WorkspaceProfileHeading({
  workspaceId,
  name,
}: {
  workspaceId: string;
  name: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const customerView = searchParams.get("view") === "customer";
  const invoiceDetail = pathname.startsWith(`/app/w/${workspaceId}/invoices/`);
  const settingsHref = `/app/w/${workspaceId}/settings${customerView ? "?view=customer" : ""}`;
  const editLabel = customerView ? "Edit customer details" : "Edit client details";

  return (
    <div>
      <nav className="flex items-center justify-between gap-4 text-sm text-muted" aria-label="Client navigation">
        <Link href="/app" className="hover:text-ink">← All clients</Link>
        {invoiceDetail ? <Link href={`/app/w/${workspaceId}/invoices`} className="hover:text-ink">← All invoices</Link> : null}
      </nav>
      <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-3xl">{name}</h1>
        <Link
          href={settingsHref}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-ink hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label={editLabel}
          title={editLabel}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m16 4 4 4M3 21l4.3-.9L19.1 8.3a2.1 2.1 0 0 0-3-3L4.3 17.1 3 21Z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
