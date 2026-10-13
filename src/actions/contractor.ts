"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { ActionState } from "@/actions/auth";
import type { InvoiceStatus } from "@/lib/status";
import { buildInvoicePdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/mail";
import { formatMoney, invoiceGrandTotal } from "@/lib/money";
import { invoicesManifestCsv, invoicePdfName } from "@/lib/invoice-files";

/**
 * A signed-in contractor confirming the invoices prepared for them.
 *
 * The same submission carries their contact details. Those details were
 * previously a placeholder invented by whoever set the account up, and a made
 * up address has no business being printed on someone else's invoice — the
 * person it belongs to is the only one who actually knows it.
 */
export async function confirmMyInvoicesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (formData.get("attest") !== "on") {
    return { error: "Tick the box to confirm these invoices are accurate." };
  }

  const contractors = await db.contractor.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!contractors.length) return { error: "There are no invoices on this account." };
  const contractorIds = contractors.map((c) => c.id);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const addressLine = String(formData.get("addressLine") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();

  if (!email.includes("@") || email.endsWith(".test")) {
    return { error: "Enter a real email address we can reach you on." };
  }

  await db.contractor.updateMany({
    where: { id: { in: contractorIds } },
    data: {
      email,
      phone: phone || null,
      addressLine: addressLine || null,
      city: city || null,
      region: region || null,
      postalCode: postalCode || null,
    },
  });

  const pending = await db.invoice.findMany({
    where: { contractorId: { in: contractorIds }, confirmedAt: null },
    select: { id: true },
  });
  if (!pending.length) {
    revalidatePath("/app");
    return { ok: true, message: "Your details are saved. These were already confirmed." };
  }

  const confirmedAt = new Date();
  await db.invoice.updateMany({
    where: { id: { in: pending.map((i) => i.id) } },
    data: {
      status: "confirmed" satisfies InvoiceStatus,
      confirmedAt,
      confirmedByEmail: email,
    },
  });
  await db.invoiceEvent.createMany({
    data: pending.map((invoice) => ({
      invoiceId: invoice.id,
      type: "confirmed",
      message: `Contractor signed in and confirmed ${pending.length} ${
        pending.length === 1 ? "invoice" : "invoices"
      } as accurate.`,
      actorEmail: email,
      actorName: user.name,
    })),
  });

  revalidatePath("/app");
  return {
    ok: true,
    message: `Confirmed ${pending.length}. Download them below and email them to your client.`,
  };
}

/**
 * Sends the contractor's confirmed invoices to the client, as attachments,
 * from the contractor.
 *
 * This replaces the contractor downloading a zip, finding it, extracting it,
 * and composing an email with attachments — most of which is awkward or
 * impossible on a phone, which is what these people are using. The client
 * still receives the invoices from the contractor: she caused the send, her
 * address is the reply-to, and it is recorded against every invoice.
 */
export async function sendMyInvoicesToClientAction(): Promise<ActionState> {
  const user = await requireUser();

  const contractors = await db.contractor.findMany({
    where: { userId: user.id },
    include: { workspace: true },
  });
  if (!contractors.length) return { error: "There are no invoices on this account." };

  const sentAt = new Date();
  let total = 0;

  for (const contractor of contractors) {
    const to = contractor.workspace.email;
    if (!to) {
      return {
        error: `${contractor.workspace.name} has no email address on file. Tell them, and they can add it.`,
      };
    }

    const invoices = await db.invoice.findMany({
      where: { contractorId: contractor.id, confirmedAt: { not: null } },
      include: { contractor: true, workspace: true, lineItems: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ issueDate: "asc" }, { number: "asc" }],
    });
    if (!invoices.length) continue;

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
        `Hi,`,
        "",
        `Here are the invoices I should have sent you — ${invoices.length} of them, ${formatMoney(sum)} in total, covering the work you have already paid me for.`,
        "",
        `They are attached as PDFs, with a summary in invoices.csv.`,
        "",
        `Thanks,`,
        contractor.name,
      ].join("\n"),
      attachments,
    });

    await db.invoice.updateMany({
      where: { id: { in: invoices.map((i) => i.id) } },
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
    total += invoices.length;
  }

  if (!total) return { error: "Confirm your invoices first, then you can send them." };

  revalidatePath("/app");
  return {
    ok: true,
    message: `Sent ${total} ${total === 1 ? "invoice" : "invoices"} to your client.`,
  };
}
