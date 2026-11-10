"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/actions/auth";
import { PaymentMethodOptions } from "@/components/payment-method-options";
import { SaveButton, useSaveButton } from "@/components/save-button";
import { saveInvoiceOnlinePaymentAction, setInvoiceCheckPaymentAction } from "@/actions/invoice-payment-options";

export function HostedInvoiceControls({
  invoiceId,
  canManage,
  canCollect,
  paymentEnabled,
  paymentNote,
  canSetUpPayments,
  checkPaymentEnabled,
  reviewAndSendHref,
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
  reviewAndSendHref?: string;
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
  const [saveState, setSaveState] = useState<ActionState>(null);
  const [savePending, setSavePending] = useState(false);
  const paymentOptionsSave = useSaveButton(saveState);

  async function savePaymentOptions() {
    setSavePending(true);
    try {
      const result = await saveInvoiceOnlinePaymentAction(invoiceId, collect);
      setSaveState(result);
      if (result.ok) router.refresh();
    } catch {
      setSaveState({ error: "Could not save the payment option. Try again." });
    } finally {
      setSavePending(false);
    }
  }

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
        onChange={(enabled) => {
          setCollect(enabled);
          setConfirmed(false);
          setSaveState(null);
          paymentOptionsSave.markDirty();
        }}
        canManage={canManage}
        canCollect={canCollect}
        canSetUpPayments={canSetUpPayments}
        setupNote={paymentNote}
        checkEnabled={checkEnabled}
        onCheckChange={updateCheckPayment}
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
          <div className="flex flex-col gap-3">
            <SaveButton
              type="button"
              pending={savePending}
              save={paymentOptionsSave}
              icon={<SaveIcon />}
              className="w-full"
              onClick={() => void savePaymentOptions()}
            />
            {reviewAndSendHref ? (
              <Link className="btn btn-primary w-full" href={reviewAndSendHref}>
                <span className="inline-flex items-center justify-center gap-2">
                  <ReviewIcon />
                  Review and send
                </span>
              </Link>
            ) : null}
            <button className="btn btn-green w-full" type="button" onClick={createLink} disabled={pending || (collect && !confirmed)}>
              <span className="inline-flex items-center justify-center gap-2">
                <PaymentLinkIcon />
                {pending ? "Creating…" : "Create secure payment link"}
              </span>
            </button>
          </div>
          {saveState?.error ? <p role="alert" className="text-sm text-red-900">{saveState.error}</p> : null}
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

function SaveIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 2.75h10l3 3v11.5h-13z" />
      <path d="M6.5 2.75v5h7v-5M6.5 17.25v-6h7v6" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="4" width="15" height="12" rx="1.5" />
      <path d="m3.5 5 6.5 5.5L16.5 5" />
    </svg>
  );
}

function PaymentLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 12a3.25 3.25 0 0 0 4.6 0l2.1-2.1a3.25 3.25 0 0 0-4.6-4.6L9 6.4" />
      <path d="M12 8a3.25 3.25 0 0 0-4.6 0l-2.1 2.1a3.25 3.25 0 0 0 4.6 4.6L11 13.6" />
    </svg>
  );
}
