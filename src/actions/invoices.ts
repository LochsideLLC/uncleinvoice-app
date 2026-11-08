"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace, listWorkspaces } from "@/lib/workspace";
import { requireUser } from "@/lib/auth";
import { parseDate } from "@/lib/dates";
import {
  createContractorLink,
  createReviewLink,
  createShareLink,
  nextInvoiceNumber,
  parseLineItems,
  recordEvent,
  sendForReview,
  sendInvoiceToClient,
} from "@/lib/invoices";
import { hashToken } from "@/lib/crypto";
import { parsePhoneNumber } from "@/lib/phone";
import { smsConfigured } from "@/lib/sms";
import { sendConfirmedInvoicesToClient } from "@/lib/contractor-send";
import { invoiceBusinessData, parseBusinessInvoiceFields } from "@/lib/invoice-fields";
import { invoiceGrandTotal, parseAmountPaid } from "@/lib/money";
import type { ActionState } from "@/actions/auth";
import type { InvoiceStatus } from "@/lib/status";

import { cappedInteger, consumeDailyLimit } from "@/lib/usage-limits";

export async function createInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const { user, workspace } = await requireWorkspace(workspaceId);
  if (workspace.archivedAt) return { error: "Restore this customer before creating a new invoice." };
  const contractorId = String(formData.get("contractorId") ?? "");
  const issueDate = parseDate(formData.get("issueDate"));
  const items = parseLineItems(formData);

  if (!contractorId) return { error: "Pick a contractor." };
  if (!issueDate) return { error: "Invoice date is required." };
  if (!items.length) {
    return { error: "Describe at least one billed item below — what you did, how many, and the rate." };
  }
  const business = parseBusinessInvoiceFields(formData, issueDate);
  if ("error" in business) return { error: business.error };

  const contractor = await db.contractor.findFirst({
    where: { id: contractorId, workspaceId },
  });
  if (!contractor) return { error: "That contractor is not on this client." };

  const globalAllowed = await consumeDailyLimit({
    operation: "invoice_create",
    scope: "global",
    scopeKey: "all",
    limit: cappedInteger(process.env.INVOICE_GLOBAL_DAILY_LIMIT, 500, 500),
  });
  const userAllowed = globalAllowed && await consumeDailyLimit({
    operation: "invoice_create",
    scope: "user",
    scopeKey: user.id,
    limit: cappedInteger(process.env.INVOICE_PER_USER_DAILY_LIMIT, 50, 50),
  });
  if (!userAllowed) return { error: "Invoice limit reached. Try again tomorrow." };

  const number = await nextInvoiceNumber(workspaceId);
  const amountPaid = parseAmountPaid(formData, invoiceGrandTotal(items, business.taxRateBps));
  const invoice = await db.invoice.create({
    data: {
      workspaceId,
      contractorId,
      number,
      status: "draft" satisfies InvoiceStatus,
      issueDate,
      ...invoiceBusinessData(business),
      amountPaid,
      serviceStart: parseDate(formData.get("serviceStart")),
      serviceEnd: parseDate(formData.get("serviceEnd")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      internalNote: String(formData.get("internalNote") ?? "").trim() || null,
      seededByUserId: user.id,
      lineItems: {
        create: items.map((item, index) => ({ ...item, sortOrder: index })),
      },
    },
  });
  await recordEvent(
    invoice.id,
    "seeded",
    `Seeded invoice ${number} from the books.`,
    user,
  );

  const shouldSend = formData.get("sendNow") === "on";
  if (shouldSend) {
    try {
      await sendForReview(invoice.id, user);
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? `${error.message} The draft was saved.`
            : "Draft saved, but the review email did not send.",
      };
    }
  }

  redirect(`/app/w/${workspaceId}/invoices/${invoice.id}`);
}

