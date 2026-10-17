import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { asPaidPlan } from "@/lib/plan";
import { canRequestPlan } from "@/lib/upgrade";
import { StripeConfigurationError, checkoutLineItem, stripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const form = await request.formData();
  const plan = asPaidPlan(String(form.get("plan") ?? ""));
  if (!plan || !canRequestPlan(user.plan, plan)) {
    return NextResponse.json({ error: "That plan is not available for this account" }, { status: 400 });
  }

  try {
    const stripe = stripeClient();
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      allowed_payment_method_types: ["card"],
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [checkoutLineItem(plan)],
      metadata: { userId: user.id, plan },
      subscription_data: { metadata: { userId: user.id, plan } },
      success_url: `${origin}/app/plans?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/plans?checkout=canceled`,
    });
    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
    }
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Unable to create Stripe checkout session", error);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 502 });
  }
}
