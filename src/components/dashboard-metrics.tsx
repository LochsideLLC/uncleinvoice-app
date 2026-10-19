"use client";

import { useState, useMemo } from "react";
import { formatMoney } from "@/lib/money";
import type { InvoiceRow, DashboardStats } from "@/lib/dashboard";

type Period = "month" | "lastMonth" | "quarter" | "year" | "all";
const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

function periodBounds(period: Period): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (period === "all") return { start: null, end: null };
  if (period === "month") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: null };
  if (period === "lastMonth") return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (period === "quarter") return { start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), end: null };
  return { start: new Date(now.getFullYear(), 0, 1), end: null };
}

function filterByPeriod(invoices: InvoiceRow[], period: Period): InvoiceRow[] {
  const { start, end } = periodBounds(period);
  if (!start && !end) return invoices;
  return invoices.filter((inv) => {
    if (start && inv.issueDate < start) return false;
    if (end && inv.issueDate >= end) return false;
    return true;
  });
}

function computeKPIs(invoices: InvoiceRow[]) {
  let totalCents = 0, outstandingCents = 0, sentCount = 0, waitingCount = 0, draftCount = 0;
  for (const inv of invoices) {
    totalCents += inv.totalCents;
    outstandingCents += inv.dueCents;
    if (inv.status === "sent" && !inv.isPaid) sentCount++;
    if (inv.status === "awaiting_review") waitingCount++;
    if (inv.status === "draft") draftCount++;
  }
  return { totalCents, collectedCents: totalCents - outstandingCents, outstandingCents, sentCount, waitingCount, draftCount };
}

function computeAging(invoices: InvoiceRow[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const c = { cents: 0, count: 0 };
  const d30 = { cents: 0, count: 0 };
  const d90 = { cents: 0, count: 0 };
  const d90p = { cents: 0, count: 0 };

  for (const inv of invoices) {
    if (inv.isPaid || inv.dueCents <= 0) continue;
    const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
    if (dueDate) dueDate.setHours(0, 0, 0, 0);
    const daysOver = dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000) : -1;
    if (daysOver <= 0) { c.cents += inv.dueCents; c.count++; }
    else if (daysOver <= 30) { d30.cents += inv.dueCents; d30.count++; }
    else if (daysOver <= 90) { d90.cents += inv.dueCents; d90.count++; }
    else { d90p.cents += inv.dueCents; d90p.count++; }
  }
  return [
    { label: "Current", color: "#5a8a6a", ...c },
    { label: "1–30 days", color: "#c4a574", ...d30 },
    { label: "31–90 days", color: "#c4612a", ...d90 },
    { label: "90+ days", color: "#9a3b24", ...d90p },
  ];
}

export function DashboardMetrics({ stats }: { stats: DashboardStats }) {
  const [period, setPeriod] = useState<Period>("all");

  const filtered = useMemo(() => filterByPeriod(stats.allInvoices, period), [stats.allInvoices, period]);
  const kpis = useMemo(() => computeKPIs(filtered), [filtered]);
  const aging = useMemo(() => computeAging(stats.allInvoices), [stats.allInvoices]);

  const agingTotal = aging.reduce((s, b) => s + b.cents, 0) || 1;
  const hasAging = aging.some((b) => b.count > 0);

  const statusParts = [
    kpis.sentCount > 0 && `${kpis.sentCount} sent`,
    kpis.waitingCount > 0 && `${kpis.waitingCount} waiting on review`,
    kpis.draftCount > 0 && `${kpis.draftCount} draft${kpis.draftCount !== 1 ? "s" : ""}`,
  ].filter(Boolean);

  return (
    <section className="space-y-3">
      {/* Header + period tabs */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted">Overview</p>
          <h2 className="mt-1 text-3xl">Your invoices</h2>
        </div>
        <div className="flex flex-wrap gap-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
              style={
                period === key
                  ? { background: "var(--ink)", color: "var(--paper)" }
                  : { background: "var(--paper-2)", color: "var(--muted)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip — 3 numbers in one panel */}
      <div className="paper rounded-3xl">
        <div className="grid grid-cols-3">
          {[
            { label: "Invoiced", value: formatMoney(kpis.totalCents) },
            { label: "Collected", value: formatMoney(kpis.collectedCents), accent: "var(--olive)" },
            { label: "Outstanding", value: formatMoney(kpis.outstandingCents) },
          ].map((item, i) => (
            <div
              key={item.label}
              className="px-5 py-4"
              style={i > 0 ? { borderLeft: "1px solid var(--line)" } : undefined}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{item.label}</p>
              <p className="display mt-1 text-2xl leading-none" style={item.accent ? { color: item.accent } : undefined}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* AR Aging */}
      <div className="paper rounded-3xl px-5 py-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Receivables aging</p>
          {period !== "all" && (
            <p className="text-xs text-muted">All unpaid invoices</p>
          )}
        </div>

        {hasAging ? (
          <>
            {/* Color bar */}
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full" style={{ background: "var(--paper-2)" }}>
              {aging.map((b) =>
                b.cents > 0 ? (
                  <div key={b.label} style={{ flex: b.cents / agingTotal, background: b.color }} />
                ) : null
              )}
            </div>

            {/* Buckets */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {aging.map((b) => (
                <div key={b.label}>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ background: b.color }} />
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{b.label}</p>
                  </div>
                  <p
                    className="display mt-1 text-xl leading-none"
                    style={b.cents > 0 && b.label !== "Current" ? { color: b.color } : undefined}
                  >
                    {formatMoney(b.cents)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {b.count === 0 ? "—" : `${b.count} invoice${b.count === 1 ? "" : "s"}`}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">No unpaid invoices.</p>
        )}
      </div>

      {/* Status line */}
      {statusParts.length > 0 && (
        <p className="px-1 text-sm text-muted">
          {statusParts.join(" · ")}
        </p>
      )}
    </section>
  );
}