export async function updateInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
  });
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status === "sent") {
    return { error: "This invoice has already been sent. Create a new one if you need a correction." };
  }
  if (invoice.onlinePaymentEnabled || await db.invoicePayment.count({ where: { invoiceId } })) {
    return { error: "This invoice has payment activity. Create a correction instead." };
  }

  const issueDate = parseDate(formData.get("issueDate"));
  const items = parseLineItems(formData);
  if (!issueDate) return { error: "Invoice date is required." };
  if (!items.length) {
    return { error: "Describe at least one billed item below — what you did, how many, and the rate." };
  }
  const business = parseBusinessInvoiceFields(formData, issueDate);
  if ("error" in business) return { error: business.error };

  await db.$transaction([
    db.invoiceLineItem.deleteMany({ where: { invoiceId } }),
    db.invoice.update({
      where: { id: invoiceId },
      data: {
        issueDate,
        ...invoiceBusinessData(business),
        amountPaid: parseAmountPaid(formData, invoiceGrandTotal(items, business.taxRateBps)),
        serviceStart: parseDate(formData.get("serviceStart")),
        serviceEnd: parseDate(formData.get("serviceEnd")),
        notes: String(formData.get("notes") ?? "").trim() || null,
        internalNote: String(formData.get("internalNote") ?? "").trim() || null,
        lineItems: {
          create: items.map((item, index) => ({ ...item, sortOrder: index })),
        },
      },
    }),
  ]);
  await recordEvent(invoiceId, "edited", "Bookkeeper updated the draft.", user);
  revalidatePath(`/app/w/${workspaceId}/invoices/${invoiceId}`);
  return { ok: true, message: "Invoice updated." };
}

export async function sendForReviewAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);
  try {
    await sendForReview(invoiceId, user);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Could not send the review link.");
  }
  revalidatePath(`/app/w/${workspaceId}/invoices/${invoiceId}`);
}

export async function copyReviewLinkAction(
  workspaceId: string,
  invoiceId: string,
): Promise<{ link?: string; error?: string }> {
  const { workspace } = await requireWorkspace(workspaceId);
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    include: { contractor: true },
  });
  if (!invoice) return { error: "Invoice not found." };
  const email = invoice.contractor.email ?? workspace.email;
  if (!email) return { error: "Add an email on the contractor record to send automatically." };
  const link = await createReviewLink(invoice.id, email);
  if (invoice.status === "draft") {
    await db.invoice.update({
      where: { id: invoice.id },
      data: { status: "awaiting_review" },
    });
  }
  return { link };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_CHARS = 2000;

function addressList(value: FormDataEntryValue | null): string[] | { error: string } {
  const parts = String(value ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const bad = parts.find((part) => !EMAIL_PATTERN.test(part));
  if (bad) return { error: `"${bad}" is not a valid email address.` };
  return [...new Set(parts)];
}

export async function sendToClientAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);
  await sendInvoiceToClient(invoiceId, user);
  revalidatePath(`/app/w/${workspaceId}/invoices/${invoiceId}`);
  revalidatePath(`/invoices/view/${invoiceId}`);
}

export async function sendToClientComposedAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState | null> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);
  const to = String(formData.get("to") ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(to)) return { error: "Enter a valid To address." };
  const cc = addressList(formData.get("cc"));
  if ("error" in cc) return cc;
  const bcc = addressList(formData.get("bcc"));
  if ("error" in bcc) return bcc;
  const message = String(formData.get("message") ?? "");
  if (message.length > MAX_MESSAGE_CHARS) {
    return { error: "Keep the message under 2,000 characters." };
  }
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { workspaceId: true },
  });
  if (!invoice || invoice.workspaceId !== workspaceId) {
    return { error: "That invoice does not belong here." };
  }

  // Texting needs a real number and the sender's say-so that they may text
  // this person. Checked before anything goes out, so a bad number never
  // leaves the invoice half-sent.
  let textTo: string | undefined;
  if (formData.get("sendText") === "on") {
    if (formData.get("textConsent") !== "on") {
      return { error: "Confirm you have permission to text this customer, or uncheck the text option." };
    }
    const phone = parsePhoneNumber(String(formData.get("textPhone") ?? ""));
    if (!phone.ok) return { error: phone.error };
    if (!phone.e164) return { error: "Enter the mobile number to text, or uncheck the text option." };
    if (!smsConfigured()) return { error: "Text messages are not turned on yet. Uncheck the text option to send by email." };
    textTo = phone.e164;
  }

  let result;
  try {
    result = await sendInvoiceToClient(invoiceId, user, {
      to,
      cc,
      bcc,
      message: message.trim() || undefined,
      // Only the contractor sees the pay checkbox. Anyone else sending leaves
      // the invoice's payment setting exactly as the contractor chose it.
      collectPayment: formData.has("paymentControl") ? formData.get("collectPayment") === "on" : undefined,
      textTo,
      actorUserId: user.id,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The invoice could not be sent." };
  }
  revalidatePath(`/app/w/${workspaceId}/invoices/${invoiceId}`);
  revalidatePath(`/invoices/view/${invoiceId}`);
  if (result.text === "sent") return { ok: true, message: "Emailed and texted." };
  if (typeof result.text === "object") {
    return { ok: true, message: `Emailed. The text was not sent: ${result.text.error}` };
  }
  return { ok: true, message: "Sent." };
}

/** Share link: a real customer link (view, and pay if the invoice allows it), not the signed-in page. */
export async function createShareLinkAction(
  workspaceId: string,
  invoiceId: string,
): Promise<{ url: string } | { error: string }> {
  await requireWorkspace(workspaceId);
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, select: { workspaceId: true } });
  if (!invoice || invoice.workspaceId !== workspaceId) return { error: "That invoice does not belong here." };
  try {
    return { url: await createShareLink(invoiceId) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create a link." };
  }
}

