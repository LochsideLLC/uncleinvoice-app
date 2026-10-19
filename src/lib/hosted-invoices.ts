import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createToken, hashToken } from "@/lib/crypto";
import { invoiceGrandTotal } from "@/lib/money";
import { onlinePaymentEligibility } from "@/lib/payment-policy";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export async function loadHostedInvoice(rawToken: string) {
  if (!TOKEN_PATTERN.test(rawToken)) return null;
  const access = await db.hostedInvoiceAccess.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: {
      invoice: {
        include: {
          contractor: true,
          workspace: true,
          lineItems: { orderBy: { sortOrder: "asc" } },
          payments: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!access || access.revokedAt || (access.expiresAt && access.expiresAt < new Date())) return null;
  const ownerUserId = access.invoice.contractor.userId;
  const account = ownerUserId
    ? await db.stripeConnectedAccount.findUnique({ where: { userId: ownerUserId } })
    : null;
  const total = invoiceGrandTotal(access.invoice.lineItems, access.invoice.taxRateBps);
  return {
    access,
    invoice: access.invoice,
    account,
    eligibility: onlinePaymentEligibility({
      total,
      amountPaid: access.invoice.amountPaid,
      status: access.invoice.status,
      collectionMode: access.invoice.collectionMode,
      onlinePaymentEnabled: access.invoice.onlinePaymentEnabled,
      ownerUserId,
      account,
    }),
  };
}

export async function createHostedInvoiceAccess(args: {
  invoiceId: string;
  ownerUserId: string;
  collectPayment: boolean;
  confirmedBalanceDue: boolean;
}) {
  const invoice = await db.invoice.findUnique({
    where: { id: args.invoiceId },
    include: { contractor: true, lineItems: true },
  });
  if (!invoice || invoice.contractor.userId !== args.ownerUserId) {
    throw new Error("Invoice not found");
  }
  if (await db.checkoutAttempt.count({ where: { invoiceId: invoice.id, activeKey: { not: null } } })) {
    throw new Error("Wait for the current payment link to finish before changing this invoice link");
  }

  if (args.collectPayment) {
    if (!args.confirmedBalanceDue) {
      throw new Error("Confirm that this invoice still needs payment");
    }
    const account = await db.stripeConnectedAccount.findUnique({ where: { userId: args.ownerUserId } });
    const eligibility = onlinePaymentEligibility({
      total: invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps),
      amountPaid: invoice.amountPaid,
      status: invoice.status,
      collectionMode: "stripe",
      onlinePaymentEnabled: true,
      ownerUserId: invoice.contractor.userId,
      requestingUserId: args.ownerUserId,
      account,
    });
    if (!eligibility.eligible) throw new Error(eligibility.reason);
  }

  const token = createToken();
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.hostedInvoiceAccess.updateMany({
      where: { invoiceId: invoice.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.hostedInvoiceAccess.create({
      data: { invoiceId: invoice.id, tokenHash: hashToken(token) },
    });
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        collectionMode: args.collectPayment
          ? "stripe"
          : invoice.collectionMode === "documentation"
            ? "documentation"
            : "manual",
        onlinePaymentEnabled: args.collectPayment,
      },
    });
    await tx.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        type: "hosted_link_created",
        source: "app",
        message: args.collectPayment
          ? "Created a hosted invoice link with online payment enabled."
          : "Created a hosted invoice link.",
        actorName: invoice.contractor.name,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { token, urlPath: `/i/${token}` };
}

export async function createHostedDeliveryLink(invoiceId: string, ownerUserId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { contractor: { select: { userId: true } } },
  });
  if (!invoice || invoice.contractor.userId !== ownerUserId) throw new Error("Invoice owner mismatch");
  const token = createToken();
  const existing = await db.hostedInvoiceAccess.findMany({
    where: { invoiceId, revokedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  await db.$transaction(async (tx) => {
    if (existing.length >= 20) {
      await tx.hostedInvoiceAccess.updateMany({
        where: { id: { in: existing.slice(0, existing.length - 19).map((item) => item.id) } },
        data: { revokedAt: new Date() },
      });
    }
    await tx.hostedInvoiceAccess.create({
      data: {
        invoiceId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 365 * 86400_000),
      },
    });
    await tx.invoiceEvent.create({
      data: { invoiceId, type: "hosted_link_created", source: "app", message: "Created a hosted invoice link for delivery." },
    });
  });
  return `/i/${token}`;
}
