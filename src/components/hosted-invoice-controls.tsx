"use client";

import { useState } from "react";
import Link from "next/link";

export function HostedInvoiceControls({
  invoiceId,
  canCollect,
  paymentEnabled,
}: {
  invoiceId: string;
  canCollect: boolean;
  paymentEnabled: boolean;
}) {
  const [collect, setCollect] = useState(paymentEnabled);
  const [confirmed, setConfirmed] = useState(false);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function createLink() {
    setPending(true);
    setMessage("");
    const data = new FormData();
    if (collect) data.set("collectPayment", "on");
    if (confirmed) data.set("confirmedBalanceDue", "on");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/host`, { method: "POST", body: data });
      const body = await response.json() as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "Unable to create link");
      setUrl(body.url);
      setMessage("New link created. Any older hosted link is now closed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create link");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="paper mt-6 space-y-4 rounded-3xl p-6 print:hidden">
      <div>
        <h2 className="text-2xl">Hosted invoice</h2>
        <p className="mt-1 text-sm text-muted">Create a secure customer link. Making a new link closes the old one.</p>
      </div>
      {canCollect ? (
        <>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={collect} onChange={(event) => { setCollect(event.target.checked); setConfirmed(false); }} className="mt-1" />
            <span>Let the customer pay this invoice through my Stripe account.</span>
          </label>
          {collect ? (
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
              <span>I confirm this balance is still due. This invoice does not only record an earlier payment.</span>
            </label>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">
          <Link href="/app/payments" className="underline">Finish Stripe setup</Link> to accept online payment. You can still create a view-only link.
        </p>
      )}
      <button className="btn btn-primary" type="button" onClick={createLink} disabled={pending || (collect && !confirmed)}>
        {pending ? "Creating…" : "Create secure link"}
      </button>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {url ? (
        <div className="space-y-2">
          <input className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm" readOnly value={url} aria-label="Hosted invoice link" />
          <button className="btn btn-ghost" type="button" onClick={() => navigator.clipboard.writeText(url)}>Copy link</button>
        </div>
      ) : null}
    </section>
  );
}