export async function contractorUpdateInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const link = await loadReviewToken(token);
  if ("error" in link) return { error: link.error };

  if (link.invoice.status === "sent") {
    return { error: "This invoice was already sent to the client." };
  }

  const items = parseLineItems(formData);
  if (!items.length) {
    return { error: "Keep at least one billed item on the invoice — what you did, how many, and the rate." };
  }

  await db.$transaction([
    db.invoiceLineItem.deleteMany({ where: { invoiceId: link.invoice.id } }),
    db.invoice.update({
      where: { id: link.invoice.id },
      data: {
        issueDate: parseDate(formData.get("issueDate")) ?? link.invoice.issueDate,
        serviceStart: parseDate(formData.get("serviceStart")),
        serviceEnd: parseDate(formData.get("serviceEnd")),
        notes: String(formData.get("notes") ?? "").trim() || null,
        lineItems: {
          create: items.map((item, index) => ({ ...item, sortOrder: index })),
        },
      },
    }),
  ]);
  await recordEvent(
    link.invoice.id,
    "contractor_edited",
    "Contractor edited the invoice before confirming.",
    { email: link.email, name: link.invoice.contractor.name },
  );
  revalidatePath(`/review/${token}`);
  return { ok: true, message: "Your changes are saved. Confirm when it looks right." };
}

/** Edit one draft through the broader contractor link, with invoice ownership checked server-side. */
export async function contractorBatchUpdateInvoiceAction(
  invoiceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const link = await loadContractorBatchReview(token, invoiceId);
  if ("error" in link) return { error: link.error };
  if (link.invoice.confirmedAt || link.invoice.sentAt) return { error: "This invoice is already confirmed and cannot be edited." };

  const items = parseLineItems(formData);
  if (!items.length) return { error: "Keep at least one billed item on the invoice — what you did, how many, and the rate." };

  await db.$transaction([
    db.invoiceLineItem.deleteMany({ where: { invoiceId } }),
    db.invoice.update({
      where: { id: invoiceId },
      data: {
        issueDate: parseDate(formData.get("issueDate")) ?? link.invoice.issueDate,
        serviceStart: parseDate(formData.get("serviceStart")),
        serviceEnd: parseDate(formData.get("serviceEnd")),
        notes: String(formData.get("notes") ?? "").trim() || null,
        lineItems: { create: items.map((item, index) => ({ ...item, sortOrder: index })) },
      },
    }),
  ]);
  await recordEvent(invoiceId, "contractor_edited", "Contractor edited the invoice before confirming.", {
    email: link.email,
    name: link.contractor.name,
  });
  revalidatePath(`/c/${token}`);
  revalidatePath(`/c/${token}/review/${invoiceId}`);
  return { ok: true, message: "Your changes are saved. Confirm when it looks right." };
}

