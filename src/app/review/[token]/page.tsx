import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
import { SEEDED_DISCLAIMER } from "@/lib/invoices";
import { ContractorReviewForm } from "@/components/contractor-review-form";
import { toDateInput } from "@/lib/dates";
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await db.magicLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      invoice: {
        include: {
          contractor: true,
          workspace: true,
          lineItems: { orderBy: { sortOrder: "asc" } },
          attachments: {
            orderBy: { createdAt: "asc" },
            select: { id: true, label: true, filename: true, byteSize: true },
          },
        },
      },
    },
  });

  if (
    !record ||
    record.purpose !== "invoice_review" ||
    record.expiresAt < new Date() ||
    !record.invoice
  ) {
    notFound();
  }

  const invoice = record.invoice;
  const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
  const alreadyDone = invoice.status === "confirmed" || invoice.status === "sent";

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-10">
      <h1 className="text-3xl">
        Hi {invoice.contractor.name.split(" ")[0]} — does this look right?
      </h1>
      <p className="mt-3 text-muted">
        {invoice.workspace.name} asked us to prepare invoice {invoice.number} from their
        books. Amount: <span className="text-ink">{formatMoney(total)}</span>.
      </p>
      <div className="notice mt-5">
        {SEEDED_DISCLAIMER}
      </div>

      {invoice.attachments.length > 0 ? (
        <section className="paper mt-6 space-y-3 rounded-3xl p-6">
          <h2 className="text-xl">Where these numbers came from</h2>
          <p className="text-sm text-muted">
            {invoice.workspace.name} attached their own accounting record for these
            payments. Open it and check this invoice against it before you confirm.
          </p>
          <ul className="space-y-2 text-sm">
            {invoice.attachments.map((a) => (
              <li key={a.id}>
                <a
                  className="underline"
                  href={`/api/invoices/${invoice.id}/attachments/${a.id}?token=${encodeURIComponent(token)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.label ?? a.filename}
                </a>{" "}
                <span className="text-muted">({Math.max(1, Math.round(a.byteSize / 1024))} KB)</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {alreadyDone ? (
        <div className="paper mt-6 rounded-3xl p-6">
          <h2 className="text-2xl">Already confirmed</h2>
          <p className="mt-2 text-muted">
            This invoice is on file
            {invoice.sentAt ? " and was emailed to the client" : ""}. Thank you.
          </p>
        </div>
      ) : (
        <ContractorReviewForm
          token={token}
          workspaceName={invoice.workspace.name}
          invoice={{
            issueDate: toDateInput(invoice.issueDate),
            serviceStart: toDateInput(invoice.serviceStart),
            serviceEnd: toDateInput(invoice.serviceEnd),
            notes: invoice.notes ?? "",
            lineItems: invoice.lineItems,
          }}
        />
      )}
    </div>
  );
}
