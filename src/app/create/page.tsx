import { getSessionUser } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";
import { db } from "@/lib/db";
import { listWorkspaces } from "@/lib/workspace";
import { toDateInput } from "@/lib/dates";
import { centsToDollars, invoiceGrandTotal, paymentState } from "@/lib/money";
import { CreateAccountNudge } from "@/components/create-account-nudge";
import { QuickInvoiceForm } from "@/components/quick-invoice-form";
import { W9Note } from "@/components/w9-note";
import { formatStreetAddress } from "@/lib/us-address";

export default async function CreateInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; token?: string }>;
}) {
  const user = await getSessionUser();
  const { edit, token } = await searchParams;
  const draft = edit ? await loadInvoiceDraft(edit, token, user?.id) : null;
  const memberships = user ? await listWorkspaces(user.id) : [];
  const billToClients = memberships.map((membership) => ({
    id: membership.workspace.id,
    name: membership.workspace.name,
    email: membership.workspace.email,
    phone: membership.workspace.phone,
    addressLine: membership.workspace.addressLine,
    city: membership.workspace.city,
    region: membership.workspace.region,
    postalCode: membership.workspace.postalCode,
  }));

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-5 pb-8">
      {user || draft ? null : <CreateAccountNudge />}
      <QuickInvoiceForm
        invoiceId={draft?.id}
        viewToken={draft ? token : undefined}
        defaultFromName={draft?.fromContactName || user?.name || ""}
        defaultFromEmail={
          draft?.fromEmail ||
          user?.businessEmail ||
          (user && user.email !== "guest@uncleinvoice.com" ? user.email : "")
        }
        defaultFromCompany={draft?.fromCompany || user?.businessName || ""}
        defaultFromPhone={draft?.fromPhone || user?.phone || ""}
        defaultFromAddressLine={
          draft?.fromAddress || formatStreetAddress(user?.addressLine, user?.addressLine2)
        }
        defaultFromCity={draft?.fromCity || user?.city || ""}
        defaultFromRegion={draft?.fromRegion || user?.region || ""}
        defaultFromPostalCode={draft?.fromPostalCode || user?.postalCode || ""}
        defaults={draft?.defaults}
        billToClients={billToClients}
        canSaveClients={!!user}
      />
      <div className="mt-8">
        <W9Note />
      </div>
    </div>
  );
}

async function loadInvoiceDraft(invoiceId: string, token: string | undefined, userId?: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      contractor: true,
      workspace: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      tokens: true,
    },
  });
  if (!invoice) return null;

  const tokenOk =
    Boolean(token) &&
    invoice.tokens.some(
      (record) =>
        record.purpose === "invoice_view" &&
        record.tokenHash === hashToken(token as string) &&
        record.expiresAt >= new Date(),
    );
  const memberOk = userId
    ? Boolean(
        await db.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId: invoice.workspaceId, userId } },
        }),
      )
    : false;
  if (!tokenOk && !memberOk) return null;

  const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
  const paid = paymentState(invoice.amountPaid, total);

  return {
    id: invoice.id,
    fromContactName: invoice.fromContactName ?? "",
    fromCompany: invoice.contractor.name,
    fromEmail: invoice.contractor.email ?? "",
    fromPhone: invoice.contractor.phone ?? "",
    fromAddress: invoice.fromAddressLine ?? invoice.contractor.addressLine ?? "",
    fromCity: invoice.fromCity ?? invoice.contractor.city ?? "",
    fromRegion: invoice.fromRegion ?? invoice.contractor.region ?? "",
    fromPostalCode: invoice.fromPostalCode ?? invoice.contractor.postalCode ?? "",
    defaults: {
      invoiceNumber: invoice.number,
      issueDate: toDateInput(invoice.issueDate),
      dueDate: toDateInput(invoice.dueDate),
      paymentTerms: invoice.paymentTerms ?? "",
      poNumber: invoice.poNumber ?? "",
      taxRate: invoice.taxRateBps ? (invoice.taxRateBps / 100).toString() : "",
      notes: invoice.notes ?? "",
      paymentInstructions: invoice.paymentInstructions ?? "",
      paymentState: paid,
      amountPaid: paid === "partial" ? centsToDollars(invoice.amountPaid) : "",
      billToName: invoice.workspace.name,
      billToContactName: invoice.billToContactName ?? "",
      billToEmail: invoice.workspace.email,
      billToPhone: invoice.workspace.phone ?? "",
      billToAddressLine: invoice.workspace.addressLine ?? "",
      billToCity: invoice.workspace.city ?? "",
      billToRegion: invoice.workspace.region ?? "",
      billToPostalCode: invoice.workspace.postalCode ?? "",
      lines: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        price: centsToDollars(item.unitPrice),
        taxable: item.taxable,
      })),
    },
  };
}
