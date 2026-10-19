import { NextResponse } from "next/server";
import { getRealSessionUser } from "@/lib/auth";
import { StripeConfigurationError } from "@/lib/stripe";
import {
  createConnectedAccountLink,
  syncConnectedAccount,
} from "@/lib/stripe-connect";

export async function GET(request: Request) {
  const user = await getRealSessionUser();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/app/payments");
    return NextResponse.redirect(login, 303);
  }
  try {
    const account = await syncConnectedAccount(user.id);
    if (!account) return NextResponse.redirect(new URL("/app/payments", request.url), 303);
    const url = await createConnectedAccountLink({
      accountId: account.stripeAccountId,
      origin: new URL(request.url).origin,
    });
    return NextResponse.redirect(url, 303);
  } catch (error) {
    if (!(error instanceof StripeConfigurationError)) {
      console.error("Unable to refresh Stripe onboarding", error);
    }
    return NextResponse.redirect(new URL("/app/payments?connect=error", request.url), 303);
  }
}
