import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
import { formatDate, toDateInput } from "@/lib/dates";
import { ContractorReviewForm } from "@/components/contractor-review-form";
import { SEEDED_DISCLAIMER } from "@/lib/invoices";

export default async function ContractorInvoiceReviewPage({
  params,
}: {
  params: Promise<{ token: string; invoiceId: string }>;
}) {
  const { token, invoiceId } = await params;
  const link = await db.magicLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { contractor: { include: { workspace: true } } },
  });
  if (!link || link.purpose !== "contractor_invoices" || link.expiresAt < new Date() || !link.contractor) notFound();

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, contractorId: link.contractor.id, workspaceId: link.contractor.workspaceId },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) notFound();

  const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
  const done = Boolean(invoice.confirmedAt || invoice.sentAt);

  return (
    <main className="mx-auto min-h-full w-full max-w-xl px-5 pb-12">
      <Link href={`/c/${token}`} className="text-sm text-muted underline underline-offset-4">← All your invoices</Link>
      <h1 className="mt-4 text-3xl">Review invoice {invoice.number}</h1>
      <p className="mt-2 text-muted">{link.contractor.workspace.name} · {formatDate(invoice.issueDate)} · {formatMoney(total)}</p>
      <p className="mt-3 text-sm text-muted">This invoice was prepared from the payment record. Check it, correct anything that is wrong, then confirm it as your invoice.</p>
      <div className="notice mt-4">{SEEDED_DISCLAIMER}</div>
      {done ? (
        <section className="paper mt-5 rounded-2xl p-5">
          <h2 className="text-xl">Already confirmed</h2>
          <p className="mt-2 text-muted">This invoice is on file{invoice.sentAt ? " and was sent to the client" : ""}. It cannot be changed here.</p>
        </section>
      ) : (
        <ContractorReviewForm
          token={token}
          workspaceName={link.contractor.workspace.name}
          batchInvoiceId={invoice.id}
          invoice={{
            issueDate: toDateInput(invoice.issueDate),
            serviceStart: toDateInput(invoice.serviceStart),
            serviceEnd: toDateInput(invoice.serviceEnd),
            notes: invoice.notes ?? "",
            lineItems: invoice.lineItems,
          }}
        />
      )}
    </main>
  );
}
