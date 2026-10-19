"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { STATUS_LABEL, type InvoiceStatus } from "@/lib/status";
import type { InvoiceRow } from "@/lib/dashboard";


const FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "viewed", label: "Viewed" },
  { key: "awaiting_payment", label: "Awaiting payment" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "2-digit",
});

// Delivery, opening, and payment remain separate facts in the data.
function rowStatus(invoice: InvoiceRow): string {
  if (invoice.stripePaymentState === "disputed") return "Disputed";
  if (invoice.stripePaymentState === "partially_refunded") return "Partly refunded";
  if (invoice.stripePaymentState === "fully_refunded") return "Refunded";
  if (invoice.isPaid) return "Paid";
  if (invoice.isPartiallyPaid) return "Partly paid";
  if (invoice.isOverdue) return "Overdue";
  if (invoice.firstViewedAt) return `Viewed ${shortDate.format(new Date(invoice.firstViewedAt))}`;
  if (invoice.status === "sent") {
    return invoice.sentAt ? `Sent ${shortDate.format(new Date(invoice.sentAt))}` : "Sent";
  }
  if (invoice.status === "confirmed") return "Confirmed · Not sent";
  return STATUS_LABEL[invoice.status as InvoiceStatus] ?? invoice.status;
}

export function InvoiceList({ invoices }: { invoices: InvoiceRow[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "paid" && inv.isPaid) ||
        (filter === "draft" && inv.status === "draft" && !inv.isPaid) ||
        (filter === "sent" && inv.status === "sent" && !inv.isPaid) ||
        (filter === "viewed" && Boolean(inv.firstViewedAt) && !inv.isPaid) ||
        (filter === "awaiting_payment" && inv.dueCents > 0 && ["confirmed", "sent"].includes(inv.status)) ||
        (filter === "overdue" && inv.isOverdue);
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        inv.number.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [invoices, filter, query]);

  const visibleIds = useMemo(() => visible.map((inv) => inv.id), [visible]);
  const selectedVisible = visibleIds.filter((id) => selected.has(id));
  const allVisibleSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });

  const selectedTotal = invoices
    .filter((inv) => selected.has(inv.id))
    .reduce((sum, inv) => sum + inv.totalCents, 0);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-widest text-muted">Invoices</p>
        <h2 className="mt-1 text-3xl">Browse &amp; filter</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
            style={
              filter === key
                ? { background: "var(--ink)", color: "var(--paper)" }
                : {
                    background: "var(--paper)",
                    color: "var(--muted)",
                    boxShadow: "inset 0 0 0 1px var(--line)",
                  }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden style={{ color: "var(--muted)" }}>
          <circle cx="9" cy="9" r="5.5" />
          <path d="M13.5 13.5 17 17" />
        </svg>
        <input
          type="search"
          placeholder="Search by number or client..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search invoices by number or client"
          className="w-full rounded-xl border border-line bg-paper py-2.5 pl-10 pr-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No invoices match.</p>
      ) : (
        <form action="/api/invoices/zip" method="post" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                aria-label="Select all shown"
              />
              <span>
                Select all {visible.length} shown
                {selected.size > 0 ? ` · ${selected.size} selected, ${formatMoney(selectedTotal)}` : ""}
              </span>
            </label>
            {selected.size > 0 ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-sm text-muted underline underline-offset-2"
                >
                  Clear
                </button>
                <button className="btn btn-primary">
                  Download {selected.size} as ZIP
                </button>
              </div>
            ) : null}
          </div>

          {[...selected].map((id) => (
            <input key={id} type="hidden" name="id" value={id} />
          ))}

          <div className="paper overflow-hidden rounded-2xl">
            <ul className="divide-y divide-line">
              {visible.map((invoice) => {
                const isSelected = selected.has(invoice.id);
                return (
                  <li
                    key={invoice.id}
                    className={`flex items-center gap-3 px-4 ${isSelected ? "bg-paper-2" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(invoice.id)}
                      aria-label={`Select ${invoice.number}`}
                      className="shrink-0"
                    />
                    <Link
                      href={`/invoices/view/${invoice.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 py-3 text-sm hover:text-ink"
                    >
                      <span className="w-[4.75rem] shrink-0 font-semibold tabular-nums">
                        {invoice.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-muted">{invoice.clientName}</span>
                        <span className="block text-xs text-muted">
                          Due {invoice.dueDate ? shortDate.format(new Date(invoice.dueDate)) : "on receipt"}
                          {invoice.sentAt ? ` · Sent ${shortDate.format(new Date(invoice.sentAt))}` : ""}
                          {invoice.firstViewedAt ? ` · Opened ${shortDate.format(new Date(invoice.firstViewedAt))}` : ""}
                        </span>
                      </span>
                      <span className="w-28 shrink-0 text-right">
                        <span className="block font-semibold tabular-nums">{formatMoney(invoice.totalCents)}</span>
                        <span className="block text-xs text-muted">{rowStatus(invoice)} · {formatMoney(invoice.dueCents)} due</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </form>
      )}
    </section>
  );
}
