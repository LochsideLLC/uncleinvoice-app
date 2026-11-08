import { parse } from "papaparse";
import { dollarsToCents } from "@/lib/money";

export type CsvPaymentRow = {
  contractorName: string;
  contractorEmail: string;
  date: string;
  amount: string;
  amountPaid: string;
  description: string;
  sourcePaymentId: string;
};

export const CSV_TEMPLATE_HEADER =
  "contractor_name,contractor_email,date,amount,amount_paid,description,source_payment_id";

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

  const rows = result.data.map((row) => ({
      contractorName: (row.contractor_name ?? row.name ?? "").trim(),
      contractorEmail: (row.contractor_email ?? row.email ?? "").trim().toLowerCase(),
      date: (row.date ?? row.issue_date ?? "").trim(),
      amount: (row.amount ?? row.total ?? "").trim(),
      amountPaid: (row.amount_paid ?? row.paid ?? row.paid_amount ?? "").trim(),
      description: (row.description ?? row.memo ?? "Services").trim(),
      sourcePaymentId: (row.source_payment_id ?? row.source_transaction_id ?? row.transaction_id ?? row.payment_id ?? row.source_id ?? "").trim(),
    }));
  const invalid = rows.findIndex((row) => !row.contractorName || !row.amount);
  if (invalid >= 0) throw new Error(`Row ${invalid + 2} needs a contractor name and amount.`);
  return rows;
}

export function csvRowToCents(amount: string): number {
  const cents = parseCsvMoney(amount);
  if (cents <= 0) {
    throw new Error(`Amount "${amount}" is not a valid dollar amount.`);
  }
  return cents;
}

function parseCsvMoney(value: string): number {
  const normalized = value.trim();
  if (!/^-?\$?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Amount "${value}" is not a valid dollar amount.`);
  }
  return dollarsToCents(normalized);
}

/**
 * How much of this row has already been paid, in cents.
 *
 * A row with an explicit `amount_paid` value always wins: blank means the
 * import-wide default below, `no` means nothing paid yet, a smaller figure a
 * part payment, anything over the total clamps to the total.
 *
 * `defaultPaid` is what a blank `amount_paid` means. Backfilling payments
 * that already went out wants `true` (paid in full); bringing in invoices
 * that are still owed and ready to send wants `false`.
 */
export function csvRowToPaidCents(
  value: string,
  totalCents: number,
  defaultPaid = true,
): number {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultPaid ? totalCents : 0;
  if (["no", "false", "unpaid", "n"].includes(normalized)) return 0;
  if (["yes", "true", "paid", "y"].includes(normalized)) return totalCents;
  const cents = parseCsvMoney(value);
  if (cents <= 0) throw new Error(`Paid amount "${value}" is not a valid dollar amount.`);
  return Math.min(cents, totalCents);
}
