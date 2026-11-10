"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function InvoiceSearch({
  action,
  initialValue,
  initialStatus,
  customerView,
}: {
  action: string;
  initialValue: string;
  initialStatus: "" | "draft" | "saved" | "sent" | "paid" | "overdue";
  customerView: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<typeof initialStatus>(initialStatus);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function updateResults(nextValue: string, nextStatus = status) {
    const params = new URLSearchParams();
    const query = nextValue.trim().slice(0, 80);
    if (customerView) params.set("view", "customer");
    if (query) params.set("q", query);
    if (nextStatus) params.set("status", nextStatus);
    const search = params.toString();
    router.replace(search ? `${action}?${search}` : action, { scroll: false });
  }

  function handleChange(nextValue: string) {
    setValue(nextValue);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => updateResults(nextValue), 250);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    updateResults(value);
  }

  function clearSearch() {
    if (timer.current) clearTimeout(timer.current);
    setValue("");
    updateResults("", status);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex min-w-0 items-center gap-2">
      <div className="field relative min-w-0 flex-1">
        <label htmlFor="invoice-search-field" className="sr-only">Search invoices</label>
        <input
          id="invoice-search-field"
          type="text"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          maxLength={80}
          placeholder="Search invoices"
          style={{ height: "44px", fontSize: "14px", lineHeight: "18px", padding: "0.65rem 2.6rem 0.65rem 0.65rem" }}
        />
        <button
          type="button"
          onClick={clearSearch}
          disabled={!value}
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg enabled:hover:bg-paper-2 disabled:cursor-default disabled:opacity-40"
          aria-label="Clear search"
          title="Clear search"
          style={{ fontSize: "14px" }}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </div>
      <label className="field w-32 shrink-0">
        <span className="sr-only">Filter invoices by status</span>
        <select
          value={status}
          onChange={(event) => {
            const nextStatus = event.target.value as typeof initialStatus;
            setStatus(nextStatus);
            if (timer.current) clearTimeout(timer.current);
            updateResults(value, nextStatus);
          }}
          aria-label="Filter invoices by status"
          style={{ height: "44px", fontSize: "14px", lineHeight: "18px", padding: "0.65rem" }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="saved">Saved</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </label>
    </form>
  );
}
