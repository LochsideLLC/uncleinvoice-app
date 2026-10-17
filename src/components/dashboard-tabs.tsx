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
  clientLimitReached,
}: {
  stats: DashboardStatsType;
  memberships: Membership[];
  /** True when their plan keeps one client and they already have it. */
  clientLimitReached?: boolean;
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
              {t === "invoices" ? "Invoices" : "Clients"}
            </button>
          ))}
        </div>
      </div>

      {tab === "invoices" ? (
        <DashboardStats stats={stats} />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted">Your clients</p>
            <h2 className="mt-1 text-3xl">Who are we closing this month?</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {clientLimitReached ? (
              // The offer belongs where the limit is felt, not only on the
              // pricing page they have no reason to open.
              <Link href="/app/profile#upgrade" className="btn btn-secondary w-full">
                Add a client — needs Bookkeeper
              </Link>
            ) : (
              <Link href="/app/workspaces/new" className="btn btn-secondary w-full">
                Add a client
              </Link>
            )}
            <Link href="/app/profile" className="btn btn-secondary w-full">
              Update Profile / Business Info
            </Link>
          </div>
          {clientLimitReached ? (
            <p className="text-sm text-muted">
              Your plan keeps one client. Bookkeeper keeps as many as you do —{" "}
              <Link href="/app/profile#upgrade" className="text-ink underline">
                see the plans
              </Link>
              .
            </p>
          ) : null}
          {memberships.length === 0 ? (
            <div className="paper rounded-3xl p-8">
              <h3 className="text-2xl">No clients yet</h3>
              <p className="mt-2 max-w-xl text-muted">
                Add the business you keep the books for. Then add their contractors and seed
                the invoices you already know should exist.
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
