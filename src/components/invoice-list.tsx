"use client";

import { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1.5 8S3.8 3.5 8 3.5 14.5 8 14.5 8 12.2 12.5 8 12.5 1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="2" />
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <path d="m4 4 8 8M12 4l-8 8" />
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
              <>
                <Link
                  href={`/create?edit=${invoiceId}&returnTo=%2Fapp%23all-invoices`}
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-paper-2"
                >
                  <PencilIcon />
                  Edit
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setConfirming(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-paper-2"
                >
                  <TrashIcon />
                  Delete
                </button>
              </>
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
                  className="rounded-lg px-2 py-1 text-muted underline underline-offset-2 transition active:scale-95 active:bg-paper-2"
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

type StatusPerspective = "contractor" | "bookkeeper";

function statusCell(invoice: InvoiceRow, perspective: StatusPerspective): { label: string; dot: string } {
  if (invoice.stripePaymentState === "disputed") return { label: "Disputed", dot: "#B3402E" };
  if (invoice.stripePaymentState === "partially_refunded") return { label: "Partly refunded", dot: "#B7791F" };
  if (invoice.stripePaymentState === "fully_refunded") return { label: "Refunded", dot: "#6B7B76" };
  if (invoice.isPaid) {
    return { label: "Paid", dot: "#2E7D4F" };
  }
  if (invoice.isPartiallyPaid) return { label: "Partly paid", dot: "#B7791F" };
  if (invoice.isOverdue) return { label: "Overdue", dot: "#B3402E" };
  if (invoice.firstViewedAt) return { label: "Viewed by client", dot: "#44776C" };
  if (invoice.status === "sent") {
    return {
      label: "Sent to client",
      dot: "#44776C",
    };
  }
  if (invoice.status === "confirmed") {
    return {
      label: "Ready to send",
      dot: "#B7791F",
    };
  }
  if (invoice.status === "awaiting_review") {
    return {
      label: perspective === "contractor" ? "Needs your review" : "Needs contractor review",
      dot: "#6B7B76",
    };
  }
  if (invoice.status === "draft") {
    return {
      label: "Draft",
      dot: "#6B7B76",
    };
  }
  return { label: STATUS_LABEL[invoice.status as InvoiceStatus] ?? invoice.status, dot: "#6B7B76" };
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

export function InvoiceList({ invoices, manageable = false, perspective = "contractor" }: { invoices: InvoiceRow[]; manageable?: boolean; perspective?: StatusPerspective }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actionInvoice, setActionInvoice] = useState<InvoiceRow | null>(null);
  const [sendFeedback, setSendFeedback] = useState<"draft" | "review" | null>(null);
  const [sendFeedbackFading, setSendFeedbackFading] = useState(false);
  const [confirmingActionDelete, setConfirmingActionDelete] = useState(false);
  const [actionDeleteBusy, setActionDeleteBusy] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [sort, setSort] = useState<{ key: "invoice" | "client" | "due" | "amount" | "status"; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (!sendFeedback) return;
    const fadeTimer = window.setTimeout(() => setSendFeedbackFading(true), 2200);
    const clearTimer = window.setTimeout(() => {
      setSendFeedback(null);
      setSendFeedbackFading(false);
    }, 2700);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [sendFeedback]);

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

  async function runActionDelete() {
    if (!actionInvoice) return;
    setActionDeleteBusy(true);
    const result = await deleteInvoiceAction(actionInvoice.workspaceId, actionInvoice.id);
    setActionDeleteBusy(false);
    if (result?.error) setNotice(result.error);
    else refreshAfterChange([actionInvoice.id]);
    setActionInvoice(null);
    setConfirmingActionDelete(false);
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
      if (sort.key === "status") return statusCell(a, perspective).label.localeCompare(statusCell(b, perspective).label) * dir;
      if (sort.key === "invoice") return a.number.localeCompare(b.number, undefined, { numeric: true }) * dir;
      if (sort.key === "client") return a.clientName.localeCompare(b.clientName) * dir;
      const at = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bt = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return (at - bt) * dir;
    });
  }, [visible, sort, perspective]);

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
  const showMobileSelection = selectionMode || selected.size > 0;

  useEffect(() => {
    if (!actionInvoice) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [actionInvoice]);

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
        className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-ink active:scale-95"
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
            className="toolbar-15 w-full rounded-xl border border-line bg-paper py-1.5 pl-10 pr-3 placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
        <div className="hidden flex-wrap gap-2 sm:flex">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => updateFilter(key)}
              aria-pressed={filter === key}
              className="toolbar-15 rounded-full px-3.5 py-1 font-medium transition active:scale-95"
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
        <div className="flex w-full gap-2 sm:hidden">
          <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted">
            <span>Status</span>
            <select
              value={filter}
              onChange={(event) => updateFilter(event.target.value as FilterKey)}
              aria-label="Filter invoices by status"
              className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {FILTERS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted">
            <span>Sort</span>
            <select
              value={sort ? `${sort.key}:${sort.dir}` : ""}
              onChange={(event) => {
                const [key, dir] = event.target.value.split(":");
                if (!key || !dir) setSort(null);
                else setSort({ key: key as "invoice" | "client" | "due" | "amount" | "status", dir: dir as "asc" | "desc" });
              }}
              aria-label="Sort invoices"
              className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="">Default</option>
              <option value="invoice:asc">Invoice</option>
              <option value="client:asc">Client</option>
              <option value="due:asc">Due date</option>
              <option value="amount:desc">Amount high to low</option>
              <option value="status:asc">Status</option>
            </select>
          </label>
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
                  className="text-sm text-muted underline underline-offset-2 transition active:scale-95 active:bg-paper-2"
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
          <div className="flex items-center justify-end border-b border-line px-4 py-2 sm:hidden">
            {showMobileSelection ? (
              <div className="flex w-full items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Select all shown invoices"
                />
                <span className="text-muted">Select all shown ({visibleIds.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelected(new Set());
                  }}
                  className="ml-auto rounded-lg px-2 py-1 text-muted underline underline-offset-2"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                className="rounded-lg px-2 py-1 text-sm text-muted underline underline-offset-2 transition active:scale-95 active:bg-paper-2"
              >
                Select invoices
              </button>
            )}
          </div>
          <ul className="space-y-2 px-2 py-2 sm:hidden">
            {paged.map((invoice) => {
              const isSelected = selected.has(invoice.id);
              const cell = statusCell(invoice, perspective);
              const countdown = dueCountdown(invoice);
              const countdownStyle = COUNTDOWN_TONE[countdown.tone];
              return (
                <li
                  key={invoice.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Invoice ${invoice.number}, ${cell.label}. Tap for actions.`}
                  onClick={() => {
                    setActionInvoice(invoice);
                    setSendFeedback(null);
                    setSendFeedbackFading(false);
                    setConfirmingActionDelete(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActionInvoice(invoice);
                      setSendFeedback(null);
                      setSendFeedbackFading(false);
                      setConfirmingActionDelete(false);
                    }
                  }}
                  className={`relative cursor-pointer overflow-hidden rounded-xl border border-line p-4 transition-[transform,filter] active:scale-[0.99] active:brightness-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${isSelected ? "ring-2 ring-[var(--ink)]" : ""}`}
                  style={{ backgroundColor: `color-mix(in srgb, ${cell.dot} ${isSelected ? "16%" : "9%"}, var(--paper))` }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-2 right-3 z-0 max-w-[70%] origin-right scale-x-75 overflow-hidden text-ellipsis whitespace-nowrap font-black uppercase tracking-normal opacity-[0.10]"
                    style={{ color: cell.dot, fontFamily: 'Impact, Haettenschweiler, "Arial Narrow", sans-serif', fontStretch: "condensed", fontSize: "clamp(calc(1.2rem - 1px), calc(6vw - 1px), calc(1.55rem - 1px))", transformOrigin: "right center" }}
                  >
                    {cell.label}
                  </span>
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {showMobileSelection ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(invoice.id)}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Select ${invoice.number}`}
                          className="mt-1 h-5 w-5 shrink-0"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <span className="font-semibold tabular-nums">
                          {invoice.number}
                        </span>
                        <p className="mt-0.5 break-words text-sm text-muted">{invoice.clientName}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-right font-semibold tabular-nums">{formatMoney(invoice.totalCents)}</p>
                  </div>
                  <div className={`relative z-10 mt-3 flex flex-wrap items-end justify-between gap-3 ${showMobileSelection ? "pl-8" : "pl-0"}`}>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted">Due:</span> {invoice.dueDate ? longDate.format(new Date(invoice.dueDate)) : "On receipt"}</p>
                      {countdown.text ? <p className={`text-xs ${countdownStyle.className ?? ""}`} style={countdownStyle.color ? { color: countdownStyle.color } : undefined}>{countdown.text}</p> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {actionInvoice && mounted ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-3 sm:hidden" onClick={() => setActionInvoice(null)}>
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="invoice-action-title"
                className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-paper p-4 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 id="invoice-action-title" className="font-semibold">{actionInvoice.number}</h2>
                    <p className="text-sm text-muted">{actionInvoice.clientName}</p>
                  </div>
                  <button type="button" onClick={() => setActionInvoice(null)} aria-label="Close actions" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted transition active:scale-95 active:bg-paper-2">
                    <CloseIcon />
                    Close
                  </button>
                </div>
                {confirmingActionDelete ? (
                  <div className="space-y-3">
                    <p>Delete this invoice?</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={runActionDelete} disabled={actionDeleteBusy} className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper)] transition active:scale-95 disabled:opacity-60">
                        {actionDeleteBusy ? "Deleting…" : "Delete"}
                      </button>
                      <button type="button" onClick={() => setConfirmingActionDelete(false)} disabled={actionDeleteBusy} className="rounded-lg border border-line px-4 py-2 text-sm transition active:scale-95 active:bg-paper-2">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Link href={`/invoices/view/${actionInvoice.id}`} className="rounded-xl border border-line px-4 py-3 font-medium transition active:scale-[0.99] active:bg-paper-2">View invoice</Link>
                    {manageable ? <Link href={`/create?edit=${actionInvoice.id}&returnTo=%2Fapp%23all-invoices`} className={`rounded-xl border px-4 py-3 font-medium transition-colors duration-500 active:scale-[0.99] active:bg-paper-2 ${sendFeedback === "draft" && !sendFeedbackFading ? "border-[#44776C] bg-[#E5EFEA] text-[#315B52]" : "border-line"}`}>Edit invoice</Link> : null}
                    {actionInvoice.canSend && actionInvoice.status !== "sent" && !actionInvoice.sentAt ? (
                      actionInvoice.status === "confirmed" ? (
                        <Link href={`/invoices/view/${actionInvoice.id}?send=1`} className="rounded-xl border border-line px-4 py-3 font-medium transition active:scale-[0.99] active:bg-paper-2">Send invoice</Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSendFeedback(actionInvoice.status === "draft" ? "draft" : "review");
                            setSendFeedbackFading(false);
                          }}
                          className={`w-full rounded-xl border px-4 py-3 text-left font-medium transition-colors duration-500 active:scale-[0.99] ${sendFeedback && !sendFeedbackFading ? sendFeedback === "draft" ? "border-[#B3402E] bg-[#FCE8E3] text-[#B3402E]" : "border-[#B7791F] bg-[#F7EBD8] text-[#7A4B13]" : "border-line bg-paper-2 text-muted"}`}
                        >
                          <span className={`transition-opacity duration-500 ${sendFeedbackFading ? "opacity-0" : "opacity-100"}`} aria-live="polite">
                            {sendFeedback === "draft" ? "Edit and save first" : sendFeedback === "review" ? "Review and confirm first" : "Send invoice"}
                          </span>
                        </button>
                      )
                    ) : null}
                    {manageable ? <button type="button" onClick={() => setConfirmingActionDelete(true)} className="rounded-xl border border-line px-4 py-3 text-left font-medium text-[#B3402E] transition active:scale-[0.99] active:bg-paper-2">Delete invoice</button> : null}
                  </div>
                )}
              </section>
            </div>,
            document.body,
          ) : null}
          <div className="hidden overflow-x-auto sm:block">
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
                    <th scope="col" className="w-32 px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paged.map((invoice) => {
                    const isSelected = selected.has(invoice.id);
                    const cell = statusCell(invoice, perspective);
                    const countdown = dueCountdown(invoice);
                    const countdownStyle = COUNTDOWN_TONE[countdown.tone];
                    return (
                      <tr
                        key={invoice.id}
                        className={`cursor-pointer transition-colors hover:bg-paper-2/60 ${isSelected ? "bg-paper-2" : ""}`}
                        onClick={(event) => {
                          // Controls inside the row (checkbox, links, the menu) keep their own behaviour.
                          if ((event.target as HTMLElement).closest("a, button, input, label, select")) return;
                          router.push(`/invoices/view/${invoice.id}`);
                        }}
                      >
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
                            <span className="block font-medium">{cell.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="flex items-center justify-end">
                            <Link
                              href={`/invoices/view/${invoice.id}`}
                              title={`View ${invoice.number}`}
                              aria-label={`View ${invoice.number}`}
                              className="rounded-lg p-1.5 text-muted transition hover:text-ink"
                            >
                              <EyeIcon />
                            </Link>
                            {manageable ? (
                              <>
                                <RowMenu
                                  workspaceId={invoice.workspaceId}
                                  invoiceId={invoice.id}
                                  invoiceNumber={invoice.number}
                                  onError={setNotice}
                                  onDeleted={(id) => refreshAfterChange([id])}
                                />
                              </>
                            ) : null}
                          </span>
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
