import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentPanel } from "@/components/attachment-panel";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { formatDate } from "@/lib/dates";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
import { sendForReviewAction, sendToClientAction } from "@/actions/invoices";
import { StatusBadge } from "@/components/status-badge";
import { CopyLinkButton } from "@/components/copy-link-button";
import { InvoiceStatusPanel } from "@/components/invoice-status-panel";


export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; invoiceId: string }>;
}) {
  const { workspaceId, invoiceId } = await params;
  const { user } = await requireWorkspace(workspaceId);
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    include: {
      contractor: true,
      workspace: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "desc" } },
      attachments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, label: true, filename: true, contentType: true, byteSize: true },
      },
    },
  });
  if (!invoice) notFound();

  const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
  const isSent = invoice.status === "sent";

  return (
    <div className="space-y-6">
      <Link href={`/app/w/${workspaceId}/invoices`} className="text-sm text-muted hover:text-ink">
        ← All invoices
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{invoice.number}</p>
              <h2 className="text-3xl">{invoice.contractor.name}</h2>
              <p className="mt-1 text-muted">{formatMoney(total)} · {formatDate(invoice.issueDate)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={invoice.status} />
              {!isSent && (
                <Link
                  href={`/create?edit=${invoice.id}`}
                  aria-label="Edit invoice"
                  className="rounded-lg p-1.5 text-muted transition hover:bg-paper-2 hover:text-ink"
                >
                  <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" />
                    <path d="M9.5 4.5l2 2" />
                  </svg>
                </Link>
              )}
            </div>
          </div>

          {isSent && (
            <div className="notice">
              <p className="font-semibold">This invoice has been sent — editing is locked.</p>
              <p className="mt-1 text-sm">
                Changing an invoice after your client has seen it can cause confusion and disputes.
                Best practice: create a corrected invoice and let your client know to use the new one.
              </p>
              <Link href={`/app/w/${workspaceId}/invoices/new`} className="btn btn-secondary mt-3 inline-flex">
                Create a corrected invoice
              </Link>
            </div>
          )}

          <div className="paper rounded-3xl p-6">
            <ul className="space-y-2">
              {invoice.lineItems.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    {item.description}{" "}
                    <span className="text-muted">
                      ({item.quantity} × {formatMoney(item.unitPrice)})
                    </span>
                  </span>
                  <span>{formatMoney(Math.round(item.quantity * item.unitPrice))}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-5">
          <InvoiceStatusPanel
            workspaceId={workspaceId}
            invoiceId={invoice.id}
            status={invoice.status}
            sentAt={invoice.sentAt}
            createdAt={invoice.createdAt}
            totalCents={total}
            amountPaid={invoice.amountPaid}
          />

          {!isSent ? (
            <div className="paper space-y-4 rounded-3xl p-6">
              <h3 className="text-xl">Send for review</h3>
              <p className="text-sm text-muted">
                Send your contractor a magic link to review and confirm the invoice. They don&rsquo;t
                need an account.
              </p>
              {invoice.contractor.email ? (
                <form action={sendForReviewAction}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <button className="btn btn-primary">Email review link</button>
                </form>
              ) : (
                <p className="text-sm text-amber-900">
                  Add an email on the contractor record to send automatically.
                </p>
              )}
              <CopyLinkButton workspaceId={workspaceId} invoiceId={invoice.id} />
              {invoice.status === "confirmed" ? (
                <form action={sendToClientAction}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <button className="btn btn-secondary">Email invoice to client</button>
                </form>
              ) : null}
              <Link href={`/api/invoices/${invoice.id}/pdf`} className="btn btn-ghost">
                Download PDF
              </Link>
            </div>
          ) : (
            <div className="paper space-y-3 rounded-3xl p-6">
              <h3 className="text-xl">Invoice</h3>
              <Link href={`/invoices/view/${invoice.id}`} className="btn btn-secondary">
                View invoice
              </Link>
              <Link href={`/api/invoices/${invoice.id}/pdf`} className="btn btn-ghost">
                Download PDF
              </Link>
            </div>
          )}

          <AttachmentPanel
            workspaceId={workspaceId}
            invoiceId={invoice.id}
            attachments={invoice.attachments}
          />

          <div className="paper rounded-3xl p-6">
            <h3 className="text-xl">Activity</h3>
            <ol className="mt-4 space-y-3 text-sm">
              {invoice.events.map((event) => (
                <li key={event.id}>
                  <p>{event.message}</p>
                  <p className="text-muted">
                    {event.actorName ?? event.actorEmail ?? "System"} · {formatDate(event.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
