import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createToken, hashToken } from "@/lib/crypto";
import { invoiceGrandTotal } from "@/lib/money";
import { onlinePaymentEligibility } from "@/lib/payment-policy";
import { withInvoiceIssuerProfile } from "@/lib/invoice-issuer";

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
  const invoice = await withInvoiceIssuerProfile(access.invoice);
  const ownerUserId = invoice.contractor.userId;
  const account = ownerUserId
    ? await db.stripeConnectedAccount.findUnique({ where: { userId: ownerUserId } })
    : null;
  const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
  return {
    access,
    invoice,
    account,
    eligibility: onlinePaymentEligibility({
      total,
      amountPaid: invoice.amountPaid,
      status: invoice.status,
      collectionMode: invoice.collectionMode,
      onlinePaymentEnabled: invoice.onlinePaymentEnabled,
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

/**
 * A customer link that leaves every earlier link working (unlike
 * createHostedInvoiceAccess, which closes the old one). Used by Send and
 * Share link, where a link may already be in someone's inbox.
 *
 * `collectPayment` follows the same rules as the Hosted invoice panel: only
 * the issuing contractor, only with Stripe fully set up, only for a balance
 * that is still due. Pass `undefined` to leave the invoice's payment setting
 * as it is (Share link), `true`/`false` to set it (Send).
 */
export async function createHostedDeliveryLink(
  invoiceId: string,
  ownerUserId: string,
  options: { collectPayment?: boolean; requestingUserId?: string } = {},
) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { contractor: { select: { userId: true } }, lineItems: true },
  });
  if (!invoice || invoice.contractor.userId !== ownerUserId) throw new Error("Invoice owner mismatch");

  const wantsPayment = options.collectPayment;
  const changesPayment = wantsPayment !== undefined && wantsPayment !== invoice.onlinePaymentEnabled;
  if (wantsPayment) {
    if (invoice.collectionMode === "documentation") {
      throw new Error("This invoice only documents an earlier payment, so online payment cannot be turned on from here.");
    }
    const account = await db.stripeConnectedAccount.findUnique({ where: { userId: ownerUserId } });
    const eligibility = onlinePaymentEligibility({
      total: invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps),
      amountPaid: invoice.amountPaid,
      status: invoice.status,
      collectionMode: "stripe",
      onlinePaymentEnabled: true,
      ownerUserId,
      requestingUserId: options.requestingUserId ?? ownerUserId,
      account,
    });
    if (!eligibility.eligible) throw new Error(eligibility.reason);
  }
  if (
    changesPayment &&
    (await db.checkoutAttempt.count({ where: { invoiceId, activeKey: { not: null } } }))
  ) {
    throw new Error("Wait for the current payment to finish before changing online payment for this invoice.");
  }

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
    if (changesPayment) {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: wantsPayment
          ? { collectionMode: "stripe", onlinePaymentEnabled: true }
          : {
              collectionMode: invoice.collectionMode === "documentation" ? "documentation" : "manual",
              onlinePaymentEnabled: false,
            },
      });
    }
    await tx.invoiceEvent.create({
      data: {
        invoiceId,
        type: "hosted_link_created",
        source: "app",
        message: changesPayment
          ? wantsPayment
            ? "Created a customer link with online payment enabled."
            : "Created a customer link with online payment turned off."
          : "Created a customer link.",
      },
    });
  });
  return `/i/${token}`;
}
