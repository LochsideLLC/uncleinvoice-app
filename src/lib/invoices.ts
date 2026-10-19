import { db } from "@/lib/db";
import { createToken, hashToken } from "@/lib/crypto";
import { sendEmail } from "@/lib/mail";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import type { InvoiceStatus } from "@/lib/status";
import { createHostedDeliveryLink } from "@/lib/hosted-invoices";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export type LineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
};

export async function nextInvoiceNumber(workspaceId: string) {
  return db.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
    const number = `${workspace.invoicePrefix}-${String(workspace.nextInvoiceNumber).padStart(4, "0")}`;
    await tx.workspace.update({
      where: { id: workspaceId },
      data: { nextInvoiceNumber: { increment: 1 } },
    });
    return number;
  });
}

/**
 * Move the counter beyond a hand-picked number.
 *
 * A blank number field auto-assigns and claims the counter, but a typed one
 * never touches it — so saving the suggested INV-0001 would leave every
 * later suggestion stuck on INV-0001, failing as a duplicate. After a
 * number is used, advance the counter past it when it matches this
 * workspace's prefix. Numbers from another sequence leave the counter alone.
 */
export async function advanceCounterPast(workspaceId: string, number: string) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { invoicePrefix: true, nextInvoiceNumber: true },
  });
  if (!workspace) return;
  const match = /^(.+)-(\d+)$/.exec(number.trim());
  if (!match || match[1] !== workspace.invoicePrefix) return;
  const used = Number(match[2]);
  if (!Number.isSafeInteger(used) || used < workspace.nextInvoiceNumber) return;
  await db.workspace.update({
    where: { id: workspaceId },
    data: { nextInvoiceNumber: used + 1 },
  });
}

export async function recordEvent(
  invoiceId: string,
  type: string,
  message: string,
  actor?: { email?: string | null; name?: string | null },
) {
  await db.invoiceEvent.create({
    data: {
      invoiceId,
      type,
      message,
      actorEmail: actor?.email ?? null,
      actorName: actor?.name ?? null,
    },
  });
}

export function parseLineItems(formData: FormData): LineInput[] {
  const descriptions = formData.getAll("item_description");
  const quantities = formData.getAll("item_quantity");
  const prices = formData.getAll("item_price");
  const taxed = new Set(formData.getAll("item_taxable").map(String));
  const items: LineInput[] = [];

  for (let i = 0; i < descriptions.length; i += 1) {
    const description = String(descriptions[i] ?? "").trim();
    if (!description) continue;
    const quantity = Number.parseFloat(String(quantities[i] ?? "1")) || 1;
    const dollars = Number.parseFloat(String(prices[i] ?? "0").replace(/[$,\s]/g, ""));
    const unitPrice = Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
    items.push({ description, quantity, unitPrice, taxable: taxed.has(String(i)) });
  }
  return items;
}

export const REVIEW_LINK_DAYS = 7;

// A contractor link has to survive the client forwarding it on, so it lives
// longer than a single-invoice review link.
export const CONTRACTOR_LINK_DAYS = 30;

