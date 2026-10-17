import { db } from "@/lib/db";

/** Entitlement follows the issuer/preparer, never whoever happens to view a link. */
export async function invoiceShowsBrand(invoice: {
  seededByUserId?: string | null;
  contractor: { userId?: string | null };
}) {
  const ids = [invoice.seededByUserId, invoice.contractor.userId].filter((id): id is string => Boolean(id));
  if (!ids.length) return true;
  const paidOwner = await db.user.findFirst({
    where: { id: { in: ids }, plan: { in: ["invoice", "bookkeeper"] }, archivedAt: null },
    select: { id: true },
  });
  return !paidOwner;
}
