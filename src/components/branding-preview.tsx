"use client";

import { useState } from "react";
import { InvoiceDocument, UncleInvoiceCredit, type InvoiceDocumentData } from "@/components/invoice-document";

export function BrandingPreview({ invoice }: { invoice?: InvoiceDocumentData }) {
  const [branded, setBranded] = useState(true);
  return <div className="min-w-0">
    <fieldset className="mb-4 flex flex-wrap gap-4">
      <legend className="mb-2 text-sm text-muted">{invoice ? "Compare your invoice" : "Compare the same sample invoice"}</legend>
      <label className="flex items-center gap-2"><input type="radio" name="branding-preview" checked={branded} onChange={() => setBranded(true)} /> Free</label>
      <label className="flex items-center gap-2"><input type="radio" name="branding-preview" checked={!branded} onChange={() => setBranded(false)} /> Invoice</label>
    </fieldset>
    {!invoice && <p className="mb-3 text-sm text-muted">Illustration · not a real invoice</p>}
    {invoice ? <div className="max-h-[32rem] overflow-auto rounded-xl border border-line"><InvoiceDocument invoice={invoice} showBrand={branded} /></div> : (
      <div className="invoice-sheet rounded-xl border border-line bg-paper p-5 shadow-sm sm:p-6">
        <p className="text-sm uppercase tracking-wider text-accent">Invoice</p>
        <h3 className="mt-3 text-2xl">Your business</h3>
        <p className="text-sm text-muted">Your name. Your details.</p>
        <div className="my-6 flex flex-wrap justify-between gap-3 border-y border-line py-4"><span>Services provided</span><span>$250.00</span></div>
        <p className="text-right font-semibold">Total $250.00</p>
        <div className="min-h-28"><UncleInvoiceCredit show={branded} /></div>
      </div>
    )}
    <p className="mt-3 text-sm text-muted" aria-live="polite">{branded ? "Free keeps the Uncle Invoice credit." : "Invoice removes the credit from the page and PDF. Everything else stays the same."}</p>
  </div>;
}
