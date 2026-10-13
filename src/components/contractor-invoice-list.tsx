"use client";

import { useActionState } from "react";
import Link from "next/link";
import { contractorConfirmAllAction } from "@/actions/invoices";
import { FormBanner } from "@/components/form-banner";

type Row = {
  id: string;
  number: string;
  date: string;
  description: string;
  total: string;
  confirmed: boolean;
};

export function ContractorInvoiceList({
  token,
  rows,
  outstanding,
  grandTotal,
  clientName,
}: {
  token: string;
  rows: Row[];
  outstanding: number;
  grandTotal: string;
  clientName: string;
}) {
  const [state, action, pending] = useActionState(contractorConfirmAllAction, null);

  return (
    <div className="mt-8 space-y-6">
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
                  {row.confirmed ? " · confirmed" : ""}
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

      {outstanding === 0 ? (
        <div className="paper rounded-3xl p-6">
          <p className="text-lg" style={{ color: "var(--olive)" }}>
            ✓ All confirmed
          </p>
          <p className="mt-2 text-muted">
            {clientName} has these on file. You can download any of them above at any time
            while this link is live.
          </p>
        </div>
      ) : (
        <form action={action} className="paper space-y-4 rounded-3xl p-6">
          <input type="hidden" name="token" value={token} />
          <FormBanner state={state} />
          <h2 className="text-xl">Confirm these are right</h2>
          <p className="text-sm text-muted">
            Confirming marks {outstanding === rows.length ? "all" : "the remaining"}{" "}
            {outstanding} {outstanding === 1 ? "invoice" : "invoices"} as issued by you to{" "}
            {clientName}. If something is wrong, say so before you confirm — contact{" "}
            {clientName} and get it corrected first.
          </p>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="attest" className="mt-1" />
            <span>
              I confirm these {outstanding} {outstanding === 1 ? "invoice" : "invoices"},
              totalling {grandTotal}, are an accurate record of work I did for {clientName}.
            </span>
          </label>
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Confirming…" : "Confirm"}
          </button>
        </form>
      )}
    </div>
  );
}
