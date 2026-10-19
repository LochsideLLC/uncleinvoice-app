import { NextResponse } from "next/server";
import { getRealSessionUser } from "@/lib/auth";
import { StripeConfigurationError } from "@/lib/stripe";
import {
  createConnectedAccountLink,
  getOrCreateConnectedAccount,
} from "@/lib/stripe-connect";

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
    const account = await getOrCreateConnectedAccount(user);
    const url = await createConnectedAccountLink({
      accountId: account.stripeAccountId,
      origin: new URL(request.url).origin,
    });
    return NextResponse.redirect(url, 303);
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Unable to start Stripe Connect onboarding", error);
    return NextResponse.json({ error: "Unable to start Stripe onboarding" }, { status: 502 });
  }
}
