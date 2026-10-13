"use client";

import { useActionState } from "react";
import { confirmMyInvoicesAction } from "@/actions/contractor";
import { FormBanner } from "@/components/form-banner";

export function ConfirmMyInvoices({
  count,
  total,
  clientNames,
  contact,
}: {
  count: number;
  total: string;
  clientNames: string[];
  contact: {
    email: string;
    phone: string;
    addressLine: string;
    city: string;
    region: string;
    postalCode: string;
  };
}) {
  const [state, action, pending] = useActionState(confirmMyInvoicesAction, null);
  const who = clientNames.join(" and ");

  return (
    <form action={action} className="paper space-y-5 rounded-3xl p-6">
      <div>
        <h2 className="text-2xl">
          {count} {count === 1 ? "invoice is" : "invoices are"} waiting for you
        </h2>
        <p className="mt-2 text-muted">
          {who} has written these up from their records of what they paid you — {total} in
          total. Look them over below. If anything is wrong, tell {who} before you confirm.
        </p>
      </div>

      <FormBanner state={state} />

      <div className="space-y-4">
        <p className="text-sm font-semibold">Your details, as they appear on the invoices</p>
        <div className="field">
          <label htmlFor="email">Your email</label>
          <input id="email" name="email" type="email" defaultValue={contact.email} required />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" defaultValue={contact.phone} />
        </div>
        <div className="field">
          <label htmlFor="addressLine">Address (optional)</label>
          <input id="addressLine" name="addressLine" defaultValue={contact.addressLine} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" name="city" defaultValue={contact.city} />
          </div>
          <div className="field">
            <label htmlFor="region">State</label>
            <input id="region" name="region" defaultValue={contact.region} />
          </div>
          <div className="field">
            <label htmlFor="postalCode">ZIP</label>
            <input id="postalCode" name="postalCode" defaultValue={contact.postalCode} />
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="attest" className="mt-1" />
        <span>
          I confirm these {count} {count === 1 ? "invoice" : "invoices"}, totalling {total},
          are an accurate record of work I did for {who}.
        </span>
      </label>

      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Confirming…" : `Confirm ${count}`}
      </button>
    </form>
  );
}
