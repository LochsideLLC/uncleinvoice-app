"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardStats } from "@/components/dashboard-stats";
import { DocumentIcon } from "@/components/workspace-icons";
import type { DashboardStats as DashboardStatsType } from "@/lib/dashboard";
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

export function DashboardTabs({
  stats,
  memberships,
}: {
  stats: DashboardStatsType;
  memberships: Membership[];
}) {
  const [tab, setTab] = useState<"invoices" | "clients">("invoices");

  const tabs = [
    { key: "invoices", label: "Invoices", Icon: DocumentIcon },
    { key: "clients", label: "Customers & clients", Icon: UsersIcon },
  ] as const;

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Dashboard sections" className="flex gap-1 border-b border-line">
        {tabs.map(({ key, label, Icon }) => {
          const selected = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(key)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors"
              style={
                selected
                  ? {
                      background: "var(--paper)",
                      color: "var(--ink)",
                      borderRadius: "0.75rem 0.75rem 0 0",
                      boxShadow: "inset 0 -2px 0 var(--accent)",
                    }
                  : { color: "var(--muted)" }
              }
            >
              <Icon />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "invoices" ? (
        <DashboardStats stats={stats} />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted">Customers &amp; clients</p>
            <h2 className="mt-1 text-3xl">The businesses you work with</h2>
            <p className="mt-2 text-sm text-muted">The customers you bill, and the clients whose books you keep — free, as many as you need.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/app/workspaces/new" className="btn btn-secondary w-full">
              Add a customer or client
            </Link>
            <Link href="/app?workspace=bookkeeper" className="btn btn-secondary w-full">
              Open Bookkeeper workspace
            </Link>
          </div>
          {memberships.length === 0 ? (
            <div className="paper rounded-3xl p-8">
              <h3 className="text-2xl">No businesses saved yet</h3>
              <p className="mt-2 max-w-xl text-muted">
                Add a customer you bill, or a business you keep books for. Their details will be ready the next time you write an invoice.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {memberships.map(({ workspace, role }) => (
                <li key={workspace.id}>
                  <Link
                    href={`/app/w/${workspace.id}`}
                    className="paper block rounded-3xl p-6 transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-2xl">{workspace.name}</h3>
                      <span className="text-xs uppercase tracking-wide text-muted">{role}</span>
                    </div>
                    <p className="mt-2 text-muted">{workspace.email}</p>
                    <p className="mt-4 text-sm text-muted">
                      {workspace._count.contractors} contractors · {workspace._count.invoices}{" "}
                      invoices
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
