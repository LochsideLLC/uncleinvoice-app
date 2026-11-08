"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import type { ActionState } from "@/actions/auth";
import { FormBanner } from "@/components/form-banner";
import { SaveButton, useSaveButton } from "@/components/save-button";
import Link from "next/link";
import { DEFAULT_INVOICE_MESSAGE } from "@/lib/invoice-email";

function IconEmail() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="1" y="3" width="14" height="10" rx="1.5" />
      <path d="M1 5.5l7 4.5 7-4.5" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" />
    </svg>
  );
}
import { createShareLinkAction, markAsPaidWithFeedbackAction, sendToClientComposedAction } from "@/actions/invoices";

function createPaymentNonce() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  // This is an idempotency key, not a secret. Older phone browsers may not
  // expose randomUUID(), so retain the UUID format the server accepts.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function InvoiceStatusBar({
  workspaceId,
  invoiceId,
  status,
  sentAt,
  dueDate,
  totalCents,
  amountPaid,
  onlinePaymentEnabled,
  clientEmail,
  mailFrom,
  defaultInvoiceMessage = DEFAULT_INVOICE_MESSAGE,
  defaultMessageReturnTo,
  openSendForm = false,
  actionTools,
}: {
  workspaceId: string;
  invoiceId: string;
  status: string;
  sentAt: Date | null;
  dueDate: Date | null;
  totalCents: number;
  amountPaid: number;
  onlinePaymentEnabled: boolean;
  clientEmail: string | null;
  mailFrom: string;
  defaultInvoiceMessage?: string;
  defaultMessageReturnTo: string;
  openSendForm?: boolean;
  actionTools?: ReactNode;
}) {
  const [showPayForm, setShowPayForm] = useState(false);
  const [showSendForm, setShowSendForm] = useState(openSendForm);
  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [paymentNonce, setPaymentNonce] = useState(createPaymentNonce);
  const [paymentState, paymentAction, paymentPending] = useActionState(
    async (prev: ActionState | null, formData: FormData) => {
      const result = await markAsPaidWithFeedbackAction(prev, formData);
      if (result?.ok) setPaymentNonce(createPaymentNonce());
      return result;
    },
    null,
  );
  const paymentSave = useSaveButton(paymentState);
  const [sendState, sendAction, sendPending] = useActionState(
    async (prev: ActionState | null, formData: FormData) => {
      const result = await sendToClientComposedAction(prev, formData);
      if (result?.ok) {
        setShowSendForm(false);
        setNotice(result.message ?? null);
      }
      return result;
    },
    null,
  );

  async function copyLink() {
    setLinkError(null);
    const result = await createShareLinkAction(workspaceId, invoiceId);
    if ("error" in result) {
      setLinkError(result.error);
      return;
    }
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLinkError("Could not copy automatically. The link is: " + result.url);
    }
  }

  const isSent = status === "sent";
  const isPaid = totalCents > 0 && amountPaid >= totalCents;
  const remainingCents = Math.max(0, totalCents - amountPaid);
  const remainingDollars = (remainingCents / 100).toFixed(2);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = dueDate ? new Date(dueDate) : null;
  if (due) due.setHours(0, 0, 0, 0);
  const daysUntilDue = due ? Math.round((due.getTime() - today.getTime()) / 86_400_000) : null;

  const todayIso = new Date().toISOString().slice(0, 10);

  function sentLabel() {
    if (!isSent) return "Not sent";
    if (!sentAt) return "Sent";
    return `Sent ${new Date(sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

  function dueLabel() {
    if (daysUntilDue === null) return null;
    if (daysUntilDue < 0) return `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"}`;
    if (daysUntilDue === 0) return "Due today";
    return `${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"} until due`;
  }

  function dueStyle(): React.CSSProperties {
    if (daysUntilDue === null) return {};
    if (daysUntilDue < 0) return { background: "#fde8e8", color: "#9a1f1f" };
    if (daysUntilDue <= 7) return { background: "#f3dcc0", color: "#7a3a22" };
    return { background: "var(--paper)", color: "var(--muted)" };
  }

  const dueLabelText = dueLabel();
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && !isPaid;
  const showActions = !isPaid;
  const bannerStyle = isOverdue
    ? dueStyle()
    : isPaid
      ? { background: "color-mix(in srgb, var(--olive) 18%, var(--paper))", color: "var(--olive)" }
      : isSent
        ? { background: "color-mix(in srgb, #5a8a6a 14%, var(--paper))", color: "#3d6b52" }
        : { background: "color-mix(in srgb, #c4612a 10%, var(--paper))", color: "#c4612a" };

  return (
    <>
      <div className="flex flex-col gap-2 print:hidden">
        <div className="flex w-full items-center gap-0.5">
          {actionTools ? <div className="shrink-0">{actionTools}</div> : null}

          {showActions && (
            <>
              {!isSent ? (
                <button type="button" aria-label="Send invoice" title="Send invoice" className="btn btn-ghost h-9 w-9 shrink-0 !p-0" onClick={() => setShowSendForm(true)}>
                  <IconEmail />
                </button>
              ) : (
                <button type="button" aria-label="Send reminder" title="Send reminder" className="btn btn-ghost h-9 w-9 shrink-0 !p-0" onClick={() => { /* TODO: send reminder */ }}>
                  <IconEmail />
                </button>
              )}
              <button type="button" aria-label={copied ? "Link copied" : "Share invoice link"} title={copied ? "Link copied" : "Share invoice link"} className="btn btn-ghost h-9 w-9 shrink-0 !p-0" onClick={copyLink}>
                <IconLink />
              </button>
              {!onlinePaymentEnabled ? (
                <button type="button" className="btn btn-ghost ml-auto h-9 shrink-0 whitespace-nowrap !px-1.5 !py-0" onClick={() => { paymentSave.reset(); setShowPayForm(true); }}>
                  Mark as paid
                </button>
              ) : null}
            </>
          )}
        </div>

        <div className="relative left-1/2 flex w-screen -translate-x-1/2 items-center justify-between gap-3 whitespace-nowrap border-y border-line py-2 text-sm sm:text-base" style={bannerStyle}>
          <span className="shrink-0 pl-4 font-semibold">{sentLabel()}</span>
          {dueLabelText && !isPaid ? <span className="pr-4 font-semibold">{dueLabelText}</span> : null}
          {isPaid ? <span className="pr-4 font-semibold">Paid</span> : null}
        </div>
      </div>

      {notice ? (
        <p role="status" className="mt-2 text-sm text-muted print:hidden">{notice}</p>
      ) : null}
      {linkError ? (
        <p role="alert" className="mt-2 text-sm text-red-900 print:hidden">{linkError}</p>
      ) : null}

      {showSendForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(42,31,22,0.35)" }}
          onPointerDown={(e) => { if (e.target === e.currentTarget) setShowSendForm(false); }}
        >
          <div className="paper max-h-[calc(100dvh_-_2rem)] w-full max-w-md overflow-auto overscroll-contain rounded-3xl p-4 shadow-xl sm:p-5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h3 className="text-xl">Send invoice</h3>
              <p className="text-sm text-muted">Email it to your customer.</p>
            </div>
            <form action={sendAction} className="send-invoice-form mt-3 space-y-2.5">
              <FormBanner state={sendState} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="invoiceId" value={invoiceId} />
              <div className="field">
                <label htmlFor="send-to">To</label>
                <input
                  id="send-to"
                  name="to"
                  type="email"
                  required
                  defaultValue={clientEmail ?? ""}
                  placeholder="client@company.com"
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">From</p>
                <p aria-label={`From ${mailFrom}`} title={mailFrom} className="send-form-from truncate rounded-lg border border-line bg-white px-3 py-2 text-sm text-muted">
                  {mailFrom}
                </p>
              </div>
              <details className="rounded-xl border border-line px-3 py-2">
                <summary className="cursor-pointer text-sm font-semibold text-muted">Add Cc or Bcc</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="field">
                    <label htmlFor="send-cc">Cc</label>
                    <input id="send-cc" name="cc" placeholder="comma, separated" />
                  </div>
                  <div className="field">
                    <label htmlFor="send-bcc">Bcc</label>
                    <input id="send-bcc" name="bcc" placeholder="comma, separated" />
                  </div>
                </div>
              </details>
              <div className="field">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="send-message">Message (optional)</label>
                  <div className="send-message-actions flex shrink-0 items-center gap-3 text-xs">
                    <button type="button" className="font-semibold underline" onClick={() => setMessage(defaultInvoiceMessage)}>
                      Use default
                    </button>
                    <Link
                      href={`/app/profile?${new URLSearchParams({ returnTo: defaultMessageReturnTo }).toString()}#default-invoice-message`}
                      className="text-muted underline"
                    >
                      Change default
                    </Link>
                  </div>
                </div>
                <textarea
                  id="send-message"
                  name="message"
                  rows={message ? Math.min(8, Math.max(2, Math.ceil(message.length / 38))) : 2}
                  maxLength={2000}
                  placeholder="A quick note to go with the invoice"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
              <div className="grid w-full grid-cols-2 gap-3">
                <button type="submit" className="btn btn-primary w-full" disabled={sendPending}>
                  {sendPending ? "Sending…" : "Send now"}
                </button>
                <button type="button" className="btn btn-ghost w-full" onClick={() => setShowSendForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(42,31,22,0.35)" }}
          onPointerDown={(e) => { if (e.target === e.currentTarget) setShowPayForm(false); }}
        >
          <div className="paper w-full max-w-sm rounded-3xl p-6 shadow-xl">
            <h3 className="text-xl">Record payment</h3>
            <p className="mt-1 text-sm text-muted">Fill in what you know. Even partial info helps.</p>
            <form action={paymentAction} onChange={paymentSave.markDirty} className="mt-5 space-y-4">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="invoiceId" value={invoiceId} />
              <input type="hidden" name="paymentNonce" value={paymentNonce} />
              <FormBanner state={paymentState} />
              <div className="field">
                <label htmlFor="pay-amount">Amount paid</label>
                <input type="number" id="pay-amount" name="amount" step="0.01" min="0.01" defaultValue={remainingDollars} required />
              </div>
              <div className="field">
                <label htmlFor="pay-date">Date paid</label>
                <input type="date" id="pay-date" name="paidDate" defaultValue={todayIso} />
              </div>
              <div className="field">
                <label htmlFor="pay-method">How they paid</label>
                <select id="pay-method" name="method">
                  <option value="">— select —</option>
                  <option>Check</option>
                  <option>ACH / Bank transfer</option>
                  <option>Wire transfer</option>
                  <option>Credit card</option>
                  <option>Cash</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="pay-note">Note (optional)</label>
                <input type="text" id="pay-note" name="note" placeholder="e.g. Check #1234" />
              </div>
              <div className="flex gap-3 pt-1">
                <SaveButton type="submit" pending={paymentPending} save={paymentSave} label="Save payment" />
                <button type="button" className="btn btn-ghost" onClick={() => setShowPayForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
