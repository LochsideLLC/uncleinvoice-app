import Stripe from "stripe";
import { PLAN_LABEL, PLAN_PRICE_CENTS, asPaidPlan, type PaidPlan } from "@/lib/plan";

export class StripeConfigurationError extends Error {}

function required(name: "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) throw new StripeConfigurationError(`${name} is not configured`);
  return value;
}

export function stripeClient() {
  const key = stripeTestSecretKey(process.env.STRIPE_SECRET_KEY);
  return new Stripe(key);
}

export function stripeTestSecretKey(value?: string) {
  const key = value?.trim();
  if (!key) throw new StripeConfigurationError("STRIPE_SECRET_KEY is not configured");
  if (!/^(?:sk|rk)_test_/.test(key)) {
    throw new StripeConfigurationError("STRIPE_SECRET_KEY must be a Stripe test-mode key");
  }
  return key;
}

export function stripeWebhookSecret() {
  const secret = required("STRIPE_WEBHOOK_SECRET");
  if (!secret.startsWith("whsec_")) {
    throw new StripeConfigurationError("STRIPE_WEBHOOK_SECRET is not a Stripe webhook signing secret");
  }
  return secret;
}

export function checkoutLineItem(plan: PaidPlan): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: PLAN_PRICE_CENTS[plan],
      recurring: { interval: "month" },
      product_data: { name: `Uncle Invoice ${PLAN_LABEL[plan]}` },
    },
  };
}

export function paidPlanFromMetadata(metadata: Stripe.Metadata | null): PaidPlan | null {
  return asPaidPlan(metadata?.plan);
}