/** Confirms one reviewed draft without sending it; sending is a separate package step. */
export async function contractorBatchConfirmInvoiceAction(
  invoiceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const link = await loadContractorBatchReview(token, invoiceId);
  if ("error" in link) return { error: link.error };
  if (formData.get("attest") !== "on") return { error: "Check the box to confirm this invoice is accurate." };
  if (link.invoice.confirmedAt || link.invoice.sentAt) return { error: "This invoice has already been confirmed." };

  const items = parseLineItems(formData);
  if (!items.length) return { error: "Keep at least one billed item on the invoice — what you did, how many, and the rate." };
  const confirmedAt = new Date();
  const email = link.contractor.email ?? link.email;
  const updated = await db.$transaction(async (tx) => {
    const changed = await tx.invoice.updateMany({
      where: { id: invoiceId, contractorId: link.contractor.id, confirmedAt: null, sentAt: null },
      data: { status: "confirmed" satisfies InvoiceStatus, confirmedAt, confirmedByEmail: email },
    });
    if (changed.count !== 1) return false;
    await tx.invoiceLineItem.deleteMany({ where: { invoiceId } });
    await tx.invoiceLineItem.createMany({ data: items.map((item, index) => ({ invoiceId, ...item, sortOrder: index })) });
    await tx.invoiceEvent.create({
      data: {
        invoiceId,
        type: "confirmed",
        message: "Contractor confirmed this invoice is accurate.",
        actorEmail: email,
        actorName: link.contractor.name,
      },
    });
    return true;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (!updated) return { error: "This invoice was already confirmed. Reload the page to see its current state." };

  revalidatePath(`/c/${token}`);
  redirect(`/c/${token}`);
}

export async function contractorConfirmAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const attested = formData.get("attest") === "on";
  if (!attested) {
    return { error: "Check the box to confirm this invoice is accurate." };
  }

  const link = await loadReviewToken(token);
  if ("error" in link) return { error: link.error };
  if (link.invoice.status === "sent") {
    return { error: "This invoice was already sent." };
  }

  // Persist any last-minute edits sitting on the same form.
  const items = parseLineItems(formData);
  if (items.length) {
    await db.$transaction([
      db.invoiceLineItem.deleteMany({ where: { invoiceId: link.invoice.id } }),
      db.invoice.update({
        where: { id: link.invoice.id },
        data: {
          issueDate: parseDate(formData.get("issueDate")) ?? link.invoice.issueDate,
          serviceStart: parseDate(formData.get("serviceStart")),
          serviceEnd: parseDate(formData.get("serviceEnd")),
          notes: String(formData.get("notes") ?? "").trim() || null,
          lineItems: {
            create: items.map((item, index) => ({ ...item, sortOrder: index })),
          },
        },
      }),
    ]);
  }

  await db.invoice.update({
    where: { id: link.invoice.id },
    data: {
      status: "confirmed" satisfies InvoiceStatus,
      confirmedAt: new Date(),
      confirmedByEmail: link.email,
    },
  });
  // Spend the link. The done page and the PDF download look the token up
  // themselves, so the contractor still gets their copy; what this stops is
  // a confirmed invoice being reopened and edited by anyone holding the URL.
  await db.magicLink.updateMany({
    where: { tokenHash: hashToken(token), purpose: "invoice_review" },
    data: { usedAt: new Date() },
  });
  await recordEvent(
    link.invoice.id,
    "confirmed",
    "Contractor confirmed the invoice is accurate.",
    { email: link.email, name: link.invoice.contractor.name },
  );

  // Confirmation records the contractor's assertion. Sending is a separate
  // step so the recipient, copied bookkeeper, and exact package can be reviewed.
  const contractorLink = await createContractorLink(link.invoice.contractor.id, link.email);
  redirect(contractorLink);
}

export async function markAsSentAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);
  const sentAt = parseDate(formData.get("sentDate")) ?? new Date();
  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "sent" satisfies InvoiceStatus, sentAt },
  });
  await recordEvent(invoiceId, "sent", "Marked as sent to client.", user);
  revalidatePath(`/app/w/${workspaceId}/invoices/${invoiceId}`);
}

