import { getSessionUser } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";
import { db } from "@/lib/db";
import { listWorkspaces } from "@/lib/workspace";
import { toDateInput } from "@/lib/dates";
import { centsToDollars, invoiceGrandTotal, paymentState } from "@/lib/money";
import type { SavedService } from "@/components/workspace-services-manager";
import { CreateAccountNudge } from "@/components/create-account-nudge";
import { QuickInvoiceForm } from "@/components/quick-invoice-form";
import { W9Note } from "@/components/w9-note";
import { formatStreetAddress } from "@/lib/us-address";
import { stripeConnectEnabled } from "@/lib/stripe-connect";
import { stripeReadyForPayments } from "@/lib/payment-policy";

export default async function CreateInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; token?: string; returnTo?: string }>;
}) {
  const user = await getSessionUser();
  const { edit, token, returnTo } = await searchParams;
  const draft = edit ? await loadInvoiceDraft(edit, token, user?.id) : null;
  const memberships = user ? await listWorkspaces(user.id) : [];
  const workspaceIds = memberships.map((membership) => membership.workspace.id);
  const serviceRows = workspaceIds.length
    ? await db.serviceItem.findMany({
        where: { workspaceId: { in: workspaceIds } },
        orderBy: { description: "asc" },
      })
    : [];
  const savedServices: { workspaceId: string; items: SavedService[] }[] = workspaceIds.map(
    (workspaceId) => ({
      workspaceId,
      items: serviceRows
        .filter((row) => row.workspaceId === workspaceId)
        .map((row) => ({
          id: row.id,
          description: row.description,
          unitPriceCents: row.unitPrice,
          taxable: row.taxable,
        })),
    }),
  );
  const billToClients = memberships.map((membership) => ({
    id: membership.workspace.id,
    name: membership.workspace.name,
    businessName: membership.workspace.businessName,
    contactName: membership.workspace.contactName,
    email: membership.workspace.email,
    phone: membership.workspace.phone,
    addressLine: membership.workspace.addressLine,
    city: membership.workspace.city,
    region: membership.workspace.region,
    postalCode: membership.workspace.postalCode,
    defaultPaymentTerms: membership.workspace.defaultPaymentTerms,
    // Peek, don't claim: the counter moves only when an invoice is saved.
    nextNumber: `${membership.workspace.invoicePrefix}-${String(membership.workspace.nextInvoiceNumber).padStart(4, "0")}`,
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
        defaultTerms={draft?.workspaceDefaultTerms}
        defaultClientId={draft?.workspaceId}
        savedServices={savedServices}
        billToClients={billToClients}
        canSaveClients={!!user}
        paymentOptions={draft?.paymentOptions}
        returnTo={returnTo}
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
  const canManagePaymentOptions = Boolean(userId && invoice.contractor.userId === userId);
  const stripeAvailable = stripeConnectEnabled();
  const stripeAccount = canManagePaymentOptions
    ? await db.stripeConnectedAccount.findUnique({ where: { userId: userId as string } })
    : null;
  const canCollectPayment = canManagePaymentOptions &&
    stripeReadyForPayments(stripeAccount) &&
    invoice.collectionMode !== "documentation";
  const paymentOptionsNote = canCollectPayment
    ? null
    : !stripeAvailable
      ? "Card payments are not available yet."
      : !canManagePaymentOptions
        ? "The contractor who receives the money must connect Stripe first."
        : invoice.collectionMode === "documentation"
          ? null
          : "Connect Stripe before the customer can pay by card.";

  return {
    id: invoice.id,
    workspaceId: invoice.workspaceId,
    workspaceDefaultTerms: invoice.workspace.defaultPaymentTerms,
    paymentOptions: {
      enabled: invoice.onlinePaymentEnabled,
      canManage: canManagePaymentOptions,
      canCollect: canCollectPayment,
      canSetUpPayments: canManagePaymentOptions && stripeAvailable && invoice.collectionMode !== "documentation",
      setupNote: paymentOptionsNote,
      checkPaymentEnabled: invoice.checkPaymentEnabled,
      checkPayee: invoice.contractor.name,
      checkAddressLines: [
        invoice.fromAddressLine ?? invoice.contractor.addressLine,
        [
          invoice.fromCity ?? invoice.contractor.city,
          [invoice.fromRegion ?? invoice.contractor.region, invoice.fromPostalCode ?? invoice.contractor.postalCode]
            .filter(Boolean)
            .join(" "),
        ].filter(Boolean).join(", "),
      ].filter((line): line is string => Boolean(line?.trim())),
    },
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
      billToName: invoice.workspace.businessName || invoice.workspace.name,
      billToContactName: invoice.billToContactName ?? invoice.workspace.contactName ?? "",
      billToEmail: invoice.workspace.email ?? "",
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
