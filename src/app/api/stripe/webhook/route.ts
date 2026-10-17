import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { applyStripeEvent } from "@/lib/stripe-webhook";
import {
  StripeConfigurationError,
  stripeClient,
  stripeWebhookSecret,
} from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const stripe = stripeClient();
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      stripeWebhookSecret(),
    );
  } catch (error) {
    const message = error instanceof StripeConfigurationError ? error.message : "Invalid Stripe signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.livemode) {
    return NextResponse.json({ error: "Live-mode Stripe events are not accepted" }, { status: 400 });
  }

  await applyStripeEvent(event);

  return NextResponse.json({ received: true });
}
