"use client";

import { useActionState } from "react";
import { sendMyInvoicesToClientAction } from "@/actions/contractor";
import { FormBanner } from "@/components/form-banner";

export function SendToClient({
  clientName,
  count,
  total,
  alreadySent,
}: {
  clientName: string;
  count: number;
  total: string;
  alreadySent: number;
}) {
  const [state, action, pending] = useActionState(
    async () => sendMyInvoicesToClientAction(),
    null,
  );

  return (
    <form action={action} className="paper space-y-4 rounded-3xl p-6">
      <FormBanner state={state} />
      <div>
        <h2 className="text-2xl">Send them to {clientName}</h2>
        <p className="mt-2 text-muted">
          {count} {count === 1 ? "invoice" : "invoices"}, {total} in total. They arrive as
          PDFs attached to an email from you, so {clientName} has them on file. Replies come
          back to you.
        </p>
        {alreadySent > 0 ? (
          <p className="mt-2 text-sm text-muted">
            You have already sent {alreadySent}. Sending again is harmless — they will
            simply get another copy.
          </p>
        ) : null}
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Sending…" : `Send ${count} to ${clientName}`}
      </button>
    </form>
  );
}
