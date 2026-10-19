import { formatDate } from "@/lib/dates";
import {
  amountDue,
  formatMoney,
  invoiceTotal,
  lineTotal,
  paymentState,
  taxableSubtotal,
  taxCents,
} from "@/lib/money";

export type InvoiceDocumentData = {
  number?: string;
  issueDate: Date | string | null;
  dueDate?: Date | string | null;
  poNumber?: string | null;
  paymentTerms?: string | null;
  paymentInstructions?: string | null;
  taxRateBps?: number;
  amountPaid?: number;
  fromTaxId?: string | null;
  billToTaxId?: string | null;
  serviceStart?: Date | string | null;
  serviceEnd?: Date | string | null;
  notes?: string | null;
  fromName: string;
  fromContactName?: string | null;
  fromEmail?: string | null;
  fromPhone?: string | null;
  fromAddress?: string | null;
  fromCityLine?: string | null;
  billToName: string;
  billToContactName?: string | null;
  billToEmail?: string | null;
  billToPhone?: string | null;
  billToAddress?: string | null;
  billToCity?: string | null;
  lineItems: { description: string; quantity: number; unitPrice: number; taxable?: boolean }[];
};

function cityLine(city?: string | null, region?: string | null, postal?: string | null) {
  return [city, [region, postal].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

export { cityLine };

function PartyNames({
  company,
  person,
  fallback,
  attn = false,
}: {
  company?: string | null;
  person?: string | null;
  fallback: string;
  attn?: boolean;
}) {
  const companyName = company?.trim() || "";
  const personName = person?.trim() || "";
  const showPerson = Boolean(personName) && personName !== companyName;
  const showCompany = Boolean(companyName);
  if (!showPerson && !showCompany) {
    return <p className="mt-1 text-lg text-ink">{fallback}</p>;
  }
  if (showCompany && showPerson) {
    return (
      <>
        <p className="mt-1 text-lg text-ink">{companyName}</p>
        <p className="text-sm text-muted">{attn ? `Attn: ${personName}` : personName}</p>
      </>
    );
  }
  return <p className="mt-1 text-lg text-ink">{companyName || personName}</p>;
}

export function invoiceToDocument(invoice: {
  number?: string;
  issueDate: Date | string | null;
  dueDate?: Date | string | null;
  poNumber?: string | null;
  paymentTerms?: string | null;
  paymentInstructions?: string | null;
  taxRateBps?: number | null;
  amountPaid?: number | null;
  fromTaxId?: string | null;
  billToTaxId?: string | null;
  fromContactName?: string | null;
  billToContactName?: string | null;
  fromAddressLine?: string | null;
  fromCity?: string | null;
  fromRegion?: string | null;
  fromPostalCode?: string | null;
  serviceStart?: Date | string | null;
  serviceEnd?: Date | string | null;
  notes?: string | null;
  contractor: {
    name: string;
    email?: string | null;
    phone?: string | null;
    addressLine?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    taxId?: string | null;
  };
  workspace: {
    name: string;
    email: string | null;
    phone?: string | null;
    addressLine?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    taxId?: string | null;
  };
  lineItems: { description: string; quantity: number; unitPrice: number; taxable?: boolean }[];
}): InvoiceDocumentData {
  return {
    number: invoice.number,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    poNumber: invoice.poNumber,
    paymentTerms: invoice.paymentTerms,
    paymentInstructions: invoice.paymentInstructions,
    taxRateBps: invoice.taxRateBps ?? 0,
    amountPaid: invoice.amountPaid ?? 0,
    fromTaxId: invoice.fromTaxId ?? invoice.contractor.taxId,
    billToTaxId: invoice.billToTaxId ?? invoice.workspace.taxId,
    serviceStart: invoice.serviceStart,
    serviceEnd: invoice.serviceEnd,
    notes: invoice.notes,
    fromName: invoice.contractor.name,
    fromContactName: invoice.fromContactName,
    fromEmail: invoice.contractor.email,
    fromPhone: invoice.contractor.phone,
    fromAddress: invoice.fromAddressLine ?? invoice.contractor.addressLine,
    fromCityLine:
      cityLine(
        invoice.fromCity ?? invoice.contractor.city,
        invoice.fromRegion ?? invoice.contractor.region,
        invoice.fromPostalCode ?? invoice.contractor.postalCode,
      ) || null,
    billToName: invoice.workspace.name,
    billToContactName: invoice.billToContactName,
    billToEmail: invoice.workspace.email,
    billToPhone: invoice.workspace.phone,
    billToAddress: invoice.workspace.addressLine,
    billToCity:
      cityLine(invoice.workspace.city, invoice.workspace.region, invoice.workspace.postalCode) ||
      null,
    lineItems: invoice.lineItems,
  };
}

export function UncleInvoiceCredit({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return (
    <a
      href="https://uncleinvoice.com"
      className="mt-10 flex flex-col items-center gap-1 border-t border-line pt-5 text-center"
    >
      <span className="text-sm font-semibold text-ink">uncleinvoice.com</span>
      <span className="text-xs text-muted">Generate free invoices</span>
    </a>
  );
}

export function InvoiceDocument({
  invoice,
  showBrand = true,
}: {
  invoice: InvoiceDocumentData;
  showBrand?: boolean;
}) {
  const subtotal = invoiceTotal(invoice.lineItems);
  const tax = taxCents(taxableSubtotal(invoice.lineItems), invoice.taxRateBps ?? 0);
  const total = subtotal + tax;
  const paid = invoice.amountPaid ?? 0;
  const due = amountDue(total, paid);
  const paidStatus = paymentState(paid, total);
  const taxLabel =
    invoice.taxRateBps && invoice.taxRateBps > 0
      ? `Tax (${(invoice.taxRateBps / 100).toFixed(2)}%)`
      : null;

  return (
    <article className="invoice-sheet paper rounded-[1.4rem] p-6 sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Invoice</p>
          <h2 className="display mt-1 text-3xl text-ink">{invoice.number ?? "Preview"}</h2>
          {paidStatus === "paid" ? (
            <p className="mt-3 inline-block border-[3px] border-olive px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-olive">
              Paid
            </p>
          ) : paidStatus === "partial" ? (
            <p className="mt-3 inline-block border-[3px] border-brass px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-ink">
              Partially paid
            </p>
          ) : null}
        </div>
        <div className="text-right text-sm text-muted">
          <p>Date {formatDate(invoice.issueDate)}</p>
          {invoice.dueDate ? <p>Pay by {formatDate(invoice.dueDate)}</p> : null}
          {invoice.paymentTerms ? <p>{invoice.paymentTerms}</p> : null}
          {invoice.poNumber ? <p>PO {invoice.poNumber}</p> : null}
        </div>
      </header>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bill to</p>
          <PartyNames
            company={invoice.billToName}
            person={invoice.billToContactName}
            fallback="Client"
            attn
          />
          {invoice.billToAddress ? <p className="text-sm text-muted">{invoice.billToAddress}</p> : null}
          {invoice.billToCity ? <p className="text-sm text-muted">{invoice.billToCity}</p> : null}
          {invoice.billToEmail ? <p className="text-sm text-muted">{invoice.billToEmail}</p> : null}
          {invoice.billToPhone ? <p className="text-sm text-muted">{invoice.billToPhone}</p> : null}
          {invoice.billToTaxId ? <p className="text-sm text-muted">Tax ID {invoice.billToTaxId}</p> : null}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">From</p>
          <PartyNames
            company={invoice.fromName}
            person={invoice.fromContactName}
            fallback="Your business"
          />
          {invoice.fromAddress ? <p className="text-sm text-muted">{invoice.fromAddress}</p> : null}
          {invoice.fromCityLine ? <p className="text-sm text-muted">{invoice.fromCityLine}</p> : null}
          {invoice.fromEmail ? <p className="text-sm text-muted">{invoice.fromEmail}</p> : null}
          {invoice.fromPhone ? <p className="text-sm text-muted">{invoice.fromPhone}</p> : null}
          {invoice.fromTaxId ? <p className="text-sm text-muted">EIN {invoice.fromTaxId}</p> : null}
        </div>
      </div>

      {(invoice.serviceStart || invoice.serviceEnd) && (
        <p className="mt-6 text-sm text-muted">
          Service {formatDate(invoice.serviceStart)} – {formatDate(invoice.serviceEnd)}
        </p>
      )}

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-4 font-medium">Description</th>
            <th className="py-2 px-3 text-right font-medium">Qty</th>
            <th className="py-2 px-3 text-right font-medium">Rate</th>
            <th className="py-2 px-4 text-center font-medium">Tax</th>
            <th className="py-2 pl-4 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-muted">
                Line items will show up here.
              </td>
            </tr>
          ) : (
            invoice.lineItems.map((item, index) => (
              <tr key={index} className="border-b border-line/70">
                <td className="max-w-0 py-3 pr-4 whitespace-pre-wrap break-words">
                  {item.description || "—"}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{item.quantity}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatMoney(item.unitPrice)}</td>
                <td className="px-4 py-3 text-center text-muted">{item.taxable ? "Yes" : "—"}</td>
                <td className="py-3 pl-4 text-right tabular-nums">
                  {formatMoney(lineTotal(item.quantity, item.unitPrice))}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-6 ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between text-muted">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatMoney(subtotal)}</span>
        </div>
        {taxLabel ? (
          <div className="flex justify-between text-muted">
            <span>{taxLabel}</span>
            <span className="tabular-nums">{formatMoney(tax)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-line pt-2 text-xl">
          <span className="display">Total</span>
          <span className="display tabular-nums">{formatMoney(total)}</span>
        </div>
        {paidStatus !== "unpaid" ? (
          <div className="flex justify-between text-muted">
            <span>Paid</span>
            <span className="tabular-nums">{formatMoney(Math.min(paid, total))}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-muted">
          <span>Still due</span>
          <span className="tabular-nums">{formatMoney(due)}</span>
        </div>
      </div>

      {invoice.paymentInstructions ? (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">How to pay</p>
          <p className="mt-1 whitespace-pre-line text-muted">{invoice.paymentInstructions}</p>
        </div>
      ) : null}

      {invoice.notes ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Notes</p>
          <p className="mt-1 whitespace-pre-line text-muted">{invoice.notes}</p>
        </div>
      ) : null}

      <UncleInvoiceCredit show={showBrand} />
    </article>
  );
}
