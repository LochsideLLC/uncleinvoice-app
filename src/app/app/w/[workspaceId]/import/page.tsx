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
        <h2 className="text-2xl">Import payments</h2>
        <p className="mt-2 text-muted">
          Upload a spreadsheet of checks or payments. We will create a contractor if they
          are new, and seed one draft invoice per row, marked as already paid.
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
            `${CSV_TEMPLATE_HEADER}\nMaria Lopez,maria.lopez@example.test,2026-03-31,600,600,Lincoln Park weekly cleans\n`,
          )}`}
          download="invoice-ready-template.csv"
        >
          Download a template
        </a>
        <p className="mt-3">
          These are payments that already went out, so every row is marked paid in full
          unless <code className="text-ink">amount_paid</code> says otherwise. Put a
          smaller figure there for a part payment, or <code className="text-ink">no</code>
          for one that is still owed.
        </p>
      </div>
      <form action={action} className="paper space-y-4 rounded-3xl p-6">
        <input type="hidden" name="workspaceId" value={params.workspaceId} />
        <FormBanner state={state} />
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
