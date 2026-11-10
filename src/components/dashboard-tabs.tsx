"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentIcon } from "@/components/workspace-icons";
import { WorkspaceArchiveButton } from "@/components/workspace-archive-button";
import type { listWorkspaces } from "@/lib/workspace";

function UsersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="7" cy="6.5" r="2.5" />
      <path d="M2.5 16c.6-2.6 2.5-4 4.5-4s3.9 1.4 4.5 4" />
      <circle cx="13.5" cy="7.5" r="2" />
      <path d="M13 12.2c2 .2 3.6 1.5 4.1 3.8" />
    </svg>
  );
}


type Membership = Awaited<ReturnType<typeof listWorkspaces>>[number];

export type DashboardSection = "invoices" | "clients";

const SECTION_TABS = [
  { key: "invoices", label: "Invoices", Icon: DocumentIcon },
  { key: "clients", label: "Customers & clients", Icon: UsersIcon },
] as const;

/** Section tab buttons. Rendered in the dashboard toolbar; the parent owns the state. */
export function SectionTabs({
  tab,
  onChange,
}: {
  tab: DashboardSection;
  onChange: (tab: DashboardSection) => void;
}) {
  return (
    <div role="tablist" aria-label="Dashboard sections" className="flex w-full gap-1 sm:w-auto">
      {SECTION_TABS.map(({ key, label, Icon }) => {
        const selected = tab === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-2 py-2.5 text-sm font-semibold transition-colors sm:flex-none sm:px-4"
            style={
              selected
                ? { color: "var(--ink)", boxShadow: "inset 0 -2px 0 var(--accent)" }
                : { color: "var(--muted)" }
            }
          >
            <Icon />
            <span className="sm:hidden">{key === "clients" ? "Clients" : label}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CustomersPanel({
  memberships,
  fromCreate = false,
}: {
  memberships: Membership[];
  fromCreate?: boolean;
}) {
  const router = useRouter();
  const active = memberships.filter(({ workspace }) => !workspace.archivedAt);
  const archived = memberships.filter(({ workspace }) => workspace.archivedAt);

  function customerCard({ workspace, role }: Membership, isArchived: boolean) {
    const customerLabel = workspace.businessName || workspace.name;
    return (
      <li key={workspace.id} className="flex items-center gap-2">
        <Link
          href={`/app/w/${workspace.id}?view=customer`}
          aria-label={`View ${customerLabel} profile`}
          className="paper flex min-h-14 min-w-0 flex-1 items-center justify-center rounded-xl px-3 py-2 text-center hover:bg-paper-2"
        >
          <span className="max-w-full truncate text-center text-base font-semibold">{customerLabel}</span>
        </Link>
        {role === "owner" ? (
          <WorkspaceArchiveButton workspaceId={workspace.id} archived={isArchived} />
        ) : null}
      </li>
    );
  }

  return (
    <div className="space-y-4">
      {fromCreate ? (
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push("/app?workspace=contractor&section=invoices");
            }
          }}
          className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
        >
          <span aria-hidden="true">←</span>
          Back to invoice
        </button>
      ) : null}
      <div className="flex flex-col gap-2">
        <Link href="/app/workspaces/new" className="btn btn-secondary w-full">
          Add a customer or client
        </Link>
        <Link href="/app?workspace=bookkeeper" className="btn btn-secondary w-full">
          Open Bookkeeper workspace
        </Link>
      </div>
      {active.length === 0 ? (
        <div className="paper rounded-3xl p-8">
          <h3 className="text-2xl">No active customers</h3>
        </div>
      ) : (
        <ul className="space-y-3">
          {active.map((membership) => customerCard(membership, false))}
        </ul>
      )}
      {archived.length > 0 ? (
        <section className="space-y-3 pt-4">
          <h3 className="text-2xl">Archived customers</h3>
          <ul className="space-y-3">{archived.map((membership) => customerCard(membership, true))}</ul>
        </section>
      ) : null}
    </div>
  );
}
