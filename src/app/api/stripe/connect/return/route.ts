import { NextResponse } from "next/server";
import { getRealSessionUser } from "@/lib/auth";
import { syncConnectedAccount } from "@/lib/stripe-connect";

export async function GET(request: Request) {
  const user = await getRealSessionUser();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/app/payments");
    return NextResponse.redirect(login, 303);
  }
  try {
    await syncConnectedAccount(user.id);
    return NextResponse.redirect(new URL("/app/payments?connect=returned", request.url), 303);
  } catch (error) {
    console.error("Unable to sync Stripe account after onboarding", error);
    return NextResponse.redirect(new URL("/app/payments?connect=error", request.url), 303);
  }
}
