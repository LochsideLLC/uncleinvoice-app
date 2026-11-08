"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/actions/account";
import { CLIENT_TERMS } from "@/lib/client-terms";
import { DEFAULT_INVOICE_MESSAGE } from "@/lib/invoice-email";
import { FormBanner } from "@/components/form-banner";
import { SaveButton, useSaveButton } from "@/components/save-button";

export function ProfileForm({
  name,
  email,
  backupEmail,
  clientTerm,
  emailSignature,
  defaultInvoiceMessage,
}: {
  name: string;
  email: string;
  backupEmail?: string | null;
  clientTerm?: string | null;
  emailSignature?: string | null;
  defaultInvoiceMessage?: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const save = useSaveButton(state);

  return (
    <form action={action} onChange={save.markDirty} className="paper compact-fields space-y-1 rounded-3xl p-6">
      <div>
        <h2 className="text-xl">Account Info</h2>
        <p className="mt-1 text-sm text-muted">How you show up on Uncle Invoice.</p>
      </div>
      <FormBanner state={state} />
      <div className="field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={name}
          autoComplete="name"
          placeholder="Your name"
        />
      </div>
      <div className="field">
        <label htmlFor="email">Account email</label>
        <input
          id="email"
          value={email}
          readOnly
          className="opacity-80"
          placeholder="The email you sign in with"
        />
      </div>
      <div className="field">
        <label htmlFor="backupEmail">Backup email</label>
        <input
          id="backupEmail"
          name="backupEmail"
          type="email"
          defaultValue={backupEmail ?? ""}
          autoComplete="email"
          placeholder="Another email, just in case"
        />
      </div>
      <div className="field">
        <label htmlFor="clientTerm">You call them your…</label>
        <select id="clientTerm" name="clientTerm" defaultValue={clientTerm ?? "clients"}>
          {CLIENT_TERMS.map((term) => (
            <option key={term} value={term}>
              {term.charAt(0).toUpperCase() + term.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div id="default-invoice-message" className="field scroll-mt-8">
        <label htmlFor="defaultInvoiceMessage">Default invoice message</label>
        <textarea
          id="defaultInvoiceMessage"
          name="defaultInvoiceMessage"
          rows={3}
          maxLength={2000}
          defaultValue={defaultInvoiceMessage ?? DEFAULT_INVOICE_MESSAGE}
        />
        <p className="mt-1 text-xs text-muted">
          You can insert this message when sending an invoice. Change it here anytime.
        </p>
      </div>
      <div className="field">
        <label htmlFor="emailSignature">Email signature</label>
        <textarea
          id="emailSignature"
          name="emailSignature"
          rows={4}
          maxLength={1000}
          defaultValue={emailSignature ?? ""}
          placeholder={"Thanks,\nAda Mensah\nBookkeeping Conroe\n(936) 283-4346"}
        />
        <p className="mt-1 text-xs text-muted">
          Added to the end of invoices you send from Uncle Invoice.
        </p>
      </div>
      <div className="pt-3">
        <SaveButton pending={pending} save={save} className="w-full" />
      </div>
    </form>
  );
}