async function recordManualPayment(formData: FormData): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);

  const paidDate = parseDate(formData.get("paidDate")) ?? new Date();
  const method = String(formData.get("method") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const nonce = String(formData.get("paymentNonce") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(nonce)) return { error: "Refresh the invoice and try again." };
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    include: { lineItems: true },
  });
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.onlinePaymentEnabled) return { error: "Record this payment through the online payment record." };
  const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
  const balance = Math.max(0, total - invoice.amountPaid);
  if (!balance) return { error: "This invoice is already paid." };
  const entered = parseFloat(String(formData.get("amount") ?? ""));
  const amountCents = Number.isFinite(entered) && entered > 0
    ? Math.min(balance, Math.round(entered * 100))
    : balance;
  const externalReference = `manual:${invoiceId}:${nonce}`;
  const amountDollars = amountCents / 100;
  const parts: string[] = [`Manual payment of $${amountDollars.toFixed(2)} recorded`];
  if (method) parts.push(`via ${method}`);
  parts.push(`on ${paidDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`);
  if (note) parts.push(`(${note})`);
  try {
    await db.$transaction(async (tx) => {
      await tx.invoicePayment.create({
        data: {
          invoiceId,
          source: "manual",
          status: "succeeded",
          amount: amountCents,
          currency: invoice.currency,
          paymentMethodCategory: method || "manual",
          externalReference,
          succeededAt: paidDate,
        },
      });
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: { increment: amountCents } },
      });
      await tx.invoiceEvent.create({
        data: {
          invoiceId,
          type: "payment_manually_recorded",
          source: "manual",
          dedupeKey: externalReference,
          message: parts.join(" ") + ".",
          actorEmail: user.email,
          actorName: user.name,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }

  revalidatePath(`/app/w/${workspaceId}/invoices/${invoiceId}`);
  revalidatePath(`/invoices/view/${invoiceId}`);
  return { ok: true, message: "Payment saved." };
}

export async function markAsPaidAction(formData: FormData): Promise<void> {
  await recordManualPayment(formData);
}

export async function markAsPaidWithFeedbackAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  return recordManualPayment(formData);
}

async function loadReviewToken(token: string) {
  if (!token) return { error: "Missing review link." };
  const record = await db.magicLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      invoice: { include: { contractor: true, workspace: true, lineItems: true } },
    },
  });
  if (
    !record ||
    record.purpose !== "invoice_review" ||
    record.usedAt ||
    record.expiresAt < new Date() ||
    !record.invoice
  ) {
    return { error: "This review link is invalid or has expired." };
  }
  return { email: record.email, invoice: record.invoice };
}

async function loadContractorBatchReview(token: string, invoiceId: string) {
  if (!token) return { error: "Missing contractor link." };
  const record = await db.magicLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { contractor: { include: { workspace: true } } },
  });
  if (
    !record ||
    record.purpose !== "contractor_invoices" ||
    record.expiresAt < new Date() ||
    !record.contractor
  ) return { error: "This contractor link is invalid or has expired." };

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, contractorId: record.contractor.id, workspaceId: record.contractor.workspaceId },
    include: { contractor: true, workspace: true, lineItems: true },
  });
  if (!invoice) return { error: "That invoice is not part of this contractor link." };
  return { email: record.email, contractor: record.contractor, invoice };
}

/**
 * Sends the confirmed invoices behind a contractor link to the client, from
 * the contractor, with the PDFs attached.
 *
 * The contractor never handles a file. Downloading a zip, finding it,
 * extracting it and attaching the contents to an email is the step this
 * existed to avoid — on a phone it is often not possible at all.
 */
export async function contractorBatchSendInvoicesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  if (formData.get("confirmPackage") !== "on") return { error: "Confirm the recipient and selected invoices before sending." };
  const invoiceIds = formData.getAll("invoiceId").map((value) => String(value).trim()).filter(Boolean);
  if (!invoiceIds.length) return { error: "Select at least one confirmed invoice." };
  const cc = String(formData.get("cc") ?? "").trim().toLowerCase();
  if (cc && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cc)) return { error: "Enter a valid bookkeeper email or leave the copy field blank." };

  const record = await db.magicLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { contractor: { include: { workspace: true } } },
  });
  if (
    !record ||
    record.purpose !== "contractor_invoices" ||
    record.expiresAt < new Date() ||
    !record.contractor
  ) {
    return { error: "This link is invalid or has expired." };
  }
  if (cc && cc === record.contractor.workspace.email?.trim().toLowerCase()) {
    return { error: "The bookkeeper copy must be a different address from the client." };
  }

  const result = await sendConfirmedInvoicesToClient(record.contractor.id, invoiceIds, cc || undefined);
  if ("error" in result) return { error: result.error };

  revalidatePath(`/c/${token}`);
  return {
    ok: true,
    message: `The email provider accepted ${result.sent} ${result.sent === 1 ? "invoice" : "invoices"} for ${record.contractor.workspace.name}.`,
  };
}

/**
 * Mints the link a client hands to one of their contractors.
 * Returns the URL in `message` so the caller can show and copy it.
 */
export async function contractorLinkAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const contractorId = String(formData.get("contractorId") ?? "");
  await requireWorkspace(workspaceId);

  const contractor = await db.contractor.findFirst({
    where: { id: contractorId, workspaceId },
  });
  if (!contractor) return { error: "That contractor is not on this client." };

  const link = await createContractorLink(contractor.id, contractor.email ?? "");
  return { ok: true, message: link };
}

/**
 * Deletes one invoice and its share links. Supporting documents, line items,
 * events, and login tokens cascade in the database. Invoices with payment
 * activity (money recorded, payment rows, or checkout attempts) are refused:
 * deleting those would rewrite financial history.
 */
export async function deleteInvoiceAction(
  workspaceId: string,
  invoiceId: string,
): Promise<ActionState> {
  await requireWorkspace(workspaceId);
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    include: { payments: { take: 1 }, checkoutAttempts: { take: 1 } },
  });
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.amountPaid > 0 || invoice.payments.length > 0 || invoice.checkoutAttempts.length > 0) {
    return { error: "This invoice has payment activity, so it can't be deleted." };
  }
  await db.$transaction([
    db.hostedInvoiceAccess.deleteMany({ where: { invoiceId } }),
    db.invoice.delete({ where: { id: invoiceId } }),
  ]);
  revalidatePath("/app");
  revalidatePath(`/app/w/${workspaceId}/invoices`);
  return { ok: true };
}

/**
 * Deletes a batch of the caller's own invoices. Same payment-activity guard
 * as the single delete, applied per invoice: blocked ones are skipped and
 * reported, never silently dropped.
 */
export async function bulkDeleteInvoicesAction(invoiceIds: string[]): Promise<ActionState> {
  const user = await requireUser();
  const ids = [...new Set(invoiceIds.filter((id) => typeof id === "string" && id.length > 0))];
  if (!ids.length) return { error: "Select at least one invoice." };
  const maxBatch = 50;
  if (ids.length > maxBatch) {
    return { error: `Delete up to ${maxBatch} invoices at a time.` };
  }
  const wsIds = (await listWorkspaces(user.id, true)).map((m) => m.workspace.id);
  const invoices = await db.invoice.findMany({
    where: { id: { in: ids }, workspaceId: { in: wsIds } },
    include: { payments: { take: 1 }, checkoutAttempts: { take: 1 } },
  });
  const deletable = invoices.filter(
    (invoice) => invoice.amountPaid === 0 && invoice.payments.length === 0 && invoice.checkoutAttempts.length === 0,
  );
  const skipped = ids.length - deletable.length;
  if (deletable.length > 0) {
    const deletableIds = deletable.map((invoice) => invoice.id);
    await db.$transaction([
      db.hostedInvoiceAccess.deleteMany({ where: { invoiceId: { in: deletableIds } } }),
      db.invoice.deleteMany({ where: { id: { in: deletableIds } } }),
    ]);
  }
  revalidatePath("/app");
  if (!deletable.length) {
    return { error: "None of the selected invoices can be deleted (payment activity)." };
  }
  const message = `Deleted ${deletable.length} ${deletable.length === 1 ? "invoice" : "invoices"}.`;
  return skipped > 0
    ? { ok: true, message: `${message} Skipped ${skipped} with payment activity.` }
    : { ok: true, message };
}
