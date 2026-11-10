"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

function Switch({
  checked,
  disabled = false,
  onChange,
  name,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  name?: string;
  children: ReactNode;
}) {
  return (
    <label className={`payment-method-switch flex items-center justify-between gap-4 ${disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>
      <span className="min-w-0">{children}</span>
      <span
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-line transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
        style={{ background: checked ? "var(--accent)" : "var(--paper-2)" }}
      >
        <input
          type="checkbox"
          role="switch"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          aria-label={typeof children === "string" ? children : undefined}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-0"}`}
        />
      </span>
    </label>
  );
}

const COMING_SOON_DETAILS: Record<string, string> = {
  "Bank transfer": "Your customer sends money from their bank to your payment account. It gives customers a way to pay straight from their bank instead of using a card.",
  PayPal: "Your customer pays with their PayPal account. This gives customers who already use PayPal another familiar way to pay.",
  "ACH Direct Debit": "Your customer authorizes you to collect money from their U.S. bank account. This can make repeat invoices easier: after the customer gives permission, future payments can be collected without them starting a new transfer each time.",
};

function ComingSoon({ label }: { label: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${label}, coming soon. Learn what it does.`}
        onClick={() => {
          setOpen(true);
          dialogRef.current?.showModal();
        }}
        className="payment-method-option flex w-full items-center justify-between gap-4 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <span className="font-medium">{label}</span>
        <span className="payment-method-badge shrink-0 rounded-full border border-line bg-paper-2 px-2.5 py-1 text-muted">
          Coming soon
        </span>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`payment-method-title-${label.replaceAll(" ", "-")}`}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-line bg-background p-6 text-ink shadow-2xl backdrop:bg-ink/55"
      >
        {open ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h2 id={`payment-method-title-${label.replaceAll(" ", "-")}`} className="font-serif text-2xl font-semibold">
                {label}
              </h2>
              <span className="payment-method-badge shrink-0 rounded-full border border-line bg-paper-2 px-2.5 py-1 text-muted">
                Coming soon
              </span>
            </div>
            <p className="text-base leading-relaxed text-muted">{COMING_SOON_DETAILS[label]}</p>
            <form method="dialog">
              <button className="btn btn-primary w-full">Close</button>
            </form>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

export function PaymentMethodOptions({
  enabled,
  onChange,
  canManage,
  canCollect,
  canSetUpPayments,
  setupNote,
  inputName,
  checkEnabled,
  onCheckChange,
  editInvoiceHref,
  businessProfileHref,
  checkPending,
  checkError,
}: {
  enabled: boolean;
  onChange?: (enabled: boolean) => void;
  canManage: boolean;
  canCollect: boolean;
  canSetUpPayments: boolean;
  setupNote: string | null;
  inputName?: string;
  checkEnabled: boolean;
  onCheckChange: (enabled: boolean) => void;
  editInvoiceHref?: string;
  businessProfileHref?: string;
  checkPending: boolean;
  checkError: string;
}) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-line bg-paper p-4">
      <legend className="payment-options-title px-2 font-serif font-semibold text-ink">Customer payment options</legend>
      <div className="space-y-3">
        <Switch checked={checkEnabled} disabled={!canManage || checkPending} onChange={onCheckChange}>
          <span className="font-medium">Pay by check</span>
        </Switch>
        {checkPending ? <p role="status" aria-live="polite" className="text-sm text-muted">Saving…</p> : null}
        {checkError ? (
          <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-base text-red-900">
            {checkError}
            {checkError.toLowerCase().includes("mailing address") && editInvoiceHref && businessProfileHref ? (
              <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                <Link href={editInvoiceHref} className="underline underline-offset-2">Add mailing address to invoice</Link>
                <Link href={businessProfileHref} className="underline underline-offset-2">Add business address to profile</Link>
              </span>
            ) : null}
          </p>
        ) : null}
        <ComingSoon label="Bank transfer" />
      </div>

      <div className="space-y-3 border-t border-line pt-3">
        {!canCollect && canManage && setupNote ? (
          <div className="rounded-xl border border-line bg-paper-2 p-3 text-sm text-muted">
            <p>{setupNote}</p>
            {canSetUpPayments ? (
              <Link href="/app/payments" className="mt-1 inline-block font-semibold text-ink underline">Set up Stripe</Link>
            ) : null}
          </div>
        ) : null}
        <Switch checked={enabled} disabled={!canCollect} onChange={onChange} name={inputName}>
          <span className="font-medium">Stripe</span>
        </Switch>
        <ComingSoon label="PayPal" />
        <ComingSoon label="ACH Direct Debit" />
      </div>
    </fieldset>
  );
}
