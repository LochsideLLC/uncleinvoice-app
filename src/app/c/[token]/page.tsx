import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { formatMoney, invoiceGrandTotal, paymentState } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { ContractorInvoiceList } from "@/components/contractor-invoice-list";

export const metadata = { title: "Your invoices — Uncle Invoice" };

export default async function ContractorInvoicesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await db.magicLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      contractor: { include: { workspace: true } },
    },
  });

  if (
    !record ||
    record.purpose !== "contractor_invoices" ||
    record.expiresAt < new Date() ||
    !record.contractor
  ) {
    notFound();
  }

  const contractor = record.contractor;
  const invoices = await db.invoice.findMany({
    where: { contractorId: contractor.id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    orderBy: { issueDate: "asc" },
  });

  const rows = invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    date: formatDate(invoice.issueDate),
    description: invoice.lineItems[0]?.description ?? "Services",
    total: formatMoney(invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps)),
    cents: invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps),
    payment: paymentState(invoice.amountPaid, invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps)),
    confirmed: Boolean(invoice.confirmedAt),
    sent: Boolean(invoice.sentAt),
  }));
  const grandTotal = rows.reduce((sum, row) => sum + row.cents, 0);
  return (
    <div className="mx-auto min-h-full w-full max-w-2xl px-5 pb-16">
      <h1 className="text-3xl leading-tight">
        Hi {contractor.name.split(" ")[0]} — here are your invoices
      </h1>
      <p className="mt-3 text-muted">
        {contractor.workspace.name} prepared {rows.length} invoice {rows.length === 1 ? "draft" : "drafts"} from its records, totalling {formatMoney(grandTotal)}. Check each invoice. If anything is wrong, fix it before you confirm — these are your invoices, and you are the one saying they are right.
      </p>
      <p className="mt-2 text-sm text-muted">Payment status and invoice status are separate. Confirming paperwork does not change whether you have been paid.</p>

      <ContractorInvoiceList
        token={token}
        rows={rows}
        clientName={contractor.workspace.name}
        clientEmail={contractor.workspace.email}
      />
    </div>
  );
}
