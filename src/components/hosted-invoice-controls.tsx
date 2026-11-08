"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethodOptions } from "@/components/payment-method-options";
import { setInvoiceCheckPaymentAction } from "@/actions/invoice-payment-options";

export function HostedInvoiceControls({
  invoiceId,
  canManage,
  canCollect,
  paymentEnabled,
  paymentNote,
  canSetUpPayments,
  checkPaymentEnabled,
  checkPayee,
  checkAddressLines,
  editInvoiceHref,
  businessProfileHref,
}: {
  invoiceId: string;
  canManage: boolean;
  canCollect: boolean;
  paymentEnabled: boolean;
  paymentNote: string | null;
  canSetUpPayments: boolean;
  checkPaymentEnabled: boolean;
  checkPayee: string;
  checkAddressLines: string[];
  editInvoiceHref: string;
  businessProfileHref: string;
}) {
  const router = useRouter();
  const [collect, setCollect] = useState(paymentEnabled);
  const [checkEnabled, setCheckEnabled] = useState(checkPaymentEnabled);
  const [checkPending, setCheckPending] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function updateCheckPayment(enabled: boolean) {
    setCheckPending(true);
    setCheckError("");
    try {
      const result = await setInvoiceCheckPaymentAction(invoiceId, enabled);
      if ("error" in result && result.error) {
        setCheckError(result.error);
        return;
      }
      setCheckEnabled(enabled);
      router.refresh();
    } catch {
      setCheckError("Could not save the Pay by check setting. Try again.");
    } finally {
      setCheckPending(false);
    }
  }

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
    <section className="space-y-4 print:hidden" aria-label="Invoice payment methods">
      <PaymentMethodOptions
        enabled={collect}
        onChange={(enabled) => { setCollect(enabled); setConfirmed(false); }}
        canManage={canManage}
        canCollect={canCollect}
        canSetUpPayments={canSetUpPayments}
        setupNote={paymentNote}
        checkEnabled={checkEnabled}
        onCheckChange={updateCheckPayment}
        checkPayee={checkPayee}
        checkAddressLines={checkAddressLines}
        editInvoiceHref={editInvoiceHref}
        businessProfileHref={businessProfileHref}
        checkPending={checkPending}
        checkError={checkError}
      />
      {canManage && canCollect && collect ? (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
          <span>I confirm this balance is still due. This invoice does not only record an earlier payment.</span>
        </label>
      ) : null}
      {canManage ? (
        <>
          <button className="btn btn-primary w-full" type="button" onClick={createLink} disabled={pending || (collect && !confirmed)}>
            {pending ? "Creating…" : "Create secure payment link"}
          </button>
          {message ? <p className="text-sm text-muted">{message}</p> : null}
          {url ? (
            <div className="space-y-2">
              <input className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm" readOnly value={url} aria-label="Hosted invoice link" />
              <button className="btn btn-ghost" type="button" onClick={() => navigator.clipboard.writeText(url)}>Copy link</button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
