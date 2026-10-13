"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { createToken, hashToken } from "@/lib/crypto";
import { parseDate } from "@/lib/dates";
import { advanceCounterPast, nextInvoiceNumber, parseLineItems, recordEvent } from "@/lib/invoices";
import { invoiceBusinessData, parseBusinessInvoiceFields } from "@/lib/invoice-fields";
import { invoiceGrandTotal, parseAmountPaid } from "@/lib/money";
import type { ActionState } from "@/actions/auth";
import type { InvoiceStatus } from "@/lib/status";

const GUEST_EMAIL = "guest@uncleinvoice.com";

const fields = z
  .object({
    fromName: z.string().trim(),
    fromContactName: z.string().trim(),
    fromEmail: z.union([z.literal(""), z.string().email()]),
    billToName: z.string().trim().min(1, "Add the company this is billed to."),
    billToContactName: z.string().trim(),
    billToEmail: z.string().email("The client needs an email"),
  })
  .refine((value) => value.fromName || value.fromContactName, {
    message: "Add your name or company.",
  });

export async function createPublicInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = fields.safeParse({
    fromName: formData.get("fromName"),
    fromContactName: formData.get("fromContactName"),
    fromEmail: String(formData.get("fromEmail") ?? "").trim().toLowerCase(),
    billToName: formData.get("billToName"),
    billToContactName: formData.get("billToContactName"),
    billToEmail: String(formData.get("billToEmail") ?? "").trim().toLowerCase(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const issueDate = parseDate(formData.get("issueDate"));
  const items = parseLineItems(formData);
  if (!issueDate) return { error: "Invoice date is required." };
  if (!items.length) return { error: "Add at least one line." };
  const business = parseBusinessInvoiceFields(formData, issueDate);
  if ("error" in business) return { error: business.error };
  if (items.some((item) => item.taxable) && !business.taxRateBps) {
    return { error: "You marked a line for tax. Enter the tax rate." };
  }

  const user = await getSessionUser();
  const existingId = String(formData.get("invoiceId") ?? "").trim();
  const viewToken = String(formData.get("viewToken") ?? "").trim();
  const owner =
    user ??
    (await db.user.upsert({
      where: { email: GUEST_EMAIL },
      update: {},
      create: { email: GUEST_EMAIL, name: "Uncle Invoice" },
    }));

  let existingInvoice = existingId
    ? await db.invoice.findUnique({
        where: { id: existingId },
        include: { tokens: true },
      })
    : null;
  if (existingId && !existingInvoice) {
    return { error: "That invoice could not be found." };
  }
  if (existingInvoice) {
    const userCanEdit = user
      ? Boolean(
          await db.workspaceMember.findUnique({
            where: {
              workspaceId_userId: { workspaceId: existingInvoice.workspaceId, userId: user.id },
            },
          }),
        )
      : false;
    const tokenOk =
      Boolean(viewToken) &&
      existingInvoice.tokens.some(
        (record) =>
          record.purpose === "invoice_view" &&
          record.tokenHash === hashToken(viewToken) &&
          record.expiresAt >= new Date(),
      );
    if (!userCanEdit && !tokenOk) {
      return { error: "You cannot edit this invoice." };
    }
  }

  let workspace = existingInvoice
    ? await db.workspace.findUniqueOrThrow({ where: { id: existingInvoice.workspaceId } })
    : user
      ? await db.workspace.findFirst({
          where: {
            email: parsed.data.billToEmail,
            members: { some: { userId: user.id } },
          },
        })
      : null;

  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        name: parsed.data.billToName || parsed.data.billToContactName,
        email: parsed.data.billToEmail,
        phone: business.billToPhone,
        addressLine: business.billToAddressLine,
        city: business.billToCity,
        region: business.billToRegion,
        postalCode: business.billToPostalCode,
        taxId: business.billToTaxId,
        createdById: owner.id,
        members: user ? { create: { userId: user.id, role: "owner" } } : undefined,
      },
    });
  } else {
    workspace = await db.workspace.update({
      where: { id: workspace.id },
      data: {
        name: parsed.data.billToName || parsed.data.billToContactName,
        email: parsed.data.billToEmail,
        phone: business.billToPhone ?? workspace.phone,
        addressLine: business.billToAddressLine ?? workspace.addressLine,
        city: business.billToCity ?? workspace.city,
        region: business.billToRegion ?? workspace.region,
        postalCode: business.billToPostalCode ?? workspace.postalCode,
        taxId: business.billToTaxId ?? workspace.taxId,
      },
    });
  }

  const fromEmail = parsed.data.fromEmail || null;
  let contractor = fromEmail
    ? await db.contractor.findFirst({
        where: { workspaceId: workspace.id, email: fromEmail },
      })
    : await db.contractor.findFirst({
        where: {
          workspaceId: workspace.id,
          name: parsed.data.fromName || parsed.data.fromContactName,
        },
      });

  const contractorFields = {
    name: parsed.data.fromName || parsed.data.fromContactName,
    email: fromEmail,
    phone: business.fromPhone,
    addressLine: business.fromAddressLine,
    city: business.fromCity,
    region: business.fromRegion,
    postalCode: business.fromPostalCode,
    taxId: business.fromTaxId,
  };

  if (!contractor) {
    contractor = await db.contractor.create({
      data: {
        workspaceId: workspace.id,
        ...contractorFields,
      },
    });
  } else {
    contractor = await db.contractor.update({
      where: { id: contractor.id },
      data: contractorFields,
    });
  }

  const requestedNumber = String(formData.get("invoiceNumber") ?? "").trim();
  const total = invoiceGrandTotal(items, business.taxRateBps);
  const amountPaid = parseAmountPaid(formData, total);

  if (existingInvoice) {
    const number = requestedNumber || existingInvoice.number;
    if (number !== existingInvoice.number) {
      const taken = await db.invoice.findUnique({
        where: { workspaceId_number: { workspaceId: existingInvoice.workspaceId, number } },
      });
      if (taken) return { error: "That invoice number is already used." };
    }
    await db.invoiceLineItem.deleteMany({ where: { invoiceId: existingInvoice.id } });
    await db.invoice.update({
      where: { id: existingInvoice.id },
      data: {
        contractorId: contractor.id,
        number,
        issueDate,
        ...invoiceBusinessData(business),
        amountPaid,
        notes: String(formData.get("notes") ?? "").trim() || null,
        confirmedByEmail: fromEmail,
        lineItems: {
          create: items.map((item, index) => ({ ...item, sortOrder: index })),
        },
      },
    });
    // A renumbered invoice claims the counter just like a fresh typed one.
    if (number !== existingInvoice.number) {
      await advanceCounterPast(existingInvoice.workspaceId, number);
    }
    await recordEvent(
      existingInvoice.id,
      "edited",
      "Invoice edited from the preview.",
      user ?? { email: fromEmail, name: parsed.data.fromContactName || parsed.data.fromName },
    );
    redirect(
      viewToken
        ? `/invoices/view/${existingInvoice.id}?token=${viewToken}`
        : `/invoices/view/${existingInvoice.id}`,
    );
  }

  const number = requestedNumber || (await nextInvoiceNumber(workspace.id));
  if (requestedNumber) {
    const taken = await db.invoice.findUnique({
      where: { workspaceId_number: { workspaceId: workspace.id, number } },
    });
    if (taken) return { error: "That invoice number is already used." };
  }
  const invoice = await db.invoice.create({
    data: {
      workspaceId: workspace.id,
      contractorId: contractor.id,
      number,
      status: "confirmed" satisfies InvoiceStatus,
      issueDate,
      ...invoiceBusinessData(business),
      amountPaid,
      notes: String(formData.get("notes") ?? "").trim() || null,
      seededByUserId: user?.id ?? null,
      confirmedAt: new Date(),
      confirmedByEmail: fromEmail,
      lineItems: {
        create: items.map((item, index) => ({ ...item, sortOrder: index })),
      },
    },
  });
  // A typed number never claimed the counter on its own — move it past
  // what was just used so the next suggestion stays fresh.
  if (requestedNumber) {
    await advanceCounterPast(workspace.id, number);
  }
  await recordEvent(
    invoice.id,
    "created",
    "Invoice created from the home page.",
    user ?? { email: fromEmail, name: parsed.data.fromContactName || parsed.data.fromName },
  );

  const token = createToken();
  await db.magicLink.create({
    data: {
      tokenHash: hashToken(token),
      purpose: "invoice_view",
      email: parsed.data.billToEmail,
      invoiceId: invoice.id,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  redirect(`/invoices/view/${invoice.id}?token=${token}`);
}
