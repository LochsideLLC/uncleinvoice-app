"use server";

import { db } from "@/lib/db";
import { getRealSessionUser } from "@/lib/auth";
import { formatStreetAddress } from "@/lib/us-address";
import { revalidatePath } from "next/cache";
import { invoiceGrandTotal } from "@/lib/money";
import { onlinePaymentEligibility } from "@/lib/payment-policy";

export async function saveInvoiceOnlinePaymentAction(invoiceId: string, enabled: boolean) {
  const user = await getRealSessionUser();
  if (!user) return { error: "Sign in to change this invoice." };

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { contractor: true, lineItems: true },
  });
  if (!invoice || invoice.contractor.userId !== user.id) {
    return { error: "You cannot change payment options for this invoice." };
  }

  if (enabled) {
    const account = await db.stripeConnectedAccount.findUnique({ where: { userId: user.id } });
    const eligibility = onlinePaymentEligibility({
      total: invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps),
      amountPaid: invoice.amountPaid,
      status: invoice.status,
      collectionMode: "stripe",
      onlinePaymentEnabled: true,
      ownerUserId: invoice.contractor.userId,
      requestingUserId: user.id,
      account,
    });
    if (!eligibility.eligible) return { error: eligibility.reason };
  }

  await db.invoice.update({
    where: { id: invoiceId },
    data: enabled
      ? { onlinePaymentEnabled: true, collectionMode: "stripe" }
      : {
          onlinePaymentEnabled: false,
          collectionMode: invoice.collectionMode === "documentation" ? "documentation" : "manual",
        },
  });
  revalidatePath(`/invoices/view/${invoiceId}`);
  return { ok: true, message: "Payment option saved." };
}

export async function setInvoiceCheckPaymentAction(invoiceId: string, enabled: boolean) {
  const user = await getRealSessionUser();
  if (!user) return { error: "Sign in to change this invoice." };

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      fromAddressLine: true,
      fromCity: true,
      fromRegion: true,
      fromPostalCode: true,
      contractor: {
        select: {
          userId: true,
          addressLine: true,
          city: true,
          region: true,
          postalCode: true,
        },
      },
    },
  });
  if (!invoice || invoice.contractor.userId !== user.id) {
    return { error: "You cannot change payment options for this invoice." };
  }
  if (
    enabled &&
    !(invoice.fromAddressLine?.trim() || invoice.contractor.addressLine?.trim() || user.addressLine?.trim())
  ) {
    return { error: "Add a mailing address to this invoice or your business profile before turning on Pay by check." };
  }

  const data: {
    checkPaymentEnabled: boolean;
    fromAddressLine?: string;
    fromCity?: string | null;
    fromRegion?: string | null;
    fromPostalCode?: string | null;
  } = { checkPaymentEnabled: enabled };
  if (enabled && !invoice.fromAddressLine?.trim() && !invoice.contractor.addressLine?.trim()) {
    data.fromAddressLine = formatStreetAddress(user.addressLine, user.addressLine2);
    data.fromCity = invoice.fromCity?.trim() || invoice.contractor.city?.trim() || user.city || null;
    data.fromRegion = invoice.fromRegion?.trim() || invoice.contractor.region?.trim() || user.region || null;
    data.fromPostalCode = invoice.fromPostalCode?.trim() || invoice.contractor.postalCode?.trim() || user.postalCode || null;
  }

  await db.invoice.update({
    where: { id: invoiceId },
    data,
  });
  return { ok: true };
}
