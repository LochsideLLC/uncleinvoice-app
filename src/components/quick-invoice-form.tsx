"use client";

import { useActionState, useMemo, useState, type FormEvent } from "react";
import { createPublicInvoiceAction } from "@/actions/public-invoice";
import { FormBanner } from "@/components/form-banner";
import { UncleInvoiceCredit } from "@/components/invoice-document";
import { PAYMENT_TERMS } from "@/lib/invoice-fields";
import { formatUsPhone } from "@/lib/us-address";
import {
  amountDue,
  dollarsToCents,
  formatMoney,
  invoiceTotal,
  lineTotal,
  paymentState as paymentStateOf,
  percentToBps,
  taxableSubtotal,
  taxCents,
} from "@/lib/money";

type LineDraft = {
  description: string;
  quantity: string;
  price: string;
  taxable: boolean;
};

function payByIsBeforeInvoice(issue: string, due: string): boolean {
  return Boolean(issue && due && due < issue);
}

function dueFromTerms(issueDate: string, terms: string): string {
  if (!issueDate) return "";
  if (terms === "Due on receipt") return issueDate;
  const match = /^Net (\d+)$/.exec(terms);
  if (!match) return "";
  const date = new Date(`${issueDate}T12:00:00`);
  date.setDate(date.getDate() + Number(match[1]));
  return date.toISOString().slice(0, 10);
}

