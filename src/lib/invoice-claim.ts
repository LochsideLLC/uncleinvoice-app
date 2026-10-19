import { db } from "@/lib/db";
import { createToken, hashToken } from "@/lib/crypto";

/**
 * Guest-claim signup ("frictionless signup", part b).
 *
 * A guest creates an invoice with no account. At creation we mint one
 * single-use claim token (a MagicLink row with purpose "invoice_claim")
 * and carry its raw value alongside the view link as ?claim=. When the
 * guest later signs up — password, Google, or magic link — with that
 * ?claim= value, the new account is attached to the guest invoice
 * (contractor.userId, invoice.seededByUserId, WorkspaceMember) in one
 * transaction, and the visitor lands on the invoice instead of /app.
 *
 * The raw token is a random 256-bit bearer looked up by sha256 hash, so a
 * forged or tampered value simply misses and the visitor gets the generic
 * post-signup destination. The claim is deliberately NOT bound to an
 * email address: the guest may sign up with any address, and possession
 * of the single-use bearer is the authorization. No schema migration:
 * MagicLink.purpose is a plain string and invoiceId already exists.
 */

export const CLAIM_EXPIRY_DAYS = 30;

const CLAIM_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export function isClaimTokenShape(raw: unknown): raw is string {
  return typeof raw === "string" && CLAIM_TOKEN_PATTERN.test(raw);
}

function claimDestination(invoiceId: string) {
  // The claimer is a workspace member by the time this is returned, so the
  // member view loads with no bearer token in the URL.
  return `/invoices/view/${invoiceId}`;
}

export async function createInvoiceClaimToken(invoiceId: string, email: string) {
  const token = createToken();
  await db.magicLink.create({
    data: {
      tokenHash: hashToken(token),
      purpose: "invoice_claim",
      email: email.toLowerCase(),
      invoiceId,
      expiresAt: new Date(Date.now() + CLAIM_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function consumeInvoiceClaim(
  raw: string | null | undefined,
  userId: string,
): Promise<{ invoiceId: string; to: string } | null> {
  if (!isClaimTokenShape(raw)) return null;
  const record = await db.magicLink.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!record || record.purpose !== "invoice_claim" || !record.invoiceId) return null;
  if (record.expiresAt < new Date()) return null;
  if (record.usedAt) {
    // Same-user refresh (double submit, back button) lands in the same
    // place. A different visitor holding a spent token gets nothing.
    if (record.userId !== userId) return null;
    return { invoiceId: record.invoiceId, to: claimDestination(record.invoiceId) };
  }

  const invoice = await db.invoice.findUnique({
    where: { id: record.invoiceId },
    select: { id: true, workspaceId: true, contractorId: true, seededByUserId: true },
  });
  if (!invoice) return null;

  const contractor = await db.contractor.findUnique({
    where: { id: invoice.contractorId },
    select: { id: true, userId: true },
  });
  // Another account already attached to this contractor: not ours to take.
  if (contractor && contractor.userId && contractor.userId !== userId) return null;

  await db.$transaction([
    ...(contractor && !contractor.userId
      ? [db.contractor.update({ where: { id: contractor.id }, data: { userId } })]
      : []),
    ...(invoice.seededByUserId ? [] : [db.invoice.update({ where: { id: invoice.id }, data: { seededByUserId: userId } })]),
    db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invoice.workspaceId, userId } },
      update: {},
      create: { workspaceId: invoice.workspaceId, userId, role: "owner" },
    }),
    db.magicLink.update({
      where: { id: record.id },
      data: { usedAt: new Date(), userId },
    }),
    // Scenario A: a guest-claim signup opens the Contractor workspace with
    // no selection question. This also stamps contractor access, so both
    // modes stay available to the account afterwards.
    db.user.update({
      where: { id: userId },
      data: { workspaceKind: "contractor", contractorOnboardedAt: new Date() },
    }),
  ]);

  return { invoiceId: invoice.id, to: claimDestination(invoice.id) };
}
