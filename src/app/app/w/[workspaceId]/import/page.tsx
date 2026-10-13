"use client";

import { useActionState } from "react";
import { useParams } from "next/navigation";
import { importPaymentsAction } from "@/actions/import";
import { FormBanner } from "@/components/form-banner";
import { CSV_TEMPLATE_HEADER } from "@/lib/csv";

export default function ImportPage() {
  const params = useParams<{ workspaceId: string }>();
  const [state, action, pending] = useActionState(importPaymentsAction, null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl">Import invoices</h2>
        <p className="mt-2 text-muted">
          Upload a spreadsheet and we will create a contractor if they are new, and seed
          one draft invoice per row. Bring in money customers still owe you, payments
          that already went out, or a mix of both.
        </p>
      </div>
      <div className="paper rounded-3xl p-6 text-sm text-muted">
        <p>Columns we look for:</p>
        <code className="mt-2 block overflow-x-auto rounded-xl bg-background px-3 py-2 text-ink">
          {CSV_TEMPLATE_HEADER}
        </code>
        <a
          className="mt-3 inline-block text-ink underline"
          href={`data:text/csv,${encodeURIComponent(
            `${CSV_TEMPLATE_HEADER}\nMaria Lopez,maria.lopez@example.test,2026-03-31,600,no,Lincoln Park weekly cleans\nSam Rivera,sam.rivera@example.test,2026-04-15,450,450,April deep clean\n`,
          )}`}
          download="invoice-import-template.csv"
        >
          Download a template
        </a>
        <p className="mt-3">
          The template shows both kinds of row: Maria still owes $600 (
          <code className="text-ink">no</code> under{" "}
          <code className="text-ink">amount_paid</code>), Sam already paid $450 in full.
          A smaller figure means a part payment. Rows with a blank{" "}
          <code className="text-ink">amount_paid</code> follow the choice you make below.
        </p>
      </div>
      <form action={action} className="paper space-y-4 rounded-3xl p-6">
        <input type="hidden" name="workspaceId" value={params.workspaceId} />
        <FormBanner state={state} />
        <fieldset className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Rows with a blank amount paid are
          </legend>
          <label className="inline-flex items-center gap-1.5">
            <input type="radio" name="default_paid" value="owed" defaultChecked />
            Still owed, ready to send
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="radio" name="default_paid" value="paid" />
            Already paid, for the records
          </label>
        </fieldset>
        <div className="field">
          <label htmlFor="file">CSV file</label>
          <input id="file" name="file" type="file" accept=".csv,text/csv" required />
        </div>
        <button className="btn btn-primary" disabled={pending}>
          Import drafts
        </button>
      </form>
    </div>
  );
}
