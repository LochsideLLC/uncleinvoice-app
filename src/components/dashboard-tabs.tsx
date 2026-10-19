"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardStats } from "@/components/dashboard-stats";
import type { DashboardStats as DashboardStatsType } from "@/lib/dashboard";
import type { listWorkspaces } from "@/lib/workspace";


type Membership = Awaited<ReturnType<typeof listWorkspaces>>[number];

export function DashboardTabs({
  stats,
  memberships,
}: {
  stats: DashboardStatsType;
  memberships: Membership[];
}) {
  const [tab, setTab] = useState<"invoices" | "clients">("invoices");

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div
          className="flex rounded-2xl p-1"
          style={{
            background: "var(--paper-2)",
            boxShadow: "inset 0 1px 4px rgba(42,31,22,0.18), inset 0 0 0 1px rgba(42,31,22,0.08)",
          }}
        >
          {(["invoices", "clients"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="rounded-xl px-6 py-2 text-sm font-semibold capitalize transition-all"
              style={
                tab === t
                  ? {
                      background: "var(--paper)",
                      color: "var(--ink)",
                      boxShadow:
                        "0 1px 3px rgba(42,31,22,0.18), 0 0 0 1px rgba(42,31,22,0.07)",
                    }
                  : { color: "var(--muted)" }
              }
            >
              {t === "invoices" ? "Invoices" : "Customers & clients"}
            </button>
          ))}
        </div>
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
