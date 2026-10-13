"use client";

import { useActionState } from "react";
import Link from "next/link";
import { contractorConfirmAllAction, sendInvoicesByLinkAction } from "@/actions/invoices";
import { FormBanner } from "@/components/form-banner";

type Row = {
  id: string;
  number: string;
  date: string;
  description: string;
  total: string;
  confirmed: boolean;
  sent: boolean;
};

export function ContractorInvoiceList({
  token,
  rows,
  outstanding,
  grandTotal,
  clientName,
  contractorEmail,
}: {
  token: string;
  rows: Row[];
  outstanding: number;
  grandTotal: string;
  clientName: string;
  contractorEmail: string | null;
}) {
  const [confirmState, confirm, confirming] = useActionState(contractorConfirmAllAction, null);
  const [sendState, send, sending] = useActionState(sendInvoicesByLinkAction, null);

  const unsent = rows.filter((row) => row.confirmed && !row.sent).length;
  const alreadySent = rows.filter((row) => row.sent).length;
  const justSent = Boolean(sendState?.ok);

  return (
    <div className="mt-8 space-y-6">
      {outstanding > 0 ? (
        <form action={confirm} className="paper space-y-4 rounded-3xl p-6">
          <input type="hidden" name="token" value={token} />
          <FormBanner state={confirmState} />
          <h2 className="text-xl">Confirm these are right</h2>
          <p className="text-sm text-muted">
            Confirming marks {outstanding === rows.length ? "all" : "the remaining"}{" "}
            {outstanding} {outstanding === 1 ? "invoice" : "invoices"} as issued by you to{" "}
            {clientName}. If something is wrong, contact {clientName} and get it corrected
            first.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-muted">Your email address</span>
              <input
                name="email"
                type="email"
                required
                defaultValue={contractorEmail ?? ""}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-base placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Phone (optional)</span>
              <input
                name="phone"
                type="tel"
                className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-base focus:border-accent focus:outline-none"
              />
            </label>
          </div>
          <p className="text-xs text-muted">
            Your email goes on the invoices and is where {clientName} replies. It is not
            shown to anyone else.
          </p>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="attest" className="mt-1" />
            <span>
              I confirm these {outstanding} {outstanding === 1 ? "invoice" : "invoices"},
              totalling {grandTotal}, are an accurate record of work I did for {clientName}.
            </span>
          </label>
          <button className="btn btn-primary" disabled={confirming}>
            {confirming ? "Confirming…" : "Confirm"}
          </button>
        </form>
      ) : justSent || (alreadySent > 0 && unsent === 0) ? (
        <div className="paper rounded-3xl p-6">
          <p className="text-lg" style={{ color: "var(--olive)" }}>
            ✓ Sent to {clientName}
          </p>
          <p className="mt-2 text-muted">
            {clientName} has {justSent ? "" : "already "}received{" "}
            {justSent ? rows.filter((row) => row.confirmed).length : alreadySent}{" "}
            {alreadySent === 1 ? "invoice" : "invoices"} from you, as PDFs. Nothing else is
            needed. You can download any of them above while this link is live.
          </p>
        </div>
      ) : (
        <form action={send} className="paper space-y-4 rounded-3xl p-6">
          <input type="hidden" name="token" value={token} />
          <FormBanner state={sendState} />
          <h2 className="text-xl">Send them to {clientName}</h2>
          <p className="text-sm text-muted">
            We email all {unsent} {unsent === 1 ? "invoice" : "invoices"} to {clientName} as
            PDFs, from you, with your address as the reply-to. You do not have to download
            or attach anything.
          </p>
          <button className="btn btn-primary" disabled={sending}>
            {sending ? "Sending…" : `Send ${unsent} to ${clientName}`}
          </button>
        </form>
      )}

      <div className="paper overflow-hidden rounded-3xl">
        <ul>
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line px-5 py-4 first:border-t-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted">
                  {row.number} · {row.date}
                  {row.sent ? " · sent" : row.confirmed ? " · confirmed" : ""}
                </p>
                <p className="truncate">{row.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="tabular-nums">{row.total}</span>
                <Link
                  href={`/api/invoices/${row.id}/pdf?token=${token}`}
                  className="text-sm text-ink underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  PDF
                </Link>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-line px-5 py-4 text-lg">
          <span className="display">Total</span>
          <span className="display tabular-nums">{grandTotal}</span>
        </div>
      </div>
    </div>
  );
}
