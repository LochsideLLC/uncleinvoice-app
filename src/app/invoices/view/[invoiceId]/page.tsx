import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { getSessionUser } from "@/lib/auth";
import { invoiceGrandTotal } from "@/lib/money";
import { InvoiceDocument, invoiceToDocument } from "@/components/invoice-document";
import { InvoiceActions } from "@/components/invoice-actions";
import { InvoiceStatusBar } from "@/components/invoice-status-bar";
import { mailFromAddress } from "@/lib/mail";
import { invoiceShowsBrand } from "@/lib/invoice-branding";
import { DEFAULT_INVOICE_MESSAGE } from "@/lib/invoice-email";

import { getRealSessionUser } from "@/lib/auth";
import { isClaimTokenShape } from "@/lib/invoice-claim";
import { HostedInvoiceControls } from "@/components/hosted-invoice-controls";
import { stripeConnectEnabled } from "@/lib/stripe-connect";
import { stripeReadyForPayments } from "@/lib/payment-policy";

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ token?: string; claim?: string; send?: string }>;
}) {
  const { invoiceId } = await params;
  const { token, claim, send } = await searchParams;
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      contractor: true,
      workspace: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) notFound();

  const access = await invoiceAccess(invoice.id, invoice.workspaceId, invoice.contractor.userId, token);
  if (!access.allowed) notFound();

  const invoiceReturnTo = `/invoices/view/${invoice.id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const pdfHref = `/api/invoices/${invoice.id}/pdf${token ? `?token=${token}` : ""}`;
  const editHref = `/create?edit=${invoice.id}${token ? `&token=${encodeURIComponent(token)}` : ""}&returnTo=${encodeURIComponent(invoiceReturnTo)}`;
  const businessProfileHref = `/app/profile?returnTo=${encodeURIComponent(invoiceReturnTo)}#business-profile`;
  const totalCents = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
  // A token link means "customer view" — unless the visitor is also a member
  // of the workspace. Without this, the owner lands on the customer view of
  // their own fresh invoice (creation redirects carry a token) and loses
  // Send, Share link, Mark as paid, and Edit.
  const isOwner = access.isMember || access.isContractorOwner;
  const showBrand = await invoiceShowsBrand(invoice);
  const invoiceDocument = invoiceToDocument(invoice);
  const checkAddressLines = [invoiceDocument.fromAddress, invoiceDocument.fromCityLine]
    .filter((line): line is string => Boolean(line?.trim()));
  // Online payment is offered at send time only to the issuing contractor,
  // and only once Stripe says the account can take cards.
  const ownerAccount = access.isMember && invoice.contractor.userId
    ? await db.stripeConnectedAccount.findUnique({ where: { userId: invoice.contractor.userId } })
    : null;
  const stripeReady = stripeReadyForPayments(ownerAccount);
  const stripeSetupAvailable = stripeConnectEnabled();
  const canCollectOnline = access.isContractorOwner && stripeReady && invoice.collectionMode !== "documentation";
  const paymentNote = canCollectOnline
    ? null
    : invoice.collectionMode === "documentation"
      ? null
      : !stripeSetupAvailable
        ? "Card payments are not available yet."
        : !access.isContractorOwner
          ? "The contractor who receives the money must connect Stripe first."
          : "Connect Stripe before the customer can pay by card.";
  const viewer = access.isMember ? await getSessionUser() : null;
  const returnParams = new URLSearchParams({ send: "1" });
  if (token) returnParams.set("token", token);
  const defaultMessageReturnTo = `/invoices/view/${invoice.id}?${returnParams.toString()}`;
  // Guests have no account at all: nudge them to sign up before printing.
  const hasAccount = Boolean(viewer ?? (await getSessionUser()) ?? (await getRealSessionUser()));

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl px-5 pb-8">
      <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
        {isOwner ? (
          <Link
            href="/app"
            className="text-sm text-muted hover:text-ink"
          >
            ← All invoices
          </Link>
        ) : (
          <span />
        )}
        {!access.isMember ? (
          <InvoiceActions
            pdfHref={pdfHref}
            showSignupNudge={!hasAccount}
            signupHref={
              !hasAccount && isClaimTokenShape(claim)
                ? `/signup?claim=${encodeURIComponent(claim)}`
                : "/signup"
            }
          />
        ) : null}
      </div>

      {access.isMember && (
        <InvoiceStatusBar
          workspaceId={invoice.workspaceId}
          invoiceId={invoice.id}
          status={invoice.status}
          sentAt={invoice.sentAt}
          dueDate={invoice.dueDate}
          totalCents={totalCents}
          amountPaid={invoice.amountPaid}
          onlinePaymentEnabled={invoice.onlinePaymentEnabled}
          clientEmail={invoice.workspace.email}
          mailFrom={mailFromAddress()}
          defaultInvoiceMessage={viewer?.defaultInvoiceMessage?.trim() || DEFAULT_INVOICE_MESSAGE}
          defaultMessageReturnTo={defaultMessageReturnTo}
          openSendForm={send === "1" && invoice.status === "confirmed"}
          actionTools={
            <InvoiceActions
              pdfHref={pdfHref}
              editHref={invoice.status !== "sent" ? editHref : undefined}
              showSignupNudge={!hasAccount}
              compact
              signupHref={
                !hasAccount && isClaimTokenShape(claim)
                  ? `/signup?claim=${encodeURIComponent(claim)}`
                  : "/signup"
              }
            />
          }
        />
      )}

      <div className="mt-4">
        <InvoiceDocument
          invoice={invoiceDocument}
          showBrand={showBrand}
          paymentOptions={isOwner ? (
            <HostedInvoiceControls
              invoiceId={invoice.id}
              canManage={access.isContractorOwner}
              paymentEnabled={invoice.onlinePaymentEnabled}
              canCollect={canCollectOnline}
              paymentNote={paymentNote}
              canSetUpPayments={access.isContractorOwner && stripeSetupAvailable && invoice.collectionMode !== "documentation"}
              checkPaymentEnabled={invoice.checkPaymentEnabled}
              checkPayee={invoiceDocument.fromName}
              checkAddressLines={checkAddressLines}
              editInvoiceHref={editHref}
              businessProfileHref={businessProfileHref}
            />
          ) : undefined}
        />
      </div>
    </div>
  );
}