export function QuickInvoiceForm({
  defaultFromName = "",
  defaultFromEmail = "",
  defaultFromCompany = "",
  defaultFromPhone = "",
  defaultFromAddressLine = "",
  defaultFromCity = "",
  defaultFromRegion = "",
  defaultFromPostalCode = "",
  invoiceId,
  viewToken,
  defaults,
  billToClients = [],
}: {
  defaultFromName?: string;
  defaultFromEmail?: string;
  defaultFromCompany?: string;
  defaultFromPhone?: string;
  defaultFromAddressLine?: string;
  defaultFromCity?: string;
  defaultFromRegion?: string;
  defaultFromPostalCode?: string;
  invoiceId?: string;
  viewToken?: string;
  defaults?: {
    invoiceNumber?: string;
    issueDate?: string;
    dueDate?: string;
    paymentTerms?: string;
    poNumber?: string;
    taxRate?: string;
    notes?: string;
    paymentInstructions?: string;
    paymentState?: "unpaid" | "partial" | "paid";
    amountPaid?: string;
    billToName?: string;
    billToContactName?: string;
    billToEmail?: string;
    billToPhone?: string;
    billToAddressLine?: string;
    billToCity?: string;
    billToRegion?: string;
    billToPostalCode?: string;
    lines?: LineDraft[];
  };
  billToClients?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    addressLine: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
  }[];
}) {
  const [state, action, pending] = useActionState(createPublicInvoiceAction, null);
  const today = new Date().toISOString().slice(0, 10);
  const [fromName, setFromName] = useState(defaultFromCompany);
  const [fromContactName, setFromContactName] = useState(defaultFromName);
  const [fromEmail, setFromEmail] = useState(defaultFromEmail);
  const [fromPhone, setFromPhone] = useState(formatUsPhone(defaultFromPhone));
  const [fromAddressLine, setFromAddressLine] = useState(defaultFromAddressLine);
  const [fromCity, setFromCity] = useState(defaultFromCity);
  const [fromRegion, setFromRegion] = useState(defaultFromRegion);
  const [fromPostalCode, setFromPostalCode] = useState(defaultFromPostalCode);
  const [billToName, setBillToName] = useState(defaults?.billToName ?? "");
  const [billToContactName, setBillToContactName] = useState(defaults?.billToContactName ?? "");
  const [billToEmail, setBillToEmail] = useState(defaults?.billToEmail ?? "");
  const [billToPhone, setBillToPhone] = useState(formatUsPhone(defaults?.billToPhone ?? ""));
  const [billToAddressLine, setBillToAddressLine] = useState(defaults?.billToAddressLine ?? "");
  const [billToCity, setBillToCity] = useState(defaults?.billToCity ?? "");
  const [billToRegion, setBillToRegion] = useState(defaults?.billToRegion ?? "");
  const [billToPostalCode, setBillToPostalCode] = useState(defaults?.billToPostalCode ?? "");
  const [billToClientId, setBillToClientId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(defaults?.invoiceNumber ?? "");
  const [issueDate, setIssueDate] = useState(defaults?.issueDate ?? today);
  const [dueDate, setDueDate] = useState(defaults?.dueDate ?? "");
  const [paymentTerms, setPaymentTerms] = useState(defaults?.paymentTerms ?? "");
  const [termsOpen, setTermsOpen] = useState(false);
  const [customTermsMode, setCustomTermsMode] = useState(false);
  const paymentTermsIsPreset = (PAYMENT_TERMS as readonly string[]).includes(paymentTerms);
  const [poNumber, setPoNumber] = useState(defaults?.poNumber ?? "");
  const [taxRate, setTaxRate] = useState(defaults?.taxRate ?? "");
  const [paymentState, setPaymentState] = useState<"unpaid" | "partial" | "paid">(
    defaults?.paymentState ?? "unpaid",
  );
  const [amountPaidInput, setAmountPaidInput] = useState(defaults?.amountPaid ?? "");
  const [paymentInstructions, setPaymentInstructions] = useState(defaults?.paymentInstructions ?? "");
  const [notes, setNotes] = useState(defaults?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    defaults?.lines ?? [{ description: "", quantity: "1", price: "", taxable: false }],
  );
  const [dateWarn, setDateWarn] = useState(false);
  const [taxRateWarn, setTaxRateWarn] = useState(false);

  const pricedLines = useMemo(
    () =>
      lines.map((row) => ({
        ...row,
        quantity: Number.parseFloat(row.quantity) || 0,
        unitPrice: dollarsToCents(row.price),
      })),
    [lines],
  );
  const subtotal = invoiceTotal(pricedLines);
  const tax = taxCents(taxableSubtotal(pricedLines), percentToBps(taxRate));
  const total = subtotal + tax;
  const paidCents =
    paymentState === "paid"
      ? total
      : paymentState === "partial"
        ? dollarsToCents(amountPaidInput)
        : 0;
  const dueCents = amountDue(total, paidCents);
  const paidLabel = paymentStateOf(paidCents, total);

  function applyTerms(nextTerms: string, nextIssue = issueDate) {
    setPaymentTerms(nextTerms);
    const computed = dueFromTerms(nextIssue, nextTerms);
    if (computed) setDueDate(computed);
  }

  function pickBillToClient(id: string) {
    setBillToClientId(id);
    const client = billToClients.find((entry) => entry.id === id);
    if (!client) {
      setBillToName("");
      setBillToEmail("");
      setBillToPhone("");
      setBillToAddressLine("");
      setBillToCity("");
      setBillToRegion("");
      setBillToPostalCode("");
      return;
    }
    setBillToName(client.name);
    setBillToEmail(client.email);
    setBillToPhone(formatUsPhone(client.phone ?? ""));
    setBillToAddressLine(client.addressLine ?? "");
    setBillToCity(client.city ?? "");
    setBillToRegion(client.region ?? "");
    setBillToPostalCode(client.postalCode ?? "");
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const taxNeeded = lines.some((row) => row.taxable) && !(Number.parseFloat(taxRate) > 0);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!taxNeeded) return;
    event.preventDefault();
    setTaxRateWarn(true);
    document.getElementById("taxRate")?.focus();
  }

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-6">
      {invoiceId ? <input type="hidden" name="invoiceId" value={invoiceId} /> : null}
      {viewToken ? <input type="hidden" name="viewToken" value={viewToken} /> : null}
      <FormBanner
        state={
          taxRateWarn && taxNeeded
            ? { error: "You marked a line for tax. Enter the tax rate." }
            : state
        }
      />
      <article className="invoice-sheet paper rounded-[1.4rem] p-6 sm:p-10">
        <div className="invoice-meta mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-muted">
            Invoice number
            <input
              id="invoiceNumber"
              name="invoiceNumber"
              aria-label="Invoice number"
              className="invoice-input mt-1"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              placeholder="INV-0001"
            />
          </label>
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-muted">
            Invoice date
            <input
              id="issueDate"
              name="issueDate"
              type="date"
              required
              aria-label="Invoice date"
              className="invoice-input mt-1"
              value={issueDate}
              onChange={(event) => {
                const next = event.target.value;
                setIssueDate(next);
                const computed = dueFromTerms(next, paymentTerms);
                if (computed) {
                  setDueDate(computed);
                  return;
                }
                if (payByIsBeforeInvoice(next, dueDate)) setDateWarn(true);
              }}
            />
          </label>
          <div className="flex flex-col text-xs font-semibold uppercase tracking-wide text-muted">
            <span id="paymentTermsLabel">Terms</span>
            <input type="hidden" name="paymentTerms" value={paymentTerms} />
            <div className="relative">
              <button
                type="button"
                aria-labelledby="paymentTermsLabel"
                aria-haspopup="listbox"
                aria-expanded={termsOpen}
                className="invoice-input mt-1 flex w-full items-center justify-between gap-2 text-left normal-case tracking-normal"
                onClick={() => {
                  setCustomTermsMode(false);
                  setTermsOpen((open) => !open);
                }}
              >
                <span className={paymentTerms ? "text-ink" : "text-muted"}>
                  {paymentTerms || "—"}
                </span>
                <span aria-hidden="true" className="text-muted">
                  ▾
                </span>
              </button>
              {termsOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close payment terms"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setTermsOpen(false)}
                  />
                  <div
                    role="listbox"
                    aria-label="Payment terms"
                    className="paper absolute left-0 top-full z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl p-1 text-ink shadow-lg"
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setTermsOpen(false);
                    }}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={!paymentTerms}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-base font-normal normal-case tracking-normal hover:bg-background"
                      onClick={() => {
                        applyTerms("");
                        setTermsOpen(false);
                      }}
                    >
                      —
                    </button>
                    {PAYMENT_TERMS.map((term) => (
                      <button
                        key={term}
                        type="button"
                        role="option"
                        aria-selected={paymentTerms === term}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-base font-normal normal-case tracking-normal hover:bg-background"
                        onClick={() => {
                          applyTerms(term);
                          setTermsOpen(false);
                        }}
                      >
                        {term}
                      </button>
                    ))}
                    {customTermsMode ? (
                      <input
                        autoFocus
                        aria-label="Custom payment terms"
                        className="invoice-input mt-1 w-full text-base font-normal normal-case tracking-normal"
                        placeholder="Net 90, Due Friday…"
                        defaultValue={paymentTermsIsPreset ? "" : paymentTerms}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            applyTerms(event.currentTarget.value.trim());
                            setCustomTermsMode(false);
                            setTermsOpen(false);
                          } else if (event.key === "Escape") {
                            setCustomTermsMode(false);
                          }
                        }}
                        onBlur={(event) => {
                          const next = event.currentTarget.value.trim();
                          if (next) applyTerms(next);
                          setCustomTermsMode(false);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-base font-normal normal-case tracking-normal text-accent hover:bg-background"
                        onClick={() => setCustomTermsMode(true)}
                      >
                        Custom…
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div className="relative">
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-muted">
              Pay by
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                aria-label="Pay by"
                className="invoice-input mt-1"
                value={dueDate}
                onChange={(event) => {
                  const next = event.target.value;
                  setDueDate(next);
                  if (payByIsBeforeInvoice(issueDate, next)) setDateWarn(true);
                }}
              />
            </label>
            {dateWarn ? (
              <div
                className="paper absolute left-0 top-full z-20 mt-2 w-56 rounded-xl p-3 shadow-lg"
                role="alertdialog"
                aria-labelledby="date-warn-title"
              >
                <p id="date-warn-title" className="text-sm text-ink">
                  Pay by is before the invoice date.
                </p>
                <button
                  type="button"
                  className="btn btn-primary mt-3 w-full"
                  onClick={() => setDateWarn(false)}
                >
                  OK
                </button>
              </div>
            ) : null}
          </div>
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-muted">
            PO
            <input
              id="poNumber"
              name="poNumber"
              aria-label="PO number"
              className="invoice-input mt-1"
              value={poNumber}
              onChange={(event) => setPoNumber(event.target.value)}
              placeholder="optional"
            />
          </label>
        </div>
        <div className="grid items-start gap-8 sm:grid-cols-2">
          <div className="invoice-fields">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bill to</p>
            {billToClients.length ? (
              <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-muted">
                Saved client
                <select
                  id="billToClientId"
                  aria-label="Saved client"
                  className="invoice-input mt-1"
                  value={billToClientId}
                  onChange={(event) => pickBillToClient(event.target.value)}
                >
                  <option value="">Someone new</option>
                  {billToClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <input
              id="billToName"
              name="billToName"
              required
              aria-label="Client company"
              className="invoice-input"
              value={billToName}
              onChange={(event) => setBillToName(event.target.value)}
              placeholder="Company"
            />
            <input
              id="billToContactName"
              name="billToContactName"
              aria-label="Attn"
              className="invoice-input"
              value={billToContactName}
              onChange={(event) => setBillToContactName(event.target.value)}
              placeholder="Attn (optional)"
            />
            <input
              id="billToAddressLine"
              name="billToAddressLine"
              aria-label="Client street address"
              className="invoice-input"
              value={billToAddressLine}
              onChange={(event) => setBillToAddressLine(event.target.value)}
              placeholder="Street address"
            />
            <div className="grid grid-cols-[minmax(0,1fr)_5.75rem_6.5rem] gap-3">
              <input
                id="billToCity"
                name="billToCity"
                aria-label="Client city"
                className="invoice-input"
                value={billToCity}
                onChange={(event) => setBillToCity(event.target.value)}
                placeholder="City"
              />
              <input
                id="billToRegion"
                name="billToRegion"
                aria-label="Client state"
                className="invoice-input"
                value={billToRegion}
                onChange={(event) => setBillToRegion(event.target.value)}
                placeholder="State"
              />
              <input
                id="billToPostalCode"
                name="billToPostalCode"
                aria-label="Client ZIP"
                className="invoice-input"
                value={billToPostalCode}
                onChange={(event) => setBillToPostalCode(event.target.value)}
                placeholder="ZIP"
              />
            </div>
            <input
              id="billToEmail"
              name="billToEmail"
              type="email"
              required
              aria-label="Client email"
              className="invoice-input"
              value={billToEmail}
              onChange={(event) => setBillToEmail(event.target.value)}
              placeholder="ap@client.com"
            />
            <input
              id="billToPhone"
              name="billToPhone"
              aria-label="Client phone"
              className="invoice-input"
              type="tel"
              inputMode="tel"
              value={billToPhone}
              onChange={(event) => setBillToPhone(formatUsPhone(event.target.value))}
              placeholder="(555) 555-5555"
            />
          </div>

          <div className="invoice-fields">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">From</p>
            <input
              id="fromContactName"
              name="fromContactName"
              aria-label="Your name"
              className="invoice-input"
              value={fromContactName}
              onChange={(event) => setFromContactName(event.target.value)}
              placeholder="Your name"
            />
            <input
              id="fromName"
              name="fromName"
              aria-label="Your company"
              className="invoice-input"
              value={fromName}
              onChange={(event) => setFromName(event.target.value)}
              placeholder="Company"
            />
            <input
              id="fromAddressLine"
              name="fromAddressLine"
              aria-label="Your street address"
              className="invoice-input"
              value={fromAddressLine}
              onChange={(event) => setFromAddressLine(event.target.value)}
              placeholder="Street address"
            />
            <div className="grid grid-cols-[minmax(0,1fr)_5.75rem_6.5rem] gap-3">
              <input
                id="fromCity"
                name="fromCity"
                aria-label="City"
                className="invoice-input"
                value={fromCity}
                onChange={(event) => setFromCity(event.target.value)}
                placeholder="City"
              />
              <input
                id="fromRegion"
                name="fromRegion"
                aria-label="State"
                className="invoice-input"
                value={fromRegion}
                onChange={(event) => setFromRegion(event.target.value)}
                placeholder="State"
              />
              <input
                id="fromPostalCode"
                name="fromPostalCode"
                aria-label="ZIP"
                className="invoice-input"
                value={fromPostalCode}
                onChange={(event) => setFromPostalCode(event.target.value)}
                placeholder="ZIP"
              />
            </div>
            <input
              id="fromEmail"
              name="fromEmail"
              type="email"
              aria-label="Your email"
              className="invoice-input"
              value={fromEmail}
              onChange={(event) => setFromEmail(event.target.value)}
              placeholder="you@company.com"
            />
            <input
              id="fromPhone"
              name="fromPhone"
              aria-label="Your phone"
              className="invoice-input"
              type="tel"
              inputMode="tel"
              value={fromPhone}
              onChange={(event) => setFromPhone(formatUsPhone(event.target.value))}
              placeholder="(555) 555-5555"
            />
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="w-full py-2 pr-4 font-medium">Description</th>
                <th className="w-32 min-w-32 py-2 px-3 text-right font-medium">Qty</th>
                <th className="w-40 min-w-40 py-2 px-3 text-right font-medium">Rate</th>
                <th className="w-16 py-2 px-4 text-center font-medium">Tax</th>
                <th className="w-28 py-2 pl-4 text-right font-medium">Amount</th>
                <th className="w-8 py-2">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row, index) => (
                <tr key={index} className="border-b border-line/70">
                  <td className="w-full py-3 pr-4 align-top">
                    <textarea
                      name="item_description"
                      rows={1}
                      aria-label={`Line ${index + 1} description`}
                      className="invoice-input invoice-input-line w-full"
                      value={row.description}
                      onChange={(event) => {
                        updateLine(index, { description: event.target.value });
                        event.target.style.height = "auto";
                        event.target.style.height = `${event.target.scrollHeight}px`;
                      }}
                      ref={(node) => {
                        if (!node) return;
                        node.style.height = "auto";
                        node.style.height = `${node.scrollHeight}px`;
                      }}
                      placeholder="What this line is for"
                    />
                  </td>
                  <td className="w-32 min-w-32 px-3 py-3 align-top">
                    <input
                      name="item_quantity"
                      aria-label={`Line ${index + 1} quantity`}
                      inputMode="decimal"
                      className="invoice-input h-10 w-full text-right tabular-nums"
                      value={row.quantity}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                    />
                  </td>
                  <td className="w-40 min-w-40 px-3 py-3 align-top">
                    <input
                      name="item_price"
                      aria-label={`Line ${index + 1} rate`}
                      inputMode="decimal"
                      className="invoice-input h-10 w-full text-right tabular-nums"
                      value={row.price}
                      onChange={(event) => updateLine(index, { price: event.target.value })}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex h-10 items-center justify-center">
                      <input
                        type="checkbox"
                        name="item_taxable"
                        value={String(index)}
                        checked={row.taxable}
                        onChange={(event) => {
                          const taxable = event.target.checked;
                          updateLine(index, { taxable });
                          if (taxable && !(Number.parseFloat(taxRate) > 0)) setTaxRateWarn(true);
                        }}
                        aria-label={`Charge tax on line ${index + 1}`}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    </div>
                  </td>
                  <td className="py-3 pl-4 align-top">
                    <div className="flex h-10 items-center justify-end tabular-nums">
                      {formatMoney(lineTotal(pricedLines[index].quantity, pricedLines[index].unitPrice))}
                    </div>
                  </td>
                  <td className="py-3 pl-2 align-top">
                    <div className="flex h-10 items-center justify-center">
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line text-base leading-none text-muted hover:border-ink hover:text-ink"
                        onClick={() =>
                          setLines((current) =>
                            current.length === 1
                              ? [{ description: "", quantity: "1", price: "", taxable: false }]
                              : current.filter((_, i) => i !== index),
                          )
                        }
                        aria-label={`Remove line ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            className="mt-2 text-sm text-accent underline-offset-2 hover:underline"
            onClick={() =>
              setLines((current) => [
                ...current,
                { description: "", quantity: "1", price: "", taxable: false },
              ])
            }
          >
            Add a line
          </button>
        </div>

        <div className="mt-6 ml-auto w-full max-w-xs space-y-1 text-sm">
          {paidLabel === "paid" ? (
            <p className="mb-3 inline-block border-[3px] border-olive px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-olive">
              Paid
            </p>
          ) : paidLabel === "partial" ? (
            <p className="mb-3 inline-block border-[3px] border-brass px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-ink">
              Partially paid
            </p>
          ) : null}
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-muted">
            <label className="inline-flex flex-wrap items-center gap-1">
              <span>Tax</span>
              <input
                id="taxRate"
                name="taxRate"
                inputMode="decimal"
                aria-label="Tax percent"
                className={`invoice-input w-14 text-right tabular-nums ${
                  taxRateWarn && taxNeeded ? "ring-2 ring-accent" : ""
                }`}
                value={taxRate}
                aria-invalid={taxRateWarn && taxNeeded}
                onChange={(event) => {
                  setTaxRate(event.target.value);
                  if (Number.parseFloat(event.target.value) > 0) setTaxRateWarn(false);
                }}
                placeholder="%"
              />
              <span>%</span>
              {taxRateWarn && taxNeeded ? (
                <span className="basis-full text-xs font-medium normal-case tracking-normal text-accent">
                  Enter the tax rate
                </span>
              ) : null}
            </label>
            <span className="tabular-nums">{formatMoney(tax)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-xl">
            <span className="display">Total</span>
            <span className="display tabular-nums">{formatMoney(total)}</span>
          </div>
          <div className="field pt-3">
            <label htmlFor="paymentState">Payment Status</label>
            <select
              id="paymentState"
              name="paymentState"
              className="invoice-input"
              value={paymentState}
              onChange={(event) =>
                setPaymentState(event.target.value as "unpaid" | "partial" | "paid")
              }
            >
              <option value="unpaid">Not paid</option>
              <option value="partial">Partially paid</option>
              <option value="paid">Paid in full</option>
            </select>
          </div>
          {paymentState === "partial" ? (
            <div className="field">
              <label htmlFor="amountPaid">How much was paid</label>
              <input
                id="amountPaid"
                name="amountPaid"
                inputMode="decimal"
                className="invoice-input text-right tabular-nums"
                value={amountPaidInput}
                onChange={(event) => setAmountPaidInput(event.target.value)}
                placeholder="0.00"
              />
            </div>
          ) : null}
          {paidLabel !== "unpaid" ? (
            <div className="flex justify-between text-muted">
              <span>Paid</span>
              <span className="tabular-nums">{formatMoney(Math.min(paidCents, total))}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-muted">
            <span>Still due</span>
            <span className="tabular-nums">{formatMoney(dueCents)}</span>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">How to pay</p>
            <textarea
              id="paymentInstructions"
              name="paymentInstructions"
              rows={3}
              aria-label="How to pay"
              className="invoice-input mt-1 w-full"
              value={paymentInstructions}
              onChange={(event) => setPaymentInstructions(event.target.value)}
              placeholder="ACH, check, or where to send payment"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Notes</p>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              aria-label="Notes"
              className="invoice-input mt-1 w-full"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything else that should print on the invoice"
            />
          </div>
        </div>
        <UncleInvoiceCredit />
      </article>

      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : invoiceId ? "Save changes" : "Looks good — create it"}
      </button>
    </form>
  );
}
