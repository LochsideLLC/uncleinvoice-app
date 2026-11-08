"use client";

import { useActionState, useState } from "react";
import { importPaymentsAction, previewPaymentsAction } from "@/actions/import";
import { FormBanner } from "@/components/form-banner";
import { CSV_TEMPLATE_HEADER } from "@/lib/csv";
import { formatMoney } from "@/lib/money";

export function ImportInvoicesForm({ workspaceId }: { workspaceId: string }) {
  const [previewState, preview, previewing] = useActionState(previewPaymentsAction, null);
  const [importState, importAction, importing] = useActionState(importPaymentsAction, null);
  const [defaultPaid, setDefaultPaid] = useState<"owed" | "paid">("owed");
  const rows = previewState?.preview ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-2xl">Import payment records</h2>
        <p className="mt-2 text-sm text-muted">Preview the rows and paid amounts first. Nothing is saved until you confirm the import.</p>
      </div>
      <div className="paper space-y-3 rounded-2xl p-4 text-sm text-muted sm:p-5">
        <p>CSV columns:</p>
        <code className="block overflow-x-auto rounded-xl bg-background px-3 py-2 text-ink">{CSV_TEMPLATE_HEADER}</code>
        <p>Include a QuickBooks transaction ID in <code className="text-ink">source_payment_id</code> when you have one. It lets the app recognize the same payment on a later import. Without it, matching date and amount rows are flagged for you to review.</p>
        <a
          className="inline-block text-ink underline underline-offset-4"
          href={`data:text/csv,${encodeURIComponent(`${CSV_TEMPLATE_HEADER}\nMaria Lopez,maria.lopez@example.test,2026-03-31,600,no,Lincoln Park weekly cleans,TXN-1001\nSam Rivera,sam.rivera@example.test,2026-04-15,450,450,April deep clean,TXN-1002\n`)}`}
          download="invoice-import-template.csv"
        >Download the template</a>
      </div>

      <form action={preview} className="paper space-y-4 rounded-2xl p-4 sm:p-5">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <FormBanner state={previewState} />
        <fieldset className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">If amount_paid is blank</legend>
          <label className="flex min-h-10 items-center gap-2"><input type="radio" name="default_paid" value="owed" checked={defaultPaid === "owed"} onChange={() => setDefaultPaid("owed")} /> Mark not paid</label>
          <label className="flex min-h-10 items-center gap-2"><input type="radio" name="default_paid" value="paid" checked={defaultPaid === "paid"} onChange={() => setDefaultPaid("paid")} /> Mark paid in full</label>
        </fieldset>
        <label className="field"><span>CSV file</span><input name="file" type="file" accept=".csv,text/csv" required /></label>
        <button className="btn btn-primary min-h-11 w-full sm:w-auto" disabled={previewing}>{previewing ? "Reading…" : "Preview rows"}</button>
      </form>

      {rows.length ? (
        <section className="space-y-3" aria-labelledby="import-preview-title">
          <div className="paper rounded-2xl p-4 sm:p-5">
            <h3 id="import-preview-title" className="text-lg font-semibold">Check this preview</h3>
            <p className="mt-1 text-sm text-muted">{previewState?.readyCount} ready · {previewState?.possibleCount} possible matches · {previewState?.duplicateCount} already imported. Possible matches are not selected automatically.</p>
          </div>

          <form action={importAction} className="space-y-3">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="csvText" value={previewState?.csvText ?? ""} />
            <input type="hidden" name="default_paid" value={previewState?.defaultPaid ?? "owed"} />
            <FormBanner state={importState} />
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
              {rows.map((row) => (
                <li key={row.index} className="p-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-medium">{row.contractor}</p><p className="text-sm text-muted">{row.date} · {row.description}</p>{row.sourcePaymentId ? <p className="mt-1 break-all text-xs text-muted">Source payment: {row.sourcePaymentId}</p> : <p className="mt-1 text-xs text-muted">No source payment ID</p>}</div>
                    <div className="text-right text-sm"><p className="font-semibold tabular-nums">{formatMoney(row.amount)}</p><p className="text-muted">Paid: {formatMoney(row.paid)}</p></div>
                  </div>
                  {row.status === "ready" ? <p className="mt-2 text-sm text-emerald-800">Ready to import as a draft</p> : null}
                  {row.status === "already_imported" ? <p className="mt-2 text-sm text-muted">Skipped: this source payment ID is already in this client’s books.</p> : null}
                  {row.status === "possible_duplicate" ? <label className="mt-3 flex min-h-11 items-start gap-3 border-t border-line pt-3 text-sm leading-snug"><input type="checkbox" name="includeAmbiguous" value={row.index} className="mt-1 h-5 w-5" /><span>Import anyway. I checked that this is a separate payment, even though the contractor, date, and amount match an existing invoice.</span></label> : null}
                </li>
              ))}
            </ul>
            <button className="btn btn-primary min-h-11 w-full sm:w-auto" disabled={importing || !(previewState?.readyCount || previewState?.possibleCount)}>{importing ? "Importing…" : "Import selected rows"}</button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