async function invoiceAccess(
  invoiceId: string,
  workspaceId: string,
  contractorUserId: string | null,
  token: string | string[] | undefined,
) {
  const raw = Array.isArray(token) ? token[0] : token;
  if (raw) {
    const record = await db.magicLink.findUnique({
      where: { tokenHash: hashToken(raw) },
    });
    if (
      record &&
      record.invoiceId === invoiceId &&
      record.expiresAt >= new Date() &&
      (record.purpose === "invoice_view" || record.purpose === "invoice_review")
    ) {
      const viewer = await getSessionUser();
      const realViewer = await getRealSessionUser();
      const membership = viewer
        ? await db.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: viewer.id } },
          })
        : null;
      const isContractorOwner = Boolean(realViewer && contractorUserId === realViewer.id);
      const connectedAccount = isContractorOwner
        ? await db.stripeConnectedAccount.findUnique({ where: { userId: realViewer!.id } })
        : null;
      return { allowed: true, isMember: Boolean(membership), isContractorOwner, connectedAccount };
    }
  }

  const user = await getSessionUser();
  const realUser = await getRealSessionUser();
  if (!user && !realUser) return { allowed: false, isMember: false, isContractorOwner: false, connectedAccount: null };
  const viewerId = user?.id ?? realUser!.id;
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: viewerId } },
  });
  const isContractorOwner = Boolean(realUser && contractorUserId === realUser.id);
  const connectedAccount = isContractorOwner
    ? await db.stripeConnectedAccount.findUnique({ where: { userId: realUser!.id } })
    : null;
  return {
    allowed: Boolean(membership) || isContractorOwner,
    isMember: Boolean(membership),
    isContractorOwner,
    connectedAccount,
  };
}
