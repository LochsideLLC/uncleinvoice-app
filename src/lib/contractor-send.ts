import { db } from "@/lib/db";
import { buildInvoicePdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/mail";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
import { invoicesManifestCsv, invoicePdfName } from "@/lib/invoice-files";
import type { InvoiceStatus } from "@/lib/status";

/**
 * Emails one contractor's confirmed invoices to the client they worked for.
 *
 * Shared by both ways a contractor can reach their invoices: the link their
 * client passes them, and a signed-in account. The two must produce the same
 * email, the same attachments and the same audit trail, so they call this
 * rather than each building their own.
 */
export async function sendConfirmedInvoicesToClient(
  contractorId: string,
): Promise<{ sent: number } | { error: string }> {
  const contractor = await db.contractor.findUnique({
    where: { id: contractorId },
    include: { workspace: true },
  });
  if (!contractor) return { error: "That contractor no longer exists." };

  const to = contractor.workspace.email;
  if (!to) {
    return {
      error: `${contractor.workspace.name} has no email address on file. Tell them, and they can add it.`,
    };
  }

  const invoices = await db.invoice.findMany({
    where: { contractorId: contractor.id, confirmedAt: { not: null } },
    include: {
      contractor: true,
      workspace: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ issueDate: "asc" }, { number: "asc" }],
  });
  if (!invoices.length) {
    return { error: "Confirm your invoices first, then you can send them." };
  }

  const attachments = [];
  for (const invoice of invoices) {
    attachments.push({
      filename: invoicePdfName(invoice.number, invoice.contractor.name),
      content: await buildInvoicePdf(invoice),
    });
  }
  attachments.push({
    filename: "invoices.csv",
    content: new TextEncoder().encode(invoicesManifestCsv(invoices)),
  });

  const sum = invoices.reduce(
    (acc, invoice) => acc + invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps),
    0,
  );

  await sendEmail({
    to,
    replyTo: contractor.email ?? undefined,
    subject: `Invoices from ${contractor.name}`,
    text: [
      "Hi,",
      "",
      `Here are the invoices I should have sent you — ${invoices.length} of them, ${formatMoney(sum)} in total, covering the work you have already paid me for.`,
      "",
      "They are attached as PDFs, with a summary in invoices.csv.",
      "",
      "Thanks,",
      contractor.name,
    ].join("\n"),
    attachments,
  });

  const sentAt = new Date();
  await db.invoice.updateMany({
    where: { id: { in: invoices.map((invoice) => invoice.id) } },
    data: { status: "sent" satisfies InvoiceStatus, sentAt, sentToEmail: to },
  });
  await db.invoiceEvent.createMany({
    data: invoices.map((invoice) => ({
      invoiceId: invoice.id,
      type: "sent_to_client",
      message: `Contractor sent ${invoices.length} ${
        invoices.length === 1 ? "invoice" : "invoices"
      } to ${to}.`,
      actorEmail: contractor.email,
      actorName: contractor.name,
    })),
  });

  return { sent: invoices.length };
}
