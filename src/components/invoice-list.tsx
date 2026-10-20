"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { STATUS_LABEL, type InvoiceStatus } from "@/lib/status";
import type { InvoiceRow } from "@/lib/dashboard";
import { bulkDeleteInvoicesAction, deleteInvoiceAction } from "@/actions/invoices";

function PencilIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" />
      <path d="M9.5 4.5l2 2" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 4h11" />
      <path d="M6.5 4V2.5h3V4" />
      <path d="M4 4l.7 9.5h6.6L12 4" />
      <path d="M6.8 7v4M9.2 7v4" />
    </svg>
  );
}

function DotsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <circle cx="8" cy="3" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="8" cy="13" r="1.4" />
    </svg>
  );
}

/** Row overflow menu. Delete lives here, still two-step, no blocking dialogs. */
function RowMenu({
  workspaceId,
  invoiceId,
  invoiceNumber,
  onDeleted,
  onError,
}: {
  workspaceId: string;
  invoiceId: string;
  invoiceNumber: string;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  async function run() {
    setBusy(true);
    const result = await deleteInvoiceAction(workspaceId, invoiceId);
    setBusy(false);
    if (result?.error) {
      onError(result.error);
    } else {
      onDeleted(invoiceId);
    }
    close();
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => {
          setConfirming(false);
          setOpen((v) => !v);
        }}
        aria-label={`Actions for ${invoiceNumber}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="rounded-lg p-1.5 text-muted transition hover:text-ink"
      >
        <DotsIcon />
      </button>
      {open ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={close}
            className="fixed inset-0 z-10 cursor-default"
          />
          <span
            role="menu"
            aria-label={`Actions for ${invoiceNumber}`}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
            className="absolute right-0 z-20 min-w-44 rounded-xl border border-line bg-paper p-1.5 shadow-lg"
          >
            {!confirming ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirming(true)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-paper-2"
              >
                <TrashIcon />
                Delete
              </button>
            ) : (
              <span className="block px-1.5 py-1 text-sm">
                <span className="block px-1.5 pb-2 text-muted">Delete {invoiceNumber}?</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={run}
                    disabled={busy}
                    className="rounded-lg bg-[var(--ink)] px-2.5 py-1 font-semibold text-[var(--paper)] disabled:opacity-60"
                  >
                    {busy ? "Deleting…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={busy}
                    className="rounded-lg px-2 py-1 text-muted underline underline-offset-2"
                  >
                    Keep
                  </button>
                </span>
              </span>
            )}
          </span>
        </>
      ) : null}
    </span>
  );
}


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

const longDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// Table status cell: short label, sub-line detail, and a semantic dot.
function statusCell(invoice: InvoiceRow): { label: string; sub: string; dot: string } {
  if (invoice.stripePaymentState === "disputed") return { label: "Disputed", sub: dueLine(invoice), dot: "#B3402E" };
  if (invoice.stripePaymentState === "partially_refunded") return { label: "Partly refunded", sub: dueLine(invoice), dot: "#B7791F" };
  if (invoice.stripePaymentState === "fully_refunded") return { label: "Refunded", sub: dueLine(invoice), dot: "#6B7B76" };
  if (invoice.isPaid) {
    const when = invoice.sentAt ?? invoice.issueDate;
    return { label: "Paid", sub: longDate.format(new Date(when)), dot: "#2E7D4F" };
  }
  if (invoice.isPartiallyPaid) return { label: "Partly paid", sub: `${formatMoney(invoice.dueCents)} due`, dot: "#B7791F" };
  if (invoice.isOverdue) return { label: "Overdue", sub: dueLine(invoice), dot: "#B3402E" };
  if (invoice.firstViewedAt) return { label: "Viewed", sub: longDate.format(new Date(invoice.firstViewedAt)), dot: "#44776C" };
  if (invoice.status === "sent") {
    return {
      label: "Sent",
      sub: invoice.sentAt ? longDate.format(new Date(invoice.sentAt)) : dueLine(invoice),
      dot: "#44776C",
    };
  }
  if (invoice.status === "confirmed") return { label: "Confirmed", sub: "Not sent", dot: "#B7791F" };
  return { label: STATUS_LABEL[invoice.status as InvoiceStatus] ?? invoice.status, sub: dueLine(invoice), dot: "#6B7B76" };
}

function dueLine(invoice: InvoiceRow): string {
  return invoice.dueDate ? longDate.format(new Date(invoice.dueDate)) : "Due on receipt";
}

/** Days from today to the due date. Null when there is no due date. */
function daysUntilDue(invoice: InvoiceRow): number | null {
  if (!invoice.dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(invoice.dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/** Due-date sub-line: "in 29 days", "Due today", or "Overdue by 3 days". Never on paid invoices. */
function dueCountdown(invoice: InvoiceRow): { text: string | null; tone: "muted" | "soon" | "late" } {
  if (invoice.isPaid) return { text: null, tone: "muted" };
  const days = daysUntilDue(invoice);
  if (days === null) return { text: null, tone: "muted" };
  if (days < 0) return { text: `Overdue by ${-days} day${-days === 1 ? "" : "s"}`, tone: "late" };
  if (days === 0) return { text: "Due today", tone: "soon" };
  if (days === 1) return { text: "in 1 day", tone: "soon" };
  return { text: `in ${days} days`, tone: days <= 7 ? "soon" : "muted" };
}

const COUNTDOWN_TONE: Record<"muted" | "soon" | "late", { color?: string; className?: string }> = {
  muted: { className: "text-muted" },
  soon: { color: "#B7791F" },
  late: { color: "#B3402E" },
};

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className="inline h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        opacity: active ? 1 : 0.45,
        transform: dir === "asc" ? "rotate(180deg)" : undefined,
      }}
    >
      <path d="M6 1.5v9" />
      <path d="M3 7.5l3 3 3-3" />
    </svg>
  );
}

export function InvoiceList({ invoices, manageable = false }: { invoices: InvoiceRow[]; manageable?: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [sort, setSort] = useState<{ key: "invoice" | "client" | "due" | "amount" | "status"; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  function updateFilter(next: FilterKey) {
    setFilter(next);
    setPage(1);
  }

  function updateQuery(next: string) {
    setQuery(next);
    setPage(1);
  }

  function updatePageSize(next: number) {
    setPageSize(next);
    setPage(1);
  }

  function refreshAfterChange(ids: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setConfirmingBulkDelete(false);
    router.refresh();
  }

  async function runBulkDelete() {
    setBulkBusy(true);
    setNotice(null);
    const result = await bulkDeleteInvoicesAction([...selected]);
    setBulkBusy(false);
    if (result?.error) {
      setNotice(result.error);
      setConfirmingBulkDelete(false);
    } else {
      if (result?.message) setNotice(result.message);
      refreshAfterChange([...selected]);
    }
  }

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

  function cycleSort(key: "invoice" | "client" | "due" | "amount" | "status") {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  const sorted = useMemo(() => {
    if (!sort) return visible;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...visible].sort((a, b) => {
      if (sort.key === "amount") return (a.totalCents - b.totalCents) * dir;
      if (sort.key === "status") return statusCell(a).label.localeCompare(statusCell(b).label) * dir;
      if (sort.key === "invoice") return a.number.localeCompare(b.number, undefined, { numeric: true }) * dir;
      if (sort.key === "client") return a.clientName.localeCompare(b.clientName) * dir;
      const at = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bt = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return (at - bt) * dir;
    });
  }, [visible, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  );
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, sorted.length);

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

  function sortButton(key: "invoice" | "client" | "due" | "amount" | "status", label: string) {
    const active = sort?.key === key;
    const dir = sort?.dir ?? "desc";
    return (
      <button
        type="button"
        onClick={() => cycleSort(key)}
        aria-label={`Sort by ${label}${active ? (sort.dir === "asc" ? ", ascending" : ", descending") : ""}`}
        className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-ink"
        style={active ? { color: "var(--ink)" } : undefined}
      >
        {label}
        <SortIcon active={active} dir={dir} />
      </button>
    );
  }

  return (
    <section>
      <div className="paper overflow-hidden rounded-3xl">
        <form action="/api/invoices/zip" method="post">
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="id" value={id} />
          ))}
          {/* Search + filter pills in one row */}
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <div className="relative min-w-52 flex-1">
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden style={{ color: "var(--muted)" }}>
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13.5 13.5 17 17" />
          </svg>
          <input
            type="search"
            placeholder="Search invoices by number or client..."
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            aria-label="Search invoices by number or client"
            className="toolbar-15 w-full rounded-xl border border-line bg-paper py-1.5 pl-10 pr-3 placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => updateFilter(key)}
              aria-pressed={filter === key}
              className="toolbar-15 rounded-full px-3.5 py-1 font-medium transition-colors"
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
      </div>

      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">No invoices match.</p>
      ) : (
        <>
          {selected.size > 0 ? (
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5 text-sm">
              <span className="text-muted">
                {selected.size} selected · {formatMoney(selectedTotal)}
              </span>
              <span className="ml-auto flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-sm text-muted underline underline-offset-2"
                >
                  Clear
                </button>
                {manageable ? (
                  confirmingBulkDelete ? (
                    <span className="flex items-center gap-2 text-sm">
                      <button
                        type="button"
                        onClick={runBulkDelete}
                        disabled={bulkBusy}
                        className="btn btn-primary disabled:opacity-60"
                      >
                        {bulkBusy ? "Deleting…" : `Delete ${selected.size}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingBulkDelete(false)}
                        disabled={bulkBusy}
                        className="text-sm text-muted underline underline-offset-2"
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingBulkDelete(true)}
                      className="text-sm text-muted underline underline-offset-2"
                    >
                      Delete {selected.size}
                    </button>
                  )
                ) : null}
                <button className="btn btn-primary">
                  Download {selected.size} as ZIP
                </button>
              </span>
            </div>
          ) : null}
          {notice ? <p className="border-b border-line px-4 py-2 text-sm text-muted" role="status">{notice}</p> : null}
          <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] table-fixed text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                    <th scope="col" className="w-12 px-4 py-2 font-medium">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        aria-label="Select all shown"
                      />
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">{sortButton("invoice", "Invoice")}</th>
                    <th scope="col" className="px-2 py-2 font-medium">{sortButton("client", "Client")}</th>
                    <th scope="col" className="px-2 py-2 font-medium">{sortButton("due", "Due date")}</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">{sortButton("amount", "Amount")}</th>
                    <th scope="col" className="py-2 pl-8 pr-2 font-medium">{sortButton("status", "Status")}</th>
                    <th scope="col" className="w-28 px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paged.map((invoice) => {
                    const isSelected = selected.has(invoice.id);
                    const cell = statusCell(invoice);
                    const countdown = dueCountdown(invoice);
                    const countdownStyle = COUNTDOWN_TONE[countdown.tone];
                    return (
                      <tr key={invoice.id} className={isSelected ? "bg-paper-2" : undefined}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggle(invoice.id)}
                            aria-label={`Select ${invoice.number}`}
                          />
                        </td>
                        <td className="px-2 py-2 font-semibold tabular-nums">
                          <Link href={`/invoices/view/${invoice.id}`} className="hover:text-ink">
                            {invoice.number}
                          </Link>
                        </td>
                        <td className="truncate px-2 py-2 text-muted">{invoice.clientName}</td>
                        <td className="whitespace-nowrap px-2 py-2">
                          <span className="block">{invoice.dueDate ? longDate.format(new Date(invoice.dueDate)) : "On receipt"}</span>
                          {countdown.text ? (
                            <span
                              className={`block text-xs ${countdownStyle.className ?? ""}`}
                              style={countdownStyle.color ? { color: countdownStyle.color } : undefined}
                            >
                              {countdown.text}
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                          {formatMoney(invoice.totalCents)}
                        </td>
                        <td className="py-2 pl-8 pr-2">
                          <span className="flex items-start gap-2">
                            <span
                              aria-hidden
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                              style={{ background: cell.dot }}
                            />
                            <span>
                              <span className="block font-medium">{cell.label}</span>
                              <span className="block text-xs text-muted">{cell.sub}</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {manageable ? (
                            <span className="flex items-center justify-end">
                              <Link
                                href={`/create?edit=${invoice.id}`}
                                title={`Edit ${invoice.number}`}
                                aria-label={`Edit ${invoice.number}`}
                                className="rounded-lg p-1.5 text-muted transition hover:text-ink"
                              >
                                <PencilIcon />
                              </Link>
                              <RowMenu
                                workspaceId={invoice.workspaceId}
                                invoiceId={invoice.id}
                                invoiceNumber={invoice.number}
                                onError={setNotice}
                                onDeleted={(id) => refreshAfterChange([id])}
                              />
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
              <p>
                Showing {rangeStart}–{rangeEnd} of {sorted.length} {sorted.length === 1 ? "invoice" : "invoices"}
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  Rows:
                  <select
                    value={pageSize}
                    onChange={(e) => updatePageSize(Number(e.target.value))}
                    aria-label="Rows per page"
                    className="rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                  >
                    {[25, 50, 100].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    aria-label="Previous page"
                    className="rounded-lg px-2 py-1 text-lg leading-none disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <span className="tabular-nums">{safePage} of {pageCount}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={safePage >= pageCount}
                    aria-label="Next page"
                    className="rounded-lg px-2 py-1 text-lg leading-none disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </>
      )}
        </form>
      </div>
    </section>
  );
}