export async function createReviewLink(invoiceId: string, email: string) {
  const token = createToken();
  await db.magicLink.create({
    data: {
      tokenHash: hashToken(token),
      purpose: "invoice_review",
      email,
      invoiceId,
      // A review link is a bearer token: it opens the invoice with no
      // password. Keep its life short, and contractorConfirmAction marks it
      // used so a confirmed invoice cannot be reopened and edited.
      expiresAt: new Date(Date.now() + REVIEW_LINK_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return `${APP_URL}/review/${token}`;
}

/**
 * One link covering everything a contractor was paid, rather than one link per
 * invoice. A cleaner with 65 payments is never going to open 65 links.
 *
 * The client passes this link to their own contractor however they already
 * reach them, so we never need to hold the contractor's email or phone.
 */
export async function createContractorLink(contractorId: string, email: string) {
  const token = createToken();
  await db.magicLink.create({
    data: {
      tokenHash: hashToken(token),
      purpose: "contractor_invoices",
      email,
      contractorId,
      expiresAt: new Date(Date.now() + CONTRACTOR_LINK_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return `${APP_URL}/c/${token}`;
}

export async function currentContractorLink(contractorId: string, email: string) {
  const existing = await db.magicLink.findFirst({
    where: {
      contractorId,
      purpose: "contractor_invoices",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return null;
  return createContractorLink(contractorId, email);
}

export async function sendForReview(invoiceId: string, actor: { email: string; name: string }) {
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { contractor: true, workspace: true, lineItems: true },
  });
  if (!invoice.contractor.email) {
    throw new Error("This contractor needs an email address before you can send the review link.");
  }

  const link = await createReviewLink(invoice.id, invoice.contractor.email);
  const total = formatMoney(invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps));

  await sendEmail({
    to: invoice.contractor.email,
    subject: `Please review invoice ${invoice.number} for ${invoice.workspace.name}`,
    link,
    text: [
      `Hi ${invoice.contractor.name},`,
      "",
      `${invoice.workspace.name} (and their bookkeeper) prepared a draft invoice for you.`,
      `Invoice ${invoice.number} · ${total}`,
      "",
      "Please review it, edit anything that is wrong, and confirm it. You are responsible for making sure the invoice is accurate.",
      "",
      `Review and confirm: ${link}`,
      "",
      "This link does not require a password.",
    ].join("\n"),
  });

  await db.invoice.update({
    where: { id: invoice.id },
    data: { status: "awaiting_review" satisfies InvoiceStatus },
  });
  await recordEvent(
    invoice.id,
    "sent_for_review",
    `Sent review link to ${invoice.contractor.email}`,
    actor,
  );

  return link;
}

export async function sendInvoiceToClient(
  invoiceId: string,
  actor: { email: string; name: string },
  options?: { to?: string; cc?: string[]; bcc?: string[]; message?: string },
) {
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { contractor: true, workspace: true, lineItems: true },
  });
  if (invoice.status !== "confirmed" && invoice.status !== "sent") {
    throw new Error("The contractor needs to confirm this invoice before it can be sent to the client.");
  }

  const to = options?.to?.trim() || invoice.workspace.email;
  const sender = await db.user.findUnique({
    where: { email: actor.email },
    select: { emailSignature: true },
  });
  const signature = sender?.emailSignature?.trim() || "";
  const message = options?.message?.trim() || "";

  const viewToken = invoice.contractor.userId ? null : createToken();
  if (viewToken) {
    await db.magicLink.create({
      data: {
        tokenHash: hashToken(viewToken),
        purpose: "invoice_view",
        email: invoice.workspace.email,
        invoiceId: invoice.id,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  }
  const hostedPath = invoice.contractor.userId
    ? await createHostedDeliveryLink(invoice.id, invoice.contractor.userId)
    : null;
  const viewLink = hostedPath ? `${APP_URL}${hostedPath}` : `${APP_URL}/invoices/view/${invoice.id}?token=${viewToken}`;
  const pdfLink = hostedPath ? `${APP_URL}/api${hostedPath}/pdf` : `${APP_URL}/api/invoices/${invoice.id}/pdf?token=${viewToken}`;
  const total = formatMoney(invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps));

  await sendEmail({
    to,
    cc: options?.cc,
    bcc: options?.bcc,
    subject: `Invoice ${invoice.number} from ${invoice.contractor.name}`,
    link: viewLink,
    text: [
      ...(message ? [message, ""] : []),
      `Invoice ${invoice.number}`,
      `From: ${invoice.contractor.name}`,
      `To: ${invoice.workspace.name}`,
      `Amount: ${total}`,
      `Date: ${formatDate(invoice.issueDate)}`,
      "",
      invoice.lineItems
        .map(
          (item) =>
            `• ${item.description} — ${item.quantity} × ${formatMoney(item.unitPrice)} = ${formatMoney(Math.round(item.quantity * item.unitPrice))}`,
        )
        .join("\n"),
      "",
      `View / download: ${viewLink}`,
      `PDF: ${pdfLink}`,
      "",
      `Confirmed by ${invoice.confirmedByEmail ?? invoice.contractor.email ?? invoice.contractor.name} on ${formatDate(invoice.confirmedAt)}.`,
      ...(signature ? ["", signature] : []),
    ].join("\n"),
  });

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "sent" satisfies InvoiceStatus,
      sentAt: new Date(),
      sentToEmail: to,
    },
  });
  await recordEvent(
    invoice.id,
    "sent_to_client",
    `Emailed invoice to ${to}`,
    actor,
  );
}

export const SEEDED_DISCLAIMER =
  "This draft was prepared from the client's books (payments, job records, or both). It is a starting point only. You are responsible for reviewing it and correcting anything that is wrong before you confirm.";
