import { NextResponse } from "next/server";
import { getRealSessionUser } from "@/lib/auth";
import { createHostedInvoiceAccess } from "@/lib/hosted-invoices";

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await getRealSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { invoiceId } = await context.params;
  const form = await request.formData();
  try {
    const hosted = await createHostedInvoiceAccess({
      invoiceId,
      ownerUserId: user.id,
      collectPayment: form.get("collectPayment") === "on",
      confirmedBalanceDue: form.get("confirmedBalanceDue") === "on",
    });
    return NextResponse.json({ url: new URL(hosted.urlPath, request.url).toString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create hosted link";
    return NextResponse.json({ error: message }, { status: message === "Invoice not found" ? 404 : 409 });
  }
}
