"use client";

import { useMemo, useState, useActionState } from "react";
import Link from "next/link";
import { contractorBatchSendInvoicesAction } from "@/actions/invoices";
import { FormBanner } from "@/components/form-banner";
import { formatMoney } from "@/lib/money";

type Row = {
  id: string;
  number: string;
  date: string;
  description: string;
  total: string;
  cents: number;
  payment: "paid" | "partial" | "unpaid";
  confirmed: boolean;
  sent: boolean;
};

export function ContractorInvoiceList({
  token,
  rows,
  clientName,
  clientEmail,
}: {
  token: string;
  rows: Row[];
  clientName: string;
  clientEmail: string | null;
}) {
  const [sendState, send, sending] = useActionState(contractorBatchSendInvoicesAction, null);
  const unsent = rows.filter((row) => row.confirmed && !row.sent);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(unsent.length <= 50 ? unsent.map((row) => row.id) : []));
  const selectedRows = useMemo(() => unsent.filter((row) => selected.has(row.id)), [selected, unsent]);
  const selectedTotal = selectedRows.reduce((sum, row) => sum + row.cents, 0);
  const justSent = Boolean(sendState?.ok);

  return (
    <div className="mt-6 space-y-4">
      {sendState ? <FormBanner state={sendState} /> : null}

      {unsent.length > 0 ? (
        <form id="send-package-form" action={send} className="paper space-y-4 rounded-2xl p-4 sm:p-5">
          <input type="hidden" name="token" value={token} />
          <div>
            <h2 className="text-lg font-semibold">Send confirmed invoices</h2>
            <p className="mt-1 text-sm text-muted">Choose what to send. You can still fix any invoice that needs review.</p>
          </div>
          <dl className="grid gap-2 rounded-xl bg-background/70 p-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">To</dt><dd className="break-all font-medium">{clientEmail ?? "Client email not set"}</dd></div>
            <div><dt className="text-muted">Selected</dt><dd className="font-medium tabular-nums">{selectedRows.length} invoices · {formatMoney(selectedTotal)}</dd></div>
          </dl>
          <label className="field">
            <span>Copy bookkeeper (optional)</span>
            <input name="cc" type="email" placeholder="bookkeeper@example.com" autoComplete="email" />
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm leading-snug">
            <input type="checkbox" name="confirmPackage" required className="mt-1 h-5 w-5" />
            <span>I checked the selected invoices and want to email their PDFs to {clientName}{clientEmail ? ` at ${clientEmail}` : ""}.</span>
          </label>
          <button className="btn btn-primary min-h-11 w-full sm:w-auto" disabled={sending || selectedRows.length === 0 || selectedRows.length > 50 || !clientEmail}>
            {sending ? "Sending…" : `Email ${selectedRows.length} ${selectedRows.length === 1 ? "invoice" : "invoices"}`}
          </button>
          {!clientEmail ? <p className="text-sm text-muted">The client needs to add an email before invoices can be sent.</p> : null}
          {selectedRows.length > 50 ? <p className="text-sm text-muted">Choose no more than 50 invoices per email.</p> : null}
          {justSent ? <p role="status" className="text-sm text-muted">The mail provider accepted the selected package.</p> : null}
        </form>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-line bg-paper" aria-label="Your invoice list">
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id} className="p-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">{row.number} · {row.date}</p>
                  <p className="mt-1 font-medium">{row.description}</p>
                  <p className="mt-1 text-sm text-muted">Payment: {row.payment === "paid" ? "Paid" : row.payment === "partial" ? "Part paid" : "Not recorded"} <span aria-hidden>·</span> Paperwork: {row.sent ? "Sent to client" : row.confirmed ? "Confirmed" : "Needs your review"}</p>
                  {!row.confirmed && !row.sent ? <Link href={`/c/${token}/review/${row.id}`} className="mt-2 inline-flex min-h-10 items-center font-medium text-ink underline underline-offset-4">Review and correct</Link> : null}
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="font-medium tabular-nums">{row.total}</span>
                  <Link href={`/api/invoices/${row.id}/pdf?token=${encodeURIComponent(token)}`} className="inline-flex min-h-10 items-center text-sm underline underline-offset-4" target="_blank" rel="noopener noreferrer">PDF</Link>
                </div>
              </div>
              {row.confirmed && !row.sent ? <label className="mt-3 flex min-h-11 items-center gap-3 border-t border-line pt-2 text-sm">
                <input
                  type="checkbox"
                  name="invoiceId"
                  value={row.id}
                  form="send-package-form"
                  checked={selected.has(row.id)}
                  onChange={(event) => setSelected((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(row.id);
                    else next.delete(row.id);
                    return next;
                  })}
                />
                Include this invoice in the email
              </label> : null}
            </li>
          ))}
        </ul>
        {!rows.length ? <p className="px-4 py-8 text-muted">No invoices are on this link yet.</p> : null}
      </section>
    </div>
  );
}
