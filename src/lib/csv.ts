import { parse } from "papaparse";
import { dollarsToCents } from "@/lib/money";

export type CsvPaymentRow = {
  contractorName: string;
  contractorEmail: string;
  date: string;
  amount: string;
  amountPaid: string;
  description: string;
};

export const CSV_TEMPLATE_HEADER =
  "contractor_name,contractor_email,date,amount,amount_paid,description";

export function parsePaymentCsv(text: string): CsvPaymentRow[] {
  const result = parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) =>
      header.trim().toLowerCase().replaceAll(" ", "_").replaceAll("-", "_"),
  });

  if (result.errors.length) {
    const first = result.errors[0];
    throw new Error(`Could not read the spreadsheet: ${first.message}`);
  }

  return result.data
    .map((row) => ({
      contractorName: (row.contractor_name ?? row.name ?? "").trim(),
      contractorEmail: (row.contractor_email ?? row.email ?? "").trim().toLowerCase(),
      date: (row.date ?? row.issue_date ?? "").trim(),
      amount: (row.amount ?? row.total ?? "").trim(),
      amountPaid: (row.amount_paid ?? row.paid ?? row.paid_amount ?? "").trim(),
      description: (row.description ?? row.memo ?? "Services").trim(),
    }))
    .filter((row) => row.contractorName && row.amount);
}

export function csvRowToCents(amount: string): number {
  const cents = dollarsToCents(amount);
  if (cents <= 0) {
    throw new Error(`Amount "${amount}" is not a valid dollar amount.`);
  }
  return cents;
}

/**
 * How much of this row has already been paid, in cents.
 *
 * This importer reads a list of payments that have already gone out, so a row
 * with no `amount_paid` column is treated as paid in full. Leaving it blank
 * would otherwise produce an invoice saying the client still owes money it
 * already sent, which is the opposite of the record being imported.
 */
export function csvRowToPaidCents(value: string, totalCents: number): number {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return totalCents;
  if (["no", "false", "unpaid", "n"].includes(normalized)) return 0;
  if (["yes", "true", "paid", "y"].includes(normalized)) return totalCents;
  const cents = dollarsToCents(value);
  if (cents <= 0) return 0;
  return Math.min(cents, totalCents);
}
