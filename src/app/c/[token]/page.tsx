import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
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
    confirmed: Boolean(invoice.confirmedAt),
    sent: Boolean(invoice.sentAt),
  }));
  const grandTotal = invoices.reduce(
    (sum, invoice) => sum + invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps),
    0,
  );
  const outstanding = rows.filter((row) => !row.confirmed).length;

  return (
    <div className="mx-auto min-h-full w-full max-w-2xl px-5 pb-16">
      <h1 className="text-3xl leading-tight">
        Hi {contractor.name.split(" ")[0]} — here are your invoices
      </h1>
      <p className="mt-3 text-muted">
        {contractor.workspace.name} paid you {rows.length}{" "}
        {rows.length === 1 ? "time" : "times"}, {formatMoney(grandTotal)} in total. We have
        written up an invoice for each payment so you have a record of the work, and so
        they do too.
      </p>
      <p className="mt-3 text-muted">
        Check them over. If anything is wrong, fix it before you confirm — these are your
        invoices, and you are the one saying they are right. Once you confirm, we email them
        to {contractor.workspace.name} for you.
      </p>

      <ContractorInvoiceList
        token={token}
        rows={rows}
        outstanding={outstanding}
        grandTotal={formatMoney(grandTotal)}
        clientName={contractor.workspace.name}
        contractorEmail={contractor.email}
      />
    </div>
  );
}
