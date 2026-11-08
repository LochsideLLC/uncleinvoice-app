"use client";

import { useActionState } from "react";
import { updateInvoiceAction } from "@/actions/invoices";
import { FormBanner } from "@/components/form-banner";
import { LineItemsEditor, toLineDrafts } from "@/components/line-items-editor";
import { PAYMENT_TERMS } from "@/lib/invoice-fields";
import { bpsToPercent } from "@/lib/money";
import { SaveButton, useSaveButton } from "@/components/save-button";

export function EditInvoiceForm({
  workspaceId,
  invoice,
}: {
  workspaceId: string;
  invoice: {
    id: string;
    issueDate: string;
    dueDate: string;
    poNumber: string;
    paymentTerms: string;
    paymentInstructions: string;
    taxRateBps: number;
    serviceStart: string;
    serviceEnd: string;
    notes: string;
    internalNote: string;
    lineItems: { description: string; quantity: number; unitPrice: number }[];
  };
}) {
  const [state, action, pending] = useActionState(updateInvoiceAction, null);
  const save = useSaveButton(state);

  return (
    <form action={action} onChange={save.markDirty} className="paper space-y-4 rounded-3xl p-6">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="invoiceId" value={invoice.id} />
      <FormBanner state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="issueDate">Invoice date</label>
          <input
            id="issueDate"
            name="issueDate"
            type="date"
            required
            defaultValue={invoice.issueDate}
          />
        </div>
        <div className="field">
          <label htmlFor="dueDate">Due date</label>
          <input id="dueDate" name="dueDate" type="date" defaultValue={invoice.dueDate} />
        </div>
        <div className="field">
          <label htmlFor="paymentTerms">Terms</label>
          <select id="paymentTerms" name="paymentTerms" defaultValue={invoice.paymentTerms}>
            <option value="">—</option>
            {PAYMENT_TERMS.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="poNumber">PO number</label>
          <input id="poNumber" name="poNumber" defaultValue={invoice.poNumber} />
        </div>
        <div className="field">
          <label htmlFor="taxRate">Tax %</label>
          <input
            id="taxRate"
            name="taxRate"
            inputMode="decimal"
            defaultValue={invoice.taxRateBps ? bpsToPercent(invoice.taxRateBps) : ""}
          />
        </div>
        <div className="field">
          <label htmlFor="serviceStart">Work from</label>
          <input
            id="serviceStart"
            name="serviceStart"
            type="date"
            defaultValue={invoice.serviceStart}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="serviceEnd">Work through</label>
        <input
          id="serviceEnd"
          name="serviceEnd"
          type="date"
          defaultValue={invoice.serviceEnd}
        />
      </div>
      <LineItemsEditor initial={toLineDrafts(invoice.lineItems)} />
      <div className="field">
        <label htmlFor="paymentInstructions">How to pay</label>
        <textarea
          id="paymentInstructions"
          name="paymentInstructions"
          rows={2}
          defaultValue={invoice.paymentInstructions}
        />
      </div>
      <div className="field">
        <label htmlFor="notes">Note on the invoice</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={invoice.notes} />
      </div>
      <div className="field">
        <label htmlFor="internalNote">Internal note</label>
        <textarea
          id="internalNote"
          name="internalNote"
          rows={2}
          defaultValue={invoice.internalNote}
        />
      </div>
      <SaveButton pending={pending} save={save} label="Save changes" />
    </form>
  );
}
