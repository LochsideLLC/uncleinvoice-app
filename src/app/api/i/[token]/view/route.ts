import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRealSessionUser } from "@/lib/auth";
import { createToken, hashToken } from "@/lib/crypto";
import { db } from "@/lib/db";
import { loadHostedInvoice } from "@/lib/hosted-invoices";
import { cappedInteger, consumeDailyLimit } from "@/lib/usage-limits";
import { createEventNotification } from "@/lib/notifications";
import { isLikelyHumanBrowser } from "@/lib/view-policy";

const VIEWER_COOKIE = "ui_invoice_viewer";

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

function responseWithViewer(viewer: string, isNew: boolean) {
  const response = new NextResponse(null, { status: 204 });
  if (isNew) {
    response.cookies.set(VIEWER_COOKIE, viewer, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });
  }
  return response;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (process.env.INVOICE_VIEW_TRACKING_ENABLED?.toLowerCase() !== "true") {
    return new NextResponse(null, { status: 204 });
  }
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!isLikelyHumanBrowser(userAgent)) {
    return new NextResponse(null, { status: 204 });
  }

  const { token } = await context.params;
  const hosted = await loadHostedInvoice(token);
  if (!hosted) return new NextResponse(null, { status: 204 });

  const signedIn = await getRealSessionUser();
  if (signedIn) {
    const owner = hosted.invoice.contractor.userId === signedIn.id;
    const member = owner
      ? true
      : Boolean(await db.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: hosted.invoice.workspaceId,
              userId: signedIn.id,
            },
          },
        }));
    if (owner || member) return new NextResponse(null, { status: 204 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const existingViewer = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${VIEWER_COOKIE}=`))
    ?.slice(VIEWER_COOKIE.length + 1);
  const viewer = existingViewer && /^[a-f0-9]{64}$/.test(existingViewer) ? existingViewer : createToken();
  const day = new Date().toISOString().slice(0, 10);
  const dedupeKey = `hosted-view:${hosted.invoice.id}:${day}:${hashToken(viewer)}`;
  const seen = await db.invoiceEvent.findUnique({ where: { dedupeKey }, select: { id: true } });
  if (seen) return responseWithViewer(viewer, !existingViewer);

  const globalAllowed = await consumeDailyLimit({
    operation: "hosted_invoice_view",
    scope: "global",
    scopeKey: "all",
    limit: cappedInteger(process.env.VIEW_EVENTS_GLOBAL_DAILY_LIMIT, 1_000, 5_000),
  });
  if (!globalAllowed) return responseWithViewer(viewer, !existingViewer);
  const invoiceAllowed = await consumeDailyLimit({
    operation: "hosted_invoice_view",
    scope: "invoice",
    scopeKey: hosted.invoice.id,
    limit: cappedInteger(process.env.VIEW_EVENTS_PER_INVOICE_DAILY_LIMIT, 50, 100),
  });
  if (!invoiceAllowed) return responseWithViewer(viewer, !existingViewer);

  const now = new Date();
  let first = false;
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "uncleinvoice"."Invoice" WHERE "id" = ${hosted.invoice.id} FOR UPDATE`;
      const current = await tx.invoice.findUniqueOrThrow({ where: { id: hosted.invoice.id } });
      first = !current.firstViewedAt;
      await tx.invoiceEvent.create({
        data: {
          invoiceId: hosted.invoice.id,
          type: first ? "first_viewed" : "viewed",
          source: "hosted_invoice",
          dedupeKey,
          message: first ? "Hosted invoice link opened for the first time." : "Hosted invoice link opened again.",
        },
      });
      await tx.invoice.update({
        where: { id: hosted.invoice.id },
        data: {
          firstViewedAt: current.firstViewedAt ?? now,
          lastViewedAt: now,
          approximateViewCount: { increment: 1 },
        },
      });
      await tx.hostedInvoiceAccess.update({ where: { id: hosted.access.id }, data: { lastAccessAt: now } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
  if (first && hosted.invoice.contractor.userId) {
    await createEventNotification({
      userId: hosted.invoice.contractor.userId,
      invoiceId: hosted.invoice.id,
      eventType: "invoice_viewed",
      dedupeKey: `notification:first-view:${hosted.invoice.id}`,
      title: "Invoice opened",
      body: `The hosted link for invoice ${hosted.invoice.number} was opened.`,
    });
  }
  return responseWithViewer(viewer, !existingViewer);
}
