import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { buildInvoicePdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/mail";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
import { invoicesManifestCsv, invoicePdfName } from "@/lib/invoice-files";
import type { InvoiceStatus } from "@/lib/status";
import { applyInvoiceIssuerProfile, getInvoiceIssuerProfile } from "@/lib/invoice-issuer";

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
  invoiceIds?: string[],
  cc?: string,
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

  // The outbox stores text only. Without a configured provider, PDFs would be
  // lost while the UI claimed they had been sent. Fail closed before creating
  // an outbox row or changing invoice state.
  if (!process.env.RESEND_API_KEY || process.env.OUTBOUND_EMAIL_ENABLED?.toLowerCase() !== "true") {
    return { error: "Email sending is not configured. No invoices were sent or marked as sent." };
  }

  const requestedIds = invoiceIds ? [...new Set(invoiceIds.filter(Boolean))] : null;
  if (requestedIds && requestedIds.length !== invoiceIds!.length) {
    return { error: "An invoice was selected more than once." };
  }
  if (requestedIds && (requestedIds.length === 0 || requestedIds.length > 50)) {
    return { error: "Choose between 1 and 50 invoices for each email." };
  }

  if (cc && (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cc) || cc.trim().toLowerCase() === to.trim().toLowerCase())) {
    return { error: "Enter a valid copy address that is different from the client email." };
  }

  const attemptIds = requestedIds ?? (await db.invoice.findMany({
    where: { contractorId: contractor.id, confirmedAt: { not: null }, sentAt: null },
    select: { id: true },
  })).map((invoice) => invoice.id);
  if (!attemptIds.length || attemptIds.length > 50) return { error: "Choose between 1 and 50 confirmed, unsent invoices." };
  const packageId = hashToken(JSON.stringify({ contractorId, to: to.toLowerCase(), cc: cc?.toLowerCase() ?? "", invoiceIds: [...attemptIds].sort() }));
  const attemptKeys = attemptIds.map((id) => `contractor-email:${id}`);

  const existingAttempts = await db.invoiceEvent.findMany({
    where: { dedupeKey: { in: attemptKeys } },
    select: { id: true, invoiceId: true, dedupeKey: true, metadata: true },
  });
  if (existingAttempts.length) {
    const metadata = existingAttempts[0]?.metadata as { packageId?: string; status?: string; invoiceIds?: string[] } | null;
    if (
      existingAttempts.length === attemptIds.length &&
      metadata?.packageId === packageId &&
      metadata.status === "accepted" &&
      existingAttempts.every((event) => (event.metadata as { packageId?: string } | null)?.packageId === packageId)
    ) {
      const sentAt = new Date();
      await db.invoice.updateMany({
        where: { id: { in: attemptIds }, contractorId: contractor.id, confirmedAt: { not: null }, sentAt: null },
        data: { status: "sent" satisfies InvoiceStatus, sentAt, sentToEmail: to },
      });
      return { sent: attemptIds.length };
    }
    return { error: "A send attempt already exists for one or more selected invoices. Check with the client before trying again." };
  }

  const invoiceRows = await db.invoice.findMany({
    where: {
      contractorId: contractor.id,
      confirmedAt: { not: null },
      sentAt: null,
      ...(requestedIds ? { id: { in: requestedIds } } : {}),
    },
    include: {
      contractor: true,
      workspace: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ issueDate: "asc" }, { number: "asc" }],
  });
  if (!invoiceRows.length) {
    return { error: "No confirmed, unsent invoices were selected." };
  }
  if (requestedIds && invoiceRows.length !== requestedIds.length) {
    return { error: "One or more selected invoices are not confirmed, were already sent, or are not yours." };
  }
  if (!requestedIds && invoiceRows.length !== attemptIds.length) return { error: "The invoice list changed. Reload before sending." };

  const issuerProfile = await getInvoiceIssuerProfile(contractor.userId);
  const invoices = invoiceRows.map((invoice) => applyInvoiceIssuerProfile(invoice, issuerProfile));
  const senderName = issuerProfile?.businessName?.trim() || issuerProfile?.name || contractor.name;
  const senderEmail = issuerProfile?.businessEmail?.trim() || issuerProfile?.email || contractor.email;

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

  const attemptMetadata = {
    packageId,
    status: "pending",
    invoiceIds: attemptIds,
    to,
    cc: cc ?? null,
  };
  try {
    await db.invoiceEvent.createMany({
      data: invoices.map((invoice) => ({
        invoiceId: invoice.id,
        type: "contractor_send_attempt",
        message: "An email send attempt is in progress or its result is unknown.",
        actorEmail: contractor.email,
        actorName: contractor.name,
        dedupeKey: `contractor-email:${invoice.id}`,
        metadata: attemptMetadata,
      })),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A send attempt already exists for one or more selected invoices. Check with the client before trying again." };
    }
    throw error;
  }

  const ccRecipients = cc ? [cc] : undefined;
  try {
    await sendEmail({
      to,
      cc: ccRecipients,
      replyTo: senderEmail ?? undefined,
      subject: `Invoices from ${senderName}`,
      text: [
        "Hi,",
        "",
        `Here are ${invoices.length} confirmed invoice${invoices.length === 1 ? "" : "s"}. The total is ${formatMoney(sum)}.`,
        "",
        "The PDFs and an invoice summary are attached.",
        "",
        "Thanks,",
        senderName,
      ].join("\n"),
      attachments,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed.";
    await db.invoiceEvent.updateMany({
      where: { dedupeKey: { in: attemptKeys }, type: "contractor_send_attempt" },
      data: {
        type: "contractor_send_unknown",
        message: `Email attempt did not get a confirmed result: ${message.slice(0, 250)}`,
        metadata: { ...attemptMetadata, status: "unknown", error: message.slice(0, 250) },
      },
    });
    return { error: `${message} No invoices were marked as sent. Check with the client before trying again.` };
  }

  await db.invoiceEvent.updateMany({
    where: { dedupeKey: { in: attemptKeys }, type: "contractor_send_attempt" },
    data: {
      type: "contractor_send_accepted",
      message: `The email provider accepted this package for ${to}.`,
      metadata: { ...attemptMetadata, status: "accepted", acceptedAt: new Date().toISOString() },
    },
  });

  const sentAt = new Date();
  await db.invoice.updateMany({
    where: { id: { in: invoices.map((invoice) => invoice.id) }, contractorId: contractor.id, confirmedAt: { not: null }, sentAt: null },
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
