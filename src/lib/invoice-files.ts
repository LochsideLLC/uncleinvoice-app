import { invoiceGrandTotal } from "@/lib/money";

type ManifestInvoice = {
  number: string;
  issueDate: Date;
  amountPaid: number;
  status: string;
  confirmedAt: Date | null;
  taxRateBps: number;
  contractor: { name: string };
  workspace: { name: string };
  lineItems: { quantity: number; unitPrice: number; taxable?: boolean; description: string }[];
};

export function invoicePdfName(number: string, contractorName: string) {
  return `${safeName(`${number} ${contractorName}`)}.pdf`;
}

/**
 * A summary of what is in the bundle, so a bookkeeper can import and match the
 * invoices against payments already on the books without opening every PDF.
 */
export function invoicesManifestCsv(invoices: ManifestInvoice[]) {
  const rows = [
    "invoice_number,issue_date,contractor,bill_to,amount,amount_paid,status,confirmed_at,description",
  ];
  for (const invoice of invoices) {
    const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
    rows.push(
      [
        invoice.number,
        invoice.issueDate.toISOString().slice(0, 10),
        invoice.contractor.name,
        invoice.workspace.name,
        (total / 100).toFixed(2),
        (Math.min(Math.max(0, invoice.amountPaid), total) / 100).toFixed(2),
        invoice.confirmedAt ? "confirmed" : invoice.status,
        invoice.confirmedAt ? invoice.confirmedAt.toISOString() : "",
        invoice.lineItems[0]?.description ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return rows.join("\n") + "\n";
}

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function safeName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
