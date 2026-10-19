import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";
import { buildInvoicePdf } from "@/lib/pdf";
import { cappedInteger, consumeDailyLimit } from "@/lib/usage-limits";

export async function GET(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await context.params;
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      contractor: true,
      workspace: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const allowed = await canDownload(
    invoice.id,
    invoice.workspaceId,
    invoice.contractorId,
    invoice.contractor.userId,
    token,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const globalAllowed = await consumeDailyLimit({
    operation: "pdf_generate",
    scope: "global",
    scopeKey: "all",
    limit: cappedInteger(process.env.PDF_GLOBAL_DAILY_LIMIT, 2000, 2000),
  });
  const invoiceAllowed = globalAllowed && await consumeDailyLimit({
    operation: "pdf_generate",
    scope: "invoice",
    scopeKey: invoiceId,
    limit: cappedInteger(process.env.PDF_PER_INVOICE_DAILY_LIMIT, 50, 50),
  });
  if (!invoiceAllowed) return NextResponse.json({ error: "PDF limit reached. Try again tomorrow." }, { status: 429 });

  const pdf = await buildInvoicePdf(invoice);
  const download = url.searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoice.number}.pdf"`,
    },
  });
}

async function canDownload(
  invoiceId: string,
  workspaceId: string,
  contractorId: string,
  contractorUserId: string | null,
  token: string | null,
) {
  if (token) {
    const record = await db.magicLink.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (record && record.expiresAt >= new Date()) {
      // A single-invoice link opens that invoice.
      if (
        record.invoiceId === invoiceId &&
        (record.purpose === "invoice_view" || record.purpose === "invoice_review")
      ) {
        return true;
      }
      // A contractor link opens any invoice belonging to that contractor.
      if (
        record.purpose === "contractor_invoices" &&
        record.contractorId === contractorId
      ) {
        return true;
      }
    }
  }

  const user = await getSessionUser();
  if (!user) return false;
  // The contractor who issued it.
  if (contractorUserId && contractorUserId === user.id) return true;
  // Or someone who keeps the books for the client it was billed to.
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  return Boolean(membership);
}
