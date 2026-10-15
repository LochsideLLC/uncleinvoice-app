"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { STATUS_LABEL, type InvoiceStatus } from "@/lib/status";
import type { InvoiceRow } from "@/lib/dashboard";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "awaiting_review", label: "Waiting" },
  { key: "confirmed", label: "Confirmed" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "2-digit",
});

// One workflow word is never the whole story: a confirmed invoice may never
// have been sent, and a sent one went out on a specific day. Viewed tracking
// does not exist yet, so the row says what is known.
function rowStatus(invoice: InvoiceRow): string {
  if (invoice.isPaid) return "Paid";
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
        (filter === "paid" ? inv.isPaid : inv.status === filter && !inv.isPaid);
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

      <div className="flex flex-wrap gap-4">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className="text-sm transition-colors"
            style={
              filter === key
                ? { color: "var(--ink)", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "3px" }
                : { color: "var(--muted)", textDecoration: "underline", textUnderlineOffset: "3px" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Search by number or client…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
      />

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
                      className="flex min-w-0 flex-1 items-center gap-3 py-2 text-sm hover:text-ink"
                    >
                      <span className="w-[4.75rem] shrink-0 font-medium tabular-nums">
                        {invoice.number}
                      </span>
                      <span className="w-[5.5rem] shrink-0 text-muted tabular-nums">
                        {shortDate.format(new Date(invoice.issueDate))}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-muted">
                        {invoice.clientName}
                      </span>
                      <span className="w-36 shrink-0 text-right text-muted">
                        {rowStatus(invoice)}
                      </span>
                      <span className="w-24 shrink-0 text-right font-semibold tabular-nums">
                        {invoice.isPaid || invoice.dueCents === 0
                          ? formatMoney(invoice.totalCents)
                          : `${formatMoney(invoice.dueCents)} due`}
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
