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
import { UpgradeOffer } from "@/components/upgrade-offer";
import { BrandingPreview } from "@/components/branding-preview";
import { asPlan } from "@/lib/plan";

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { invoiceId } = await params;
  const { token } = await searchParams;
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      contractor: true,
      workspace: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) notFound();

  const access = await invoiceAccess(invoice.id, invoice.workspaceId, token);
  if (!access.allowed) notFound();

  const pdfHref = `/api/invoices/${invoice.id}/pdf${token ? `?token=${token}` : ""}`;
  const editHref = `/create?edit=${invoice.id}${token ? `&token=${token}` : ""}`;
  const totalCents = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
  // A token link means "customer view" — unless the visitor is also a member
  // of the workspace. Without this, the owner lands on the customer view of
  // their own fresh invoice (creation redirects carry a token) and loses
  // Send, Share link, Mark as paid, and Edit.
  const isOwner = !token || access.isMember;
  const showBrand = await invoiceShowsBrand(invoice);
  const viewer = access.isMember ? await getSessionUser() : null;

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
        <InvoiceActions pdfHref={pdfHref} />
      </div>

      {isOwner && (
        <InvoiceStatusBar
          workspaceId={invoice.workspaceId}
          invoiceId={invoice.id}
          status={invoice.status}
          sentAt={invoice.sentAt}
          dueDate={invoice.dueDate}
          totalCents={totalCents}
          amountPaid={invoice.amountPaid}
          clientEmail={invoice.workspace.email}
          mailFrom={mailFromAddress()}
        />
      )}

      <div className="relative mt-4">
        <InvoiceDocument invoice={invoiceToDocument(invoice)} showBrand={showBrand} />
        {isOwner && invoice.status !== "sent" && (
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
      {viewer && asPlan(viewer.plan) === "free" && invoice.seededByUserId === viewer.id && showBrand && <div className="mt-6 print:hidden"><UpgradeOffer feature="branding" preview={<BrandingPreview invoice={invoiceToDocument(invoice)} />} className="text-sm text-muted underline underline-offset-4">Preview this invoice without our credit</UpgradeOffer></div>}
    </div>
  );
}

async function invoiceAccess(
  invoiceId: string,
  workspaceId: string,
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
      const membership = viewer
        ? await db.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: viewer.id } },
          })
        : null;
      return { allowed: true, isMember: Boolean(membership) };
    }
  }

  const user = await getSessionUser();
  if (!user) return { allowed: false, isMember: false };
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  return { allowed: Boolean(membership), isMember: Boolean(membership) };
}
