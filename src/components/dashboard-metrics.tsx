"use client";

import { useState, useMemo } from "react";
import { formatMoney } from "@/lib/money";
import { DocumentIcon } from "@/components/workspace-icons";
import type { InvoiceRow, DashboardStats } from "@/lib/dashboard";

function CoinsIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
      <ellipse cx="10" cy="5.5" rx="5.5" ry="2.5" />
      <path d="M4.5 5.5v9c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-9" />
      <path d="M4.5 10c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5" />
    </svg>
  );
}

function ClockIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4.5l3 1.8" />
    </svg>
  );
}

function MetricTile({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{
        background: "color-mix(in srgb, var(--accent) 10%, var(--paper))",
        color: "var(--accent)",
      }}
    >
      {children}
    </span>
  );
}

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
  let totalCents = 0, outstandingCents = 0, overdueCents = 0;
  let paidCount = 0, openCount = 0, overdueCount = 0;
  let sentCount = 0, waitingCount = 0, draftCount = 0;
  for (const inv of invoices) {
    totalCents += inv.totalCents;
    outstandingCents += inv.dueCents;
    if (inv.isPaid) paidCount++;
    else if (inv.dueCents > 0) openCount++;
    if (inv.isOverdue && inv.dueCents > 0) { overdueCount++; overdueCents += inv.dueCents; }
    if (inv.status === "sent" && !inv.isPaid) sentCount++;
    if (inv.status === "awaiting_review") waitingCount++;
    if (inv.status === "draft") draftCount++;
  }
  return {
    totalCents,
    collectedCents: totalCents - outstandingCents,
    outstandingCents,
    overdueCents,
    invoiceCount: invoices.length,
    paidCount,
    openCount,
    overdueCount,
    sentCount,
    waitingCount,
    draftCount,
  };
}

function WarningIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 2.5 18 16.5H2L10 2.5Z" />
      <path d="M10 7.5v3.5" />
      <path d="M10 14h.01" />
    </svg>
  );
}

function countLine(count: number): string {
  return `${count} invoice${count === 1 ? "" : "s"}`;
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

  const cards: {
    label: string;
    value: string;
    sub: string;
    Icon: (props: { className?: string }) => React.ReactNode;
    valueColor?: string;
  }[] = [
    { label: "Invoiced", value: formatMoney(kpis.totalCents), sub: countLine(kpis.invoiceCount), Icon: DocumentIcon },
    { label: "Collected", value: formatMoney(kpis.collectedCents), sub: countLine(kpis.paidCount), Icon: CoinsIcon, valueColor: "var(--olive)" },
    { label: "Outstanding", value: formatMoney(kpis.outstandingCents), sub: countLine(kpis.openCount), Icon: ClockIcon },
    { label: "Overdue", value: formatMoney(kpis.overdueCents), sub: countLine(kpis.overdueCount), Icon: WarningIcon },
  ];

  return (
    <section className="space-y-3">
      {/* One overview card: header, metrics, and aging share a panel. */}
      <div className="paper rounded-3xl px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="display text-xl">Overview</h2>
          <label className="flex items-center gap-2 text-sm text-muted">
            <span className="sr-only">Reporting period</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              aria-label="Reporting period"
              className="rounded-xl border border-line bg-paper px-3 py-1.5 text-sm font-medium text-ink focus:border-accent focus:outline-none"
            >
              {PERIODS.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* KPI strip — four segments, subtle dividers */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-3 md:grid-cols-4 md:gap-0 md:divide-x md:divide-line">
          {cards.map(({ label, value, sub, Icon, valueColor }) => (
            <div key={label} className="flex min-w-0 items-center gap-2.5 md:px-4 md:first:pl-1 md:last:pr-0">
              <MetricTile>
                <Icon className="h-5 w-5" />
              </MetricTile>
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
                <p
                  className="display truncate text-xl leading-tight tabular-nums"
                  style={valueColor ? { color: valueColor } : undefined}
                >
                  {value}
                </p>
                <p className="text-xs text-muted">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Aging — color bar plus one compact bucket row, always visible. */}
        <div className="pt-2">
          {period !== "all" && (
            <p className="pb-1 text-xs text-muted">All unpaid invoices</p>
          )}
          {hasAging ? (
            <>
              {/* Color bar */}
              <div className="flex h-1 overflow-hidden rounded-full" style={{ background: "var(--paper-2)" }}>
                {aging.map((b) =>
                  b.cents > 0 ? (
                    <div key={b.label} style={{ flex: b.cents / agingTotal, background: b.color }} />
                  ) : null
                )}
              </div>

              {/* Buckets */}
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                {aging.map((b) => (
                  <div key={b.label} className="flex items-baseline gap-x-2">
                    <span className="inline-block h-2 w-2 flex-shrink-0 self-center rounded-full" style={{ background: b.color }} />
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted">{b.label}</p>
                    <p
                      className="display text-base leading-none tabular-nums"
                      style={b.cents > 0 && b.label !== "Current" ? { color: b.color } : undefined}
                    >
                      {formatMoney(b.cents)}
                    </p>
                    <p className="text-xs text-muted">
                      {b.count === 0 ? "—" : `${b.count}`}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No unpaid invoices.</p>
          )}
        </div>
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
