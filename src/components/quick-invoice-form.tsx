"use client";

import { useActionState, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createPublicInvoiceAction } from "@/actions/public-invoice";
import { createServiceItemAction } from "@/actions/service-items";
import { createWorkspaceInlineAction, updateDefaultTermsAction } from "@/actions/workspaces";
import { FormBanner } from "@/components/form-banner";
import { SaveButton, useSaveButton } from "@/components/save-button";
import { UncleInvoiceCredit } from "@/components/invoice-document";
import type { SavedService } from "@/components/workspace-services-manager";
import { PAYMENT_TERMS, resolveDefaultTerms } from "@/lib/invoice-fields";
import { displayPhoneNumber, parsePhoneNumber, phoneSubmitError } from "@/lib/phone";
import { PhoneInput } from "@/components/phone-input";
import { PaymentMethodOptions } from "@/components/payment-method-options";
import {
  amountDue,
  centsToDollars,
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

function initialPhoneE164(display: string): string | null {
  if (!display.trim()) return null;
  const parsed = parsePhoneNumber(display);
  return parsed.ok ? parsed.e164 : null;
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
  defaultTerms,
  defaultClientId,
  savedServices = [],
  billToClients = [],
  canSaveClients = false,
  paymentOptions,
  returnTo,
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
  defaultTerms?: string | null;
  defaultClientId?: string;
  savedServices?: { workspaceId: string; items: SavedService[] }[];
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
    businessName: string | null;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    addressLine: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    defaultPaymentTerms: string | null;
    nextNumber: string;
  }[];
  canSaveClients?: boolean;
  paymentOptions?: {
    enabled: boolean;
    canManage: boolean;
    canCollect: boolean;
    canSetUpPayments: boolean;
    setupNote: string | null;
    checkPaymentEnabled: boolean;
  };
  returnTo?: string;
}) {
  const [state, action, pending] = useActionState(createPublicInvoiceAction, null);
  const save = useSaveButton(state);
  const today = new Date().toISOString().slice(0, 10);
  const [fromName, setFromName] = useState(defaultFromCompany);
  const [fromContactName, setFromContactName] = useState(defaultFromName);
  const [fromEmail, setFromEmail] = useState(defaultFromEmail);
  const [fromPhone, setFromPhone] = useState(displayPhoneNumber(defaultFromPhone));
  const [fromAddressLine, setFromAddressLine] = useState(defaultFromAddressLine);
  const [fromCity, setFromCity] = useState(defaultFromCity);
  const [fromRegion, setFromRegion] = useState(defaultFromRegion);
  const [fromPostalCode, setFromPostalCode] = useState(defaultFromPostalCode);
  const [billToName, setBillToName] = useState(defaults?.billToName ?? "");
  const [billToContactName, setBillToContactName] = useState(defaults?.billToContactName ?? "");
  const [billToEmail, setBillToEmail] = useState(defaults?.billToEmail ?? "");
  const [billToPhone, setBillToPhone] = useState(displayPhoneNumber(defaults?.billToPhone ?? ""));
  const [billToAddressLine, setBillToAddressLine] = useState(defaults?.billToAddressLine ?? "");
  const [billToCity, setBillToCity] = useState(defaults?.billToCity ?? "");
  const [billToRegion, setBillToRegion] = useState(defaults?.billToRegion ?? "");
  const [billToPostalCode, setBillToPostalCode] = useState(defaults?.billToPostalCode ?? "");
  const [billToClientId, setBillToClientId] = useState(defaultClientId ?? "");
  const [clientOptions, setClientOptions] = useState(billToClients);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientError, setNewClientError] = useState<string | null>(null);
  const [newClientPending, setNewClientPending] = useState(false);
  const [newClientSaveResult, setNewClientSaveResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const newClientSave = useSaveButton(newClientSaveResult);
  const [newClientName, setNewClientName] = useState("");
  const [newClientBusiness, setNewClientBusiness] = useState("");
  const [suggestedNumber, setSuggestedNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(defaults?.invoiceNumber ?? "");
  const [issueDate, setIssueDate] = useState(defaults?.issueDate ?? today);
  const initialTerms = resolveDefaultTerms(defaults?.paymentTerms || defaultTerms);
  const [dueDate, setDueDate] = useState(
    () => defaults?.dueDate || dueFromTerms(defaults?.issueDate ?? today, initialTerms),
  );
  const [paymentTerms, setPaymentTerms] = useState(initialTerms);
  // True once the person picks terms themselves; client switching only
  // fills terms they have not touched.
  const [termsTouched, setTermsTouched] = useState(() => Boolean(defaults?.paymentTerms));
  const [defaultMsg, setDefaultMsg] = useState<string | null>(null);
  const [customTermsMode, setCustomTermsMode] = useState(false);
  const paymentTermsIsPreset = (PAYMENT_TERMS as readonly string[]).includes(paymentTerms);
  const [poNumber, setPoNumber] = useState(defaults?.poNumber ?? "");
  const [taxRate, setTaxRate] = useState(defaults?.taxRate ?? "");
  const [paymentState, setPaymentState] = useState<"unpaid" | "partial" | "paid">(
    defaults?.paymentState ?? "unpaid",
  );
  const [amountPaidInput, setAmountPaidInput] = useState(defaults?.amountPaid ?? "");
  const [paymentInstructions, setPaymentInstructions] = useState(defaults?.paymentInstructions ?? "");
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(paymentOptions?.enabled ?? false);
  const [checkPaymentEnabled, setCheckPaymentEnabled] = useState(paymentOptions?.checkPaymentEnabled ?? false);
  const [notes, setNotes] = useState(defaults?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    defaults?.lines ?? [{ description: "", quantity: "1", price: "", taxable: false }],
  );
  const [dateWarn, setDateWarn] = useState(false);
  const [taxRateWarn, setTaxRateWarn] = useState(false);
  const [billToPhoneError, setBillToPhoneError] = useState<string | null>(null);
  const [fromPhoneError, setFromPhoneError] = useState<string | null>(null);
  const [billToPhoneE164, setBillToPhoneE164] = useState<string | null>(() =>
    initialPhoneE164(displayPhoneNumber(defaults?.billToPhone ?? "")),
  );
  const [fromPhoneE164, setFromPhoneE164] = useState<string | null>(() =>
    initialPhoneE164(displayPhoneNumber(defaultFromPhone)),
  );

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

  function chooseTerms(nextTerms: string) {
    setTermsTouched(true);
    applyTerms(nextTerms);
  }

  async function saveTermsAsDefault() {
    if (!billToClientId || !paymentTerms) return;
    setDefaultMsg(null);
    const data = new FormData();
    data.set("workspaceId", billToClientId);
    data.set("paymentTerms", paymentTerms);
    const result = await updateDefaultTermsAction(null, data);
    if (!result || "error" in result) {
      setDefaultMsg(result?.error ?? "Could not save the default.");
      return;
    }
    setClientOptions((current) =>
      current.map((entry) =>
        entry.id === billToClientId ? { ...entry, defaultPaymentTerms: paymentTerms } : entry,
      ),
    );
    setDefaultMsg(result.message ?? "Saved.");
  }

  const selectedClient = clientOptions.find((entry) => entry.id === billToClientId) ?? null;

  function fillBillTo(client: {
    name: string;
    businessName?: string | null;
    contactName?: string | null;
    email: string | null;
    phone: string | null;
    addressLine: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
  }) {
    setBillToName(client.businessName || client.name);
    setBillToContactName(client.contactName ?? "");
    setBillToEmail(client.email ?? "");
    setBillToPhone(displayPhoneNumber(client.phone ?? ""));
    setBillToPhoneE164(initialPhoneE164(displayPhoneNumber(client.phone ?? "")));
    setBillToAddressLine(client.addressLine ?? "");
    setBillToCity(client.city ?? "");
    setBillToRegion(client.region ?? "");
    setBillToPostalCode(client.postalCode ?? "");
  }

  function applySuggestedNumber(nextNumber: string) {
    // A number the person typed themselves always wins. Ours only fills a
    // blank field, or replaces our own earlier suggestion when they switch
    // clients mid-form.
    if (!invoiceNumber || invoiceNumber === suggestedNumber) {
      setInvoiceNumber(nextNumber);
      setSuggestedNumber(nextNumber);
    }
  }

  function pickBillToClient(id: string) {
    setBillToClientId(id);
    const client = clientOptions.find((entry) => entry.id === id);
    if (!client) {
      setBillToName("");
      setBillToEmail("");
      setBillToPhone("");
      setBillToPhoneE164(null);
      setBillToPhoneError(null);
      setBillToAddressLine("");
      setBillToCity("");
      setBillToRegion("");
      setBillToPostalCode("");
      return;
    }
    fillBillTo(client);
    applySuggestedNumber(client.nextNumber);
    if (!termsTouched) applyTerms(resolveDefaultTerms(client.defaultPaymentTerms));
  }

  function matchClients(query: string) {
    const q = query.trim().toLowerCase();
    const scored = clientOptions.map((client) => {
      const name = client.name.toLowerCase();
      const email = (client.email ?? "").toLowerCase();
      if (!q) return { client, score: 0 };
      if (name.startsWith(q)) return { client, score: 0 };
      if (name.includes(q)) return { client, score: 1 };
      if (email.includes(q)) return { client, score: 2 };
      return { client, score: -1 };
    });
    return scored
      .filter((entry) => entry.score >= 0)
      .sort(
        (a, b) => a.score - b.score || a.client.name.localeCompare(b.client.name),
      )
      .map((entry) => entry.client);
  }

  function openNewClient(prefill: string) {
    setNewClientName(prefill);
    setNewClientBusiness("");
    setNewClientError(null);
    setNewClientSaveResult(null);
    newClientSave.reset();
    setCompanyOpen(false);
    setNewClientOpen(true);
  }

  async function saveNewClient(formData: FormData) {
    setNewClientPending(true);
    try {
      const result = await createWorkspaceInlineAction(null, formData);
      if ("error" in result) {
        setNewClientSaveResult({ error: result.error });
        setNewClientError(result.error);
        return;
      }
      setNewClientSaveResult({ ok: true });
      // Fill from the returned record directly: clientOptions has not
      // re-rendered yet, so looking the new id up in it would miss.
      setClientOptions((current) => [...current, result.workspace]);
      setBillToClientId(result.workspace.id);
      fillBillTo(result.workspace);
      applySuggestedNumber(result.workspace.nextNumber);
      if (!termsTouched) applyTerms(resolveDefaultTerms(result.workspace.defaultPaymentTerms));
      setNewClientOpen(false);
      setNewClientError(null);
    } finally {
      setNewClientPending(false);
    }
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const [serviceOptions, setServiceOptions] = useState<Record<string, SavedService[]>>(() =>
    Object.fromEntries(savedServices.map((entry) => [entry.workspaceId, entry.items])),
  );
  const [serviceMsg, setServiceMsg] = useState<string | null>(null);

  async function saveLineAsService(index: number) {
    const row = lines[index];
    if (!billToClientId || !row?.description.trim() || !row.price.trim()) {
      setServiceMsg("Add a description and price first, then save the service.");
      return;
    }
    setServiceMsg(null);
    const data = new FormData();
    data.set("workspaceId", billToClientId);
    data.set("description", row.description.trim());
    data.set("unitPriceCents", String(dollarsToCents(row.price)));
    data.set("taxable", row.taxable ? "1" : "0");
    const result = await createServiceItemAction(null, data);
    if (!("ok" in result)) {
      setServiceMsg(result.error);
      return;
    }
    setServiceOptions((current) => ({
      ...current,
      [billToClientId]: [...(current[billToClientId] ?? []), result.item],
    }));
    setServiceMsg(`Saved “${row.description.trim()}” to ${selectedClient?.name ?? "this client"}.`);
  }

  function fillLineFromService(index: number, serviceId: string) {
    const item = (serviceOptions[billToClientId] ?? []).find((entry) => entry.id === serviceId);
    if (!item) return;
    updateLine(index, {
      description: item.description,
      price: centsToDollars(item.unitPriceCents),
      taxable: item.taxable,
    });
  }

  const savedForClient = serviceOptions[billToClientId] ?? [];

  const taxNeeded = lines.some((row) => row.taxable) && !(Number.parseFloat(taxRate) > 0);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const billToError = phoneSubmitError(billToPhone, billToPhoneE164);
    const fromError = phoneSubmitError(fromPhone, fromPhoneE164);
    setBillToPhoneError(billToError);
    setFromPhoneError(fromError);
    if (billToError || fromError) {
      event.preventDefault();
      document.getElementById(billToError ? "billToPhone" : "fromPhone")?.focus();
      return;
    }
    if (!taxNeeded) return;
    event.preventDefault();
    setTaxRateWarn(true);
    document.getElementById("taxRate")?.focus();
  }

  return (
    <>
    <form action={action} onSubmit={onSubmit} onChange={save.markDirty} className="space-y-6" data-lpignore="true">
      {invoiceId ? <input type="hidden" name="invoiceId" value={invoiceId} /> : null}
      {viewToken ? <input type="hidden" name="viewToken" value={viewToken} /> : null}
      {invoiceId && returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {invoiceId && paymentOptions ? <input type="hidden" name="onlinePaymentEnabled" value={onlinePaymentEnabled ? "on" : "off"} /> : null}
      {invoiceId && paymentOptions ? <input type="hidden" name="checkPaymentEnabled" value={checkPaymentEnabled ? "on" : "off"} /> : null}
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
            <div className="mt-1 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <select
                  id="paymentTermsSelect"
                  aria-labelledby="paymentTermsLabel"
                  className="invoice-input w-full"
                  value={customTermsMode || (paymentTerms !== "" && !paymentTermsIsPreset) ? "__custom" : paymentTerms}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (next === "__custom") {
                      setTermsTouched(true);
                      setCustomTermsMode(true);
                      return;
                    }
                    setCustomTermsMode(false);
                    chooseTerms(next);
                  }}
                >
                  <option value="">—</option>
                  {PAYMENT_TERMS.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                  <option value="__custom">Custom…</option>
                </select>
                {customTermsMode || (paymentTerms !== "" && !paymentTermsIsPreset) ? (
                  <input
                    autoFocus={customTermsMode}
                    aria-label="Custom payment terms"
                    className="invoice-input mt-2 w-full"
                    placeholder="Net 90, Due Friday…"
                    value={paymentTerms}
                    onChange={(event) => {
                      setTermsTouched(true);
                      applyTerms(event.target.value);
                    }}
                  />
                ) : null}
              </div>
              {selectedClient ? (
                <button
                  type="button"
                  onClick={() => {
                    setDefaultMsg(null);
                    saveTermsAsDefault();
                  }}
                  disabled={!paymentTerms}
                  className="shrink-0 text-xs font-normal normal-case tracking-normal text-muted underline underline-offset-2 transition active:scale-95 disabled:no-underline disabled:opacity-50"
                >
                  Set as default
                </button>
              ) : null}
            </div>
            {defaultMsg ? (
              <p role="status" className="mt-1 text-sm font-normal normal-case tracking-normal text-muted">
                {defaultMsg}
              </p>
            ) : null}
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
          <div className="invoice-fields sm:col-start-1 sm:row-start-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bill to</p>
            <div className="relative">
              <input
                id="billToName"
                name="billToName"
                required
                role={canSaveClients ? "combobox" : undefined}
                aria-expanded={canSaveClients ? companyOpen : undefined}
                aria-autocomplete={canSaveClients ? "list" : undefined}
                aria-controls={canSaveClients ? "bill-to-client-list" : undefined}
                aria-label="Customer or business"
                className="invoice-input w-full"
                autoComplete="off"
                value={billToName}
                onChange={(event) => {
                  setBillToName(event.target.value);
                  setBillToClientId("");
                }}
                onFocus={() => {
                  if (canSaveClients) setCompanyOpen(true);
                }}
                onClick={() => {
                  if (canSaveClients) setCompanyOpen(true);
                }}
                onKeyDown={(event) => {
                  if (!canSaveClients) return;
                  if (event.key === "Escape") {
                    setCompanyOpen(false);
                  } else if (event.key === "ArrowDown" && !companyOpen) {
                    setCompanyOpen(true);
                  } else if (event.key === "Enter" && companyOpen) {
                    const exact = clientOptions.find(
                      (client) =>
                        client.name.toLowerCase() === billToName.trim().toLowerCase(),
                    );
                    if (exact) {
                      event.preventDefault();
                      pickBillToClient(exact.id);
                      setCompanyOpen(false);
                    } else if (billToName.trim()) {
                      event.preventDefault();
                      openNewClient(billToName.trim());
                    }
                  }
                }}
                placeholder="Customer or business"
              />
              {companyOpen && canSaveClients ? (
                <>
                  <button
                    type="button"
                    aria-label="Close customer list"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setCompanyOpen(false)}
                  />
                  <div className="paper absolute left-0 top-full z-20 mt-1 w-full rounded-xl p-1 text-ink shadow-lg">
                    <div
                      id="bill-to-client-list"
                      role="listbox"
                      aria-label="Customers"
                      className="max-h-64 overflow-auto"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-base font-medium normal-case tracking-normal text-accent hover:bg-background"
                        onClick={() => openNewClient(billToName.trim())}
                      >
                        <span aria-hidden="true">+</span>
                        {billToName.trim() &&
                        !clientOptions.some(
                          (client) =>
                            client.name.toLowerCase() === billToName.trim().toLowerCase(),
                        )
                          ? `Add "${billToName.trim()}" as a new customer…`
                          : "Add new customer…"}
                      </button>
                      {matchClients(billToName).map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          role="option"
                          aria-selected={billToClientId === client.id}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-base font-normal normal-case tracking-normal hover:bg-background"
                          onClick={() => {
                            pickBillToClient(client.id);
                            setCompanyOpen(false);
                          }}
                        >
                          <span>{client.name}</span>
                          <span className="truncate text-sm text-muted">{client.email}</span>
                        </button>
                      ))}
                      {billToName.trim() && matchClients(billToName).length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted">
                          No saved customers match — add it as new.
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-1 border-t border-line px-3 py-2">
                      <Link
                        href="/app?workspace=contractor&section=clients&from=create"
                        className="font-medium text-accent underline underline-offset-2"
                      >
                        Manage customers
                      </Link>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
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
              aria-label="Client email (optional unless you email this invoice)"
              className="invoice-input"
              value={billToEmail}
              onChange={(event) => setBillToEmail(event.target.value)}
              placeholder="ap@client.com (optional)"
            />
            <PhoneInput
              id="billToPhone"
              name="billToPhone"
              ariaLabel="Client phone"
              value={billToPhone}
              onChange={(next, e164) => {
                setBillToPhone(next);
                setBillToPhoneE164(e164);
                setBillToPhoneError(null);
              }}
              externalError={billToPhoneError}
            />
          </div>

          <div className="invoice-fields sm:col-start-2 sm:row-start-1">
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
            <PhoneInput
              id="fromPhone"
              name="fromPhone"
              ariaLabel="Your phone"
              value={fromPhone}
              onChange={(next, e164) => {
                setFromPhone(next);
                setFromPhoneE164(e164);
                setFromPhoneError(null);
              }}
              externalError={fromPhoneError}
            />
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Services</p>
          {serviceMsg ? (
            <p role="status" className="mt-1 text-sm text-muted">
              {serviceMsg}
            </p>
          ) : null}
          <div className="mt-2 overflow-x-auto">
          <table className="block w-full text-left text-sm sm:table">
            <thead className="hidden sm:table-header-group">
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
            <tbody className="block sm:table-row-group">
              {lines.map((row, index) => (
                <tr key={index} className="grid grid-cols-6 gap-x-3 border-b border-line/70 py-3 sm:table-row sm:py-0">
                  <td className="col-span-6 w-full py-1 pr-0 align-top sm:w-full sm:py-3 sm:pr-4">
                    {selectedClient ? (
                      <select
                        aria-label={`Saved service for line ${index + 1}`}
                        className="invoice-input mb-2 w-full"
                        value=""
                        onChange={(event) => {
                          const next = event.target.value;
                          if (next === "__save") void saveLineAsService(index);
                          else if (next) fillLineFromService(index, next);
                        }}
                      >
                        <option value="">Services…</option>
                        {savedForClient.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.description} — {formatMoney(item.unitPriceCents)}
                          </option>
                        ))}
                        <option value="__save">＋ Save this line as a service</option>
                      </select>
                    ) : null}
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
                  <td className="col-span-3 px-0 py-1 align-top sm:w-32 sm:min-w-32 sm:px-3 sm:py-3">
                    <input
                      name="item_quantity"
                      aria-label={`Line ${index + 1} quantity`}
                      inputMode="decimal"
                      className="invoice-input h-10 w-full text-right tabular-nums"
                      value={row.quantity}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                      placeholder="Qty"
                    />
                  </td>
                  <td className="col-span-3 px-0 py-1 align-top sm:w-40 sm:min-w-40 sm:px-3 sm:py-3">
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
                  <td className="col-span-2 px-0 py-1 align-top sm:w-16 sm:px-4 sm:py-3">
                    <div className="flex h-10 items-center justify-start gap-2 sm:justify-center">
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
                      <span className="text-sm text-muted sm:hidden">Tax</span>
                    </div>
                  </td>
                  <td className="col-span-3 px-0 py-1 align-top sm:w-28 sm:py-3 sm:pl-4">
                    <div className="flex h-10 items-center justify-end tabular-nums">
                      {formatMoney(lineTotal(pricedLines[index].quantity, pricedLines[index].unitPrice))}
                    </div>
                  </td>
                  <td className="col-span-1 px-0 py-1 align-top sm:w-8 sm:py-3 sm:pl-2">
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
          </div>
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
                placeholder="0"
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
        {invoiceId && paymentOptions ? (
          <section className="mt-8 border-t border-line pt-6" aria-label="Invoice payment methods">
            <PaymentMethodOptions
              enabled={onlinePaymentEnabled}
              onChange={setOnlinePaymentEnabled}
              canManage={paymentOptions.canManage}
              canCollect={paymentOptions.canCollect}
              canSetUpPayments={paymentOptions.canSetUpPayments}
              setupNote={paymentOptions.setupNote}
              checkEnabled={checkPaymentEnabled}
              onCheckChange={setCheckPaymentEnabled}
              checkPending={false}
              checkError=""
            />
          </section>
        ) : null}
        <UncleInvoiceCredit />
      </article>

      {invoiceId ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <SaveButton name="saveIntent" value="save" pending={pending} save={save} className="col-span-2 w-full sm:col-span-1" />
          <SaveButton name="saveIntent" value="close" pending={pending} save={save} label="Save and close" className="w-full" />
          <SaveButton name="saveIntent" value="send" pending={pending} save={save} label="Save and send" className="w-full" />
        </div>
      ) : (
        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Saving…" : "Looks good — create it"}
        </button>
      )}
    </form>
    {newClientOpen ? (
      <>
        <button
          type="button"
          aria-label="Close new customer"
          className="fixed inset-0 z-20 cursor-default bg-ink/30"
          onClick={() => setNewClientOpen(false)}
        />
        <div
          role="dialog"
          aria-label="Add a new customer"
          className="customer-drawer paper fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col gap-3 overflow-auto p-4 shadow-2xl"
          onKeyDown={(event) => {
            if (event.key === "Escape") setNewClientOpen(false);
          }}
        >
          <div>
            <h3 className="display text-2xl">Add customer</h3>
            <p className="mt-1 text-sm text-muted">Saved to your list and added to this invoice.</p>
          </div>
          {newClientError ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-red-900">{newClientError}</p>
          ) : null}
          <form
            action={saveNewClient}
            onChange={() => {
              newClientSave.markDirty();
              setNewClientError(null);
            }}
            className="compact-customer-fields grid grid-cols-1 gap-y-2"
          >
            <div className="field">
              <label htmlFor="newClientName">Customer name</label>
              <input
                id="newClientName"
                name="name"
                autoFocus
                value={newClientName}
                onChange={(event) => setNewClientName(event.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="field">
              <label htmlFor="newClientBusiness">Business name</label>
              <input
                id="newClientBusiness"
                name="businessName"
                value={newClientBusiness}
                onChange={(event) => setNewClientBusiness(event.target.value)}
                placeholder="Acme Appliances"
              />
            </div>
            <div className="field">
              <label htmlFor="newClientEmail">Email</label>
              <input id="newClientEmail" name="email" type="email" autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="newClientPhone">Phone</label>
              <input id="newClientPhone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <div className="field">
              <label htmlFor="newClientAddressLine">Street address</label>
              <input id="newClientAddressLine" name="addressLine" autoComplete="street-address" />
            </div>
            <div className="field">
              <label htmlFor="newClientCity">City</label>
              <input id="newClientCity" name="city" autoComplete="address-level2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="newClientRegion">State</label>
                <input id="newClientRegion" name="region" autoComplete="address-level1" />
              </div>
              <div className="field">
                <label htmlFor="newClientPostalCode">ZIP</label>
                <input id="newClientPostalCode" name="postalCode" autoComplete="postal-code" />
              </div>
            </div>
            <div className="flex gap-2">
              <SaveButton type="submit" pending={newClientPending} save={newClientSave} label="Save customer" className="flex-1" />
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setNewClientOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </>
    ) : null}
    </>
  );
}
