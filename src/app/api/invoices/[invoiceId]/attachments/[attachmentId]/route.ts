import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";

export async function GET(
  request: Request,
  context: { params: Promise<{ invoiceId: string; attachmentId: string }> },
) {
  const { invoiceId, attachmentId } = await context.params;
  const attachment = await db.invoiceAttachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment || attachment.invoiceId !== invoiceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = new URL(request.url).searchParams.get("token");
  if (!(await canRead(invoiceId, invoice.workspaceId, token))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Length": String(attachment.byteSize),
      "Content-Disposition":
        `${download ? "attachment" : "inline"}; filename="${attachment.filename.replace(/["\\]/g, "")}"`,
    },
  });
}

// Same reach as the invoice PDF: a workspace member, or whoever holds a live
// review/view link for this invoice -- which is how the contractor sees it.
async function canRead(invoiceId: string, workspaceId: string, token: string | null) {
  if (token) {
    const record = await db.magicLink.findUnique({ where: { tokenHash: hashToken(token) } });
    if (
      record &&
      record.invoiceId === invoiceId &&
      record.expiresAt >= new Date() &&
      (record.purpose === "invoice_view" || record.purpose === "invoice_review")
    ) {
      return true;
    }
  }
  const user = await getSessionUser();
  if (!user) return false;
  const membership = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: user.id },
  });
  return Boolean(membership);
}
