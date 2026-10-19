import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { StripeConfigurationError, stripeClient } from "@/lib/stripe";
import { stripeConnectWebhookSecret } from "@/lib/stripe-connect";
import { applyStripeConnectEvent } from "@/lib/stripe-connect-webhook";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripeClient().webhooks.constructEventAsync(
      await request.text(),
      signature,
      stripeConnectWebhookSecret(),
    );
  } catch (error) {
    const message = error instanceof StripeConfigurationError ? error.message : "Invalid Stripe signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (event.livemode) {
    console.error("Live Stripe Connect event reached the test-only webhook", event.id);
    return NextResponse.json({ received: true, ignored: true });
  }
  await applyStripeConnectEvent(event);
  return NextResponse.json({ received: true });
}
