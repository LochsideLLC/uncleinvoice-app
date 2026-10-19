import { parseDate } from "@/lib/dates";
import { percentToBps } from "@/lib/money";
import { parsePhoneNumber } from "@/lib/phone";

export const PAYMENT_TERMS = [
  "Due on receipt",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
] as const;

export function optionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function dueDateFromTerms(issueDate: Date, terms: string | null): Date | null {
  if (!terms) return null;
  if (terms === "Due on receipt") return issueDate;
  const match = /^Net (\d+)$/.exec(terms);
  if (!match) return null;
  return addDays(issueDate, Number(match[1]));
}

export function parseTaxRateBps(
  value: FormDataEntryValue | null,
): { ok: true; bps: number } | { ok: false; error: string } {
  const raw = String(value ?? "").trim();
  if (!raw) return { ok: true, bps: 0 };
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { ok: false, error: "Tax rate should be a percent, like 8.25." };
  }
  return { ok: true, bps: percentToBps(n) };
}

export type BusinessInvoiceFields = {
  dueDate: Date | null;
  poNumber: string | null;
  paymentTerms: string | null;
  paymentInstructions: string | null;
  taxRateBps: number;
  fromTaxId: string | null;
  billToTaxId: string | null;
  fromContactName: string | null;
  billToContactName: string | null;
  fromAddressLine: string | null;
  fromCity: string | null;
  fromRegion: string | null;
  fromPostalCode: string | null;
  fromPhone: string | null;
  billToPhone: string | null;
  billToAddressLine: string | null;
  billToCity: string | null;
  billToRegion: string | null;
  billToPostalCode: string | null;
};

export function parsePhoneField(
  value: FormDataEntryValue | null,
): { ok: true; e164: string | null } | { ok: false; error: string } {
  const raw = String(value ?? "").trim();
  if (!raw) return { ok: true, e164: null };
  const parsed = parsePhoneNumber(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return { ok: true, e164: parsed.e164 };
}

export function parseBusinessInvoiceFields(
  formData: FormData,
  issueDate: Date,
): BusinessInvoiceFields | { error: string } {
  const tax = parseTaxRateBps(formData.get("taxRate"));
  if (!tax.ok) return { error: tax.error };
  const fromPhone = parsePhoneField(formData.get("fromPhone"));
  if (!fromPhone.ok) return { error: `Your phone: ${fromPhone.error}` };
  const billToPhone = parsePhoneField(formData.get("billToPhone"));
  if (!billToPhone.ok) return { error: `Client phone: ${billToPhone.error}` };
  const paymentTerms = optionalText(formData.get("paymentTerms"));
  return {
    dueDate: parseDate(formData.get("dueDate")) ?? dueDateFromTerms(issueDate, paymentTerms),
    poNumber: optionalText(formData.get("poNumber")),
    paymentTerms,
    paymentInstructions: optionalText(formData.get("paymentInstructions")),
    taxRateBps: tax.bps,
    fromTaxId: optionalText(formData.get("fromTaxId")),
    billToTaxId: optionalText(formData.get("billToTaxId")),
    fromContactName: optionalText(formData.get("fromContactName")),
    billToContactName: optionalText(formData.get("billToContactName")),
    fromAddressLine: optionalText(formData.get("fromAddressLine")),
    fromCity: optionalText(formData.get("fromCity")),
    fromRegion: optionalText(formData.get("fromRegion")),
    fromPostalCode: optionalText(formData.get("fromPostalCode")),
    fromPhone: fromPhone.e164,
    billToPhone: billToPhone.e164,
    billToAddressLine: optionalText(formData.get("billToAddressLine")),
    billToCity: optionalText(formData.get("billToCity")),
    billToRegion: optionalText(formData.get("billToRegion")),
    billToPostalCode: optionalText(formData.get("billToPostalCode")),
  };
}

export function invoiceBusinessData(fields: BusinessInvoiceFields) {
  return {
    dueDate: fields.dueDate,
    poNumber: fields.poNumber,
    paymentTerms: fields.paymentTerms,
    paymentInstructions: fields.paymentInstructions,
    taxRateBps: fields.taxRateBps,
    fromTaxId: fields.fromTaxId,
    billToTaxId: fields.billToTaxId,
    fromContactName: fields.fromContactName,
    billToContactName: fields.billToContactName,
    fromAddressLine: fields.fromAddressLine,
    fromCity: fields.fromCity,
    fromRegion: fields.fromRegion,
    fromPostalCode: fields.fromPostalCode,
  };
}
