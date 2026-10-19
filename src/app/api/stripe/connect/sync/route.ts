import { NextResponse } from "next/server";
import { getRealSessionUser } from "@/lib/auth";
import { StripeConfigurationError } from "@/lib/stripe";
import { syncConnectedAccount } from "@/lib/stripe-connect";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const user = await getRealSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    await syncConnectedAccount(user.id);
    return NextResponse.redirect(new URL("/app/payments?connect=synced", request.url), 303);
  } catch (error) {
    const message = error instanceof StripeConfigurationError ? error.message : "Unable to check Stripe";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
