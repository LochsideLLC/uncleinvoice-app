import "server-only";

import { db } from "@/lib/db";

type InvoiceWithContractor = {
  fromContactName?: string | null;
  fromTaxId?: string | null;
  fromAddressLine?: string | null;
  fromCity?: string | null;
  fromRegion?: string | null;
  fromPostalCode?: string | null;
  contractor: {
    userId?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    addressLine?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    taxId?: string | null;
  };
};

export async function getInvoiceIssuerProfile(userId?: string | null) {
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      businessName: true,
      businessEmail: true,
      phone: true,
      addressLine: true,
      addressLine2: true,
      city: true,
      region: true,
      postalCode: true,
      taxId: true,
    },
  });
}

/** Use the linked contractor account's saved business details as the invoice sender. */
export function applyInvoiceIssuerProfile<T extends InvoiceWithContractor>(
  invoice: T,
  profile: NonNullable<Awaited<ReturnType<typeof getInvoiceIssuerProfile>>> | null,
): T {
  if (!profile) return invoice;

  const addressLine = [profile.addressLine, profile.addressLine2]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ") || invoice.fromAddressLine?.trim() || invoice.contractor.addressLine;
  const city = profile.city?.trim() || invoice.fromCity || invoice.contractor.city;
  const region = profile.region?.trim() || invoice.fromRegion || invoice.contractor.region;
  const postalCode = profile.postalCode?.trim() || invoice.fromPostalCode || invoice.contractor.postalCode;
  const name = profile.businessName?.trim() || profile.name.trim() || invoice.contractor.name;
  const email = profile.businessEmail?.trim() || profile.email || invoice.contractor.email;
  const phone = profile.phone?.trim() || invoice.contractor.phone;
  const taxId = profile.taxId?.trim() || invoice.fromTaxId || invoice.contractor.taxId;

  return {
    ...invoice,
    fromContactName: profile.name,
    fromTaxId: taxId,
    fromAddressLine: addressLine,
    fromCity: city,
    fromRegion: region,
    fromPostalCode: postalCode,
    contractor: {
      ...invoice.contractor,
      name,
      email,
      phone,
      addressLine,
      city,
      region,
      postalCode,
      taxId,
    },
  } as T;
}

export async function withInvoiceIssuerProfile<T extends InvoiceWithContractor>(invoice: T): Promise<T> {
  const profile = await getInvoiceIssuerProfile(invoice.contractor.userId);
  return applyInvoiceIssuerProfile(invoice, profile);
}
