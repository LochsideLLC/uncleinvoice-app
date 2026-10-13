"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { parseDate } from "@/lib/dates";
import {
  createReviewLink,
  nextInvoiceNumber,
  parseLineItems,
  recordEvent,
  sendForReview,
  sendInvoiceToClient,
} from "@/lib/invoices";
import { hashToken } from "@/lib/crypto";
import { invoiceBusinessData, parseBusinessInvoiceFields } from "@/lib/invoice-fields";
import { invoiceGrandTotal, parseAmountPaid } from "@/lib/money";
import type { ActionState } from "@/actions/auth";
import type { InvoiceStatus } from "@/lib/status";

export async function createInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);
  const contractorId = String(formData.get("contractorId") ?? "");
  const issueDate = parseDate(formData.get("issueDate"));
  const items = parseLineItems(formData);

  if (!contractorId) return { error: "Pick a contractor." };
  if (!issueDate) return { error: "Invoice date is required." };
  if (!items.length) return { error: "Add at least one line item." };
  const business = parseBusinessInvoiceFields(formData, issueDate);
  if ("error" in business) return { error: business.error };

  const contractor = await db.contractor.findFirst({
    where: { id: contractorId, workspaceId },
  });
  if (!contractor) return { error: "That contractor is not on this client." };

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

  const issueDate = parseDate(formData.get("issueDate"));
  const items = parseLineItems(formData);
  if (!issueDate) return { error: "Invoice date is required." };
  if (!items.length) return { error: "Add at least one line item." };
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
  const link = await createReviewLink(invoice.id, email);
  if (invoice.status === "draft") {
    await db.invoice.update({
      where: { id: invoice.id },
      data: { status: "awaiting_review" },
    });
  }
  return { link };
}

export async function sendToClientAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);
  await sendInvoiceToClient(invoiceId, user);
  revalidatePath(`/app/w/${workspaceId}/invoices/${invoiceId}`);
  revalidatePath(`/invoices/view/${invoiceId}`);
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
  if (!items.length) return { error: "Leave at least one line on the invoice." };

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

  const autoSend = formData.get("sendToClient") !== "off";
  if (autoSend) {
    await sendInvoiceToClient(link.invoice.id, {
      email: link.email,
      name: link.invoice.contractor.name,
    });
  }

  redirect(`/review/${token}/done`);
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

export async function markAsPaidAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);

  const amountDollars = parseFloat(String(formData.get("amount") ?? ""));
  if (isNaN(amountDollars) || amountDollars <= 0) return;
  const amountCents = Math.round(amountDollars * 100);

  const paidDate = parseDate(formData.get("paidDate")) ?? new Date();
  const method = String(formData.get("method") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  await db.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid: amountCents },
  });

  const parts: string[] = [`Payment of $${amountDollars.toFixed(2)} received`];
  if (method) parts.push(`via ${method}`);
  parts.push(`on ${paidDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`);
  if (note) parts.push(`(${note})`);
  await recordEvent(invoiceId, "paid", parts.join(" ") + ".", user);

  revalidatePath(`/app/w/${workspaceId}/invoices/${invoiceId}`);
  revalidatePath(`/invoices/view/${invoiceId}`);
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
