import { NextResponse } from "next/server";
import { getRealSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const user = await getRealSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const account = await db.stripeConnectedAccount.findUnique({ where: { userId: user.id } });
  if (!account) return NextResponse.redirect(new URL("/app/payments", request.url), 303);
  const attempts = await db.checkoutAttempt.count({ where: { connectedAccountId: account.id } });
  if (attempts) {
    return NextResponse.redirect(new URL("/app/payments?connect=disconnect-blocked", request.url), 303);
  }
  await db.$transaction(async (tx) => {
    await tx.stripeConnectedAccount.update({
      where: { id: account.id },
      data: { disconnectedAt: new Date(), chargesEnabled: false },
    });
    await tx.invoice.updateMany({
      where: { contractor: { userId: user.id }, onlinePaymentEnabled: true },
      data: { onlinePaymentEnabled: false },
    });
  });
  return NextResponse.redirect(new URL("/app/payments?connect=disconnected", request.url), 303);
}
