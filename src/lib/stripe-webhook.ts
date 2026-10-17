import type Stripe from "stripe";
import { db } from "@/lib/db";
import { PLAN_PRICE_CENTS } from "@/lib/plan";
import { paidPlanFromMetadata } from "@/lib/stripe";

const LAPSED_STATUSES = new Set<Stripe.Subscription.Status>([
  "canceled",
  "incomplete_expired",
  "paused",
  "unpaid",
]);

async function grantPaidPlan(session: Stripe.Checkout.Session, created: number) {
  const plan = paidPlanFromMetadata(session.metadata);
  const userId = session.client_reference_id;
  if (
    !plan ||
    !userId ||
    session.metadata?.userId !== userId ||
    session.mode !== "subscription" ||
    session.payment_status !== "paid" ||
    session.currency !== "usd" ||
    session.amount_total !== PLAN_PRICE_CENTS[plan]
  ) return;

  const changedAt = new Date(created * 1000);
  await db.user.updateMany({
    where: {
      id: userId,
      archivedAt: null,
      OR: [{ planSetAt: null }, { planSetAt: { lte: changedAt } }],
    },
    data: { plan, planSetAt: changedAt },
  });
}

async function removeLapsedPlan(subscription: Stripe.Subscription, created: number) {
  const plan = paidPlanFromMetadata(subscription.metadata);
  const userId = subscription.metadata.userId;
  if (!plan || !userId || !LAPSED_STATUSES.has(subscription.status)) return;

  const changedAt = new Date(created * 1000);
  await db.user.updateMany({
    where: {
      id: userId,
      plan,
      archivedAt: null,
      OR: [{ planSetAt: null }, { planSetAt: { lte: changedAt } }],
    },
    data: { plan: "free", planSetAt: changedAt },
  });
}

export async function applyStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await grantPaidPlan(event.data.object, event.created);
      break;
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.updated":
      await removeLapsedPlan(event.data.object, event.created);
      break;
  }
}
