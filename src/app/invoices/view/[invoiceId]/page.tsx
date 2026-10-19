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

import { getRealSessionUser } from "@/lib/auth";
import { isClaimTokenShape } from "@/lib/invoice-claim";
import { HostedInvoiceControls } from "@/components/hosted-invoice-controls";
import { isSafeConnectConfiguration } from "@/lib/stripe-connect";
import { formatDateTime } from "@/lib/dates";

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ token?: string; claim?: string }>;
}) {
  const { invoiceId } = await params;
  const { token, claim } = await searchParams;
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      contractor: true,
      workspace: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!invoice) notFound();

  const access = await invoiceAccess(invoice.id, invoice.workspaceId, invoice.contractor.userId, token);
  if (!access.allowed) notFound();

  const pdfHref = `/api/invoices/${invoice.id}/pdf${token ? `?token=${token}` : ""}`;
  const editHref = `/create?edit=${invoice.id}${token ? `&token=${token}` : ""}`;
  const totalCents = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
  // A token link means "customer view" — unless the visitor is also a member
  // of the workspace. Without this, the owner lands on the customer view of
  // their own fresh invoice (creation redirects carry a token) and loses
  // Send, Share link, Mark as paid, and Edit.
  const isOwner = access.isMember || access.isContractorOwner;
  const showBrand = await invoiceShowsBrand(invoice);
  const viewer = access.isMember ? await getSessionUser() : null;
  // Guests have no account at all: nudge them to sign up before printing.
  const hasAccount = Boolean(viewer ?? (await getSessionUser()) ?? (await getRealSessionUser()));

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl px-5 pb-8">
      <div className="mb-6 flex items-center justify-between print:hidden">
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
        <InvoiceActions
          pdfHref={pdfHref}
          showSignupNudge={!hasAccount}
          signupHref={
            !hasAccount && isClaimTokenShape(claim)
              ? `/signup?claim=${encodeURIComponent(claim)}`
              : "/signup"
          }
        />
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
        />
      )}

      <div className="relative mt-4">
        <InvoiceDocument invoice={invoiceToDocument(invoice)} showBrand={showBrand} />
        {access.isMember && invoice.status !== "sent" && (
          <Link
            href={editHref}
            aria-label="Edit invoice"
            className="print:hidden absolute right-4 top-4 rounded-lg p-2 text-muted transition hover:bg-paper-2 hover:text-ink"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" />
              <path d="M9.5 4.5l2 2" />
            </svg>
          </Link>
        )}
      </div>
      {access.isContractorOwner ? (
        <HostedInvoiceControls
          invoiceId={invoice.id}
          paymentEnabled={invoice.onlinePaymentEnabled}
          canCollect={Boolean(
            access.connectedAccount &&
            isSafeConnectConfiguration(access.connectedAccount) &&
            access.connectedAccount.chargesEnabled &&
            access.connectedAccount.cardPaymentsStatus === "active"
          )}
        />
      ) : null}
      {isOwner ? (
        <section className="paper mt-6 rounded-3xl p-6 print:hidden">
          <h2 className="text-2xl">Recent activity</h2>
          {invoice.events.length ? (
            <ol className="mt-4 space-y-3 text-sm">
              {invoice.events.map((event) => (
                <li key={event.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                  <p>{event.message}</p>
                  <p className="text-muted">
                    {event.source === "stripe" ? "Stripe confirmed" : event.actorName ?? event.actorEmail ?? "Uncle Invoice"}
                    {" · "}{formatDateTime(event.createdAt, access.ownerTimeZone)}
                  </p>
                </li>
              ))}
            </ol>
          ) : <p className="mt-2 text-sm text-muted">No activity yet.</p>}
        </section>
      ) : null}

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
      return { allowed: true, isMember: Boolean(membership), isContractorOwner, connectedAccount, ownerTimeZone: realViewer?.timeZone ?? viewer?.timeZone ?? "America/Chicago" };
    }
  }

  const user = await getSessionUser();
  const realUser = await getRealSessionUser();
  if (!user && !realUser) return { allowed: false, isMember: false, isContractorOwner: false, connectedAccount: null, ownerTimeZone: "America/Chicago" };
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
    ownerTimeZone: realUser?.timeZone ?? user?.timeZone ?? "America/Chicago",
  };
}
