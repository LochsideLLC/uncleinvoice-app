import "server-only";

import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";
import { isSafeConnectConfiguration, syncConnectedAccount } from "@/lib/stripe-connect";
import { createEventNotification } from "@/lib/notifications";
import { classifyStripePayment, netPaidAmount } from "@/lib/payment-state";
import { formatMoney } from "@/lib/money";

type ProcessResult = { duplicate?: boolean; ignored?: boolean };
class WebhookValidationError extends Error {}

async function claimEvent(event: Stripe.Event) {
  const stripeAccountId = typeof event.account === "string" ? event.account : null;
  const connected = stripeAccountId
    ? await db.stripeConnectedAccount.findUnique({ where: { stripeAccountId } })
    : null;
  try {
    return await db.stripeConnectEvent.create({
      data: {
        stripeEventId: event.id,
        connectedAccountId: connected?.id,
        stripeAccountId,
        eventType: event.type,
        objectId: "id" in event.data.object ? String(event.data.object.id) : null,
        livemode: event.livemode,
        eventCreatedAt: new Date(event.created * 1000),
        status: "processing",
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    const prior = await db.stripeConnectEvent.findUniqueOrThrow({ where: { stripeEventId: event.id } });
    if (["processed", "ignored", "quarantined"].includes(prior.status)) return null;
    if (prior.attemptCount >= 8) {
      await db.stripeConnectEvent.update({
        where: { id: prior.id },
        data: { status: "quarantined", processingError: "Retry limit reached; manual review required" },
      });
      return null;
    }
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
    const claimed = await db.stripeConnectEvent.updateMany({
      where: {
        id: prior.id,
        OR: [
          { status: "failed" },
          { status: "received" },
          { status: "processing", processingStartedAt: { lt: staleBefore } },
        ],
      },
      data: { status: "processing", processingStartedAt: new Date(), processingError: null, attemptCount: { increment: 1 } },
    });
    if (!claimed.count) throw new Error("Stripe event is already being processed; retry later");
    return prior;
  }
}

async function reconcilePaymentIntent(args: {
  stripeAccountId: string;
  paymentIntentId: string;
  eventId: string;
}) {
  const stripe = stripeClient();
  const intent = await stripe.paymentIntents.retrieve(
    args.paymentIntentId,
    { expand: ["latest_charge"] },
    { stripeAccount: args.stripeAccountId },
  );
  if (intent.livemode) throw new WebhookValidationError("Live payment intent rejected");
  const attemptId = intent.metadata.checkoutAttemptId;
  const invoiceId = intent.metadata.invoiceId;
  const connectedAccountRecordId = intent.metadata.connectedAccountRecordId;
  if (!attemptId || !invoiceId || !connectedAccountRecordId) {
    throw new WebhookValidationError("Payment intent is missing Uncle Invoice metadata");
  }
  const attempt = await db.checkoutAttempt.findUnique({
    where: { id: attemptId },
    include: {
      connectedAccount: true,
      invoice: {
        include: { lineItems: true, contractor: { select: { userId: true } } },
      },
    },
  });
  if (
    !attempt ||
    attempt.invoiceId !== invoiceId ||
    attempt.connectedAccountId !== connectedAccountRecordId ||
    attempt.connectedAccount.stripeAccountId !== args.stripeAccountId ||
    attempt.invoice.contractor.userId !== attempt.connectedAccount.userId ||
    !isSafeConnectConfiguration(attempt.connectedAccount)
  ) {
    throw new WebhookValidationError("Payment intent ownership check failed");
  }
  if (intent.amount !== attempt.amount || intent.currency !== attempt.currency) {
    throw new WebhookValidationError("Payment intent amount or currency does not match the invoice checkout");
  }

  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const refundedAmount = charge?.amount_refunded ?? 0;
  const disputes = charge?.disputed
    ? await stripe.disputes.list({ charge: charge.id, limit: 10 }, { stripeAccount: args.stripeAccountId })
    : null;
  const disputed = Boolean(disputes?.data.some((dispute) =>
    dispute.status !== "won" && dispute.status !== "warning_closed"));
  const status = classifyStripePayment({
    intentStatus: intent.status,
    amountReceived: intent.amount_received,
    refundedAmount,
    disputed,
    hasFailure: Boolean(intent.last_payment_error),
  });
  const newNet = netPaidAmount(status, intent.amount_received, refundedAmount);
  const now = new Date();
  const terminal = ["succeeded", "failed", "partially_refunded", "fully_refunded", "disputed"].includes(status);
  const paidAt = charge && intent.status === "succeeded" ? new Date(charge.created * 1000) : null;

  const previousStatus = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "uncleinvoice"."Invoice" WHERE "id" = ${invoiceId} FOR UPDATE`;
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const previous = await tx.invoicePayment.findUnique({ where: { stripePaymentIntentId: intent.id } });
    const previousNet = previous ? netPaidAmount(previous.status, previous.amount, previous.refundedAmount) : 0;
    await tx.invoicePayment.upsert({
      where: { stripePaymentIntentId: intent.id },
      update: {
        status,
        amount: intent.status === "succeeded" ? intent.amount_received : intent.amount,
        refundedAmount,
        currency: intent.currency,
        paymentMethodCategory: charge?.payment_method_details?.type ?? null,
        stripeChargeId: charge?.id ?? previous?.stripeChargeId,
        failureCode: intent.last_payment_error?.code ?? null,
        failureMessage: intent.last_payment_error?.message ?? null,
        succeededAt: paidAt ?? previous?.succeededAt,
        failedAt: status === "failed" ? now : null,
        disputedAt: status === "disputed" ? now : null,
      },
      create: {
        invoiceId,
        source: "stripe",
        status,
        amount: intent.status === "succeeded" ? intent.amount_received : intent.amount,
        refundedAmount,
        currency: intent.currency,
        paymentMethodCategory: charge?.payment_method_details?.type ?? null,
        stripeAccountId: args.stripeAccountId,
        stripePaymentIntentId: intent.id,
        stripeChargeId: charge?.id ?? null,
        failureCode: intent.last_payment_error?.code ?? null,
        failureMessage: intent.last_payment_error?.message ?? null,
        initiatedAt: new Date(intent.created * 1000),
        succeededAt: paidAt,
        failedAt: status === "failed" ? now : null,
        disputedAt: status === "disputed" ? now : null,
      },
    });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: Math.max(0, invoice.amountPaid + newNet - previousNet) },
    });
    await tx.checkoutAttempt.update({
      where: { id: attempt.id },
      data: {
        stripePaymentIntentId: intent.id,
        status,
        activeKey: terminal ? null : attempt.activeKey,
        completedAt: terminal ? now : null,
      },
    });
    await tx.invoiceEvent.upsert({
      where: { dedupeKey: `stripe:${args.eventId}:${status}` },
      update: {},
      create: {
        invoiceId,
        type: previous?.status === "disputed" && status === "succeeded"
          ? "payment_dispute_resolved"
          : status === "succeeded" ? "payment_succeeded" : `payment_${status}`,
        source: "stripe",
        dedupeKey: `stripe:${args.eventId}:${status}`,
        message:
          status === "succeeded"
            ? previous?.status === "disputed" ? "Stripe reports that the dispute was resolved." : "Stripe confirmed the payment."
            : status === "failed"
              ? "Stripe reported that the payment failed."
              : status === "disputed"
                ? "Stripe reported a payment dispute."
                : status === "partially_refunded"
                  ? "Stripe reported a partial refund."
                  : status === "fully_refunded"
                    ? "Stripe reported a full refund."
                    : "Stripe is processing the payment.",
        metadata: { stripePaymentIntentId: intent.id },
      },
    });
    return previous?.status ?? null;
  });

  const ownerUserId = attempt.invoice.contractor.userId;
  if (!ownerUserId) return;
  if (status === "succeeded" && !["succeeded", "disputed", "partially_refunded", "fully_refunded"].includes(previousStatus ?? "")) {
    await createEventNotification({
      userId: ownerUserId,
      invoiceId,
      eventType: "payment_received",
      dedupeKey: `notification:payment-received:${intent.id}`,
      title: "Payment received",
      body: `${formatMoney(intent.amount_received)} paid for invoice ${attempt.invoice.number}.`,
    });
  } else if (status === "failed" && previousStatus !== "failed") {
    await createEventNotification({
      userId: ownerUserId,
      invoiceId,
      eventType: "payment_failed",
      dedupeKey: `notification:payment-failed:${args.eventId}`,
      title: "Payment failed",
      body: `A Stripe payment for ${attempt.invoice.number} failed.`,
    });
  } else if (["partially_refunded", "fully_refunded", "disputed"].includes(status) && previousStatus !== status) {
    await createEventNotification({
      userId: ownerUserId,
      invoiceId,
      eventType: status === "disputed" ? "payment_disputed" : "payment_refunded",
      dedupeKey: `notification:${status}:${args.eventId}`,
      title: status === "disputed" ? "Payment disputed" : "Payment refunded",
      body: `Stripe changed the payment status for ${attempt.invoice.number}.`,
    });
  }
}

async function paymentIntentIdFromObject(raw: Stripe.Event.Data.Object, stripeAccountId: string) {
  const object = raw as unknown as {
    object?: string;
    id?: string;
    payment_intent?: string | { id: string } | null;
    charge?: string | { id: string } | null;
  };
  if (object.object === "payment_intent") return object.id ?? null;
  if (object.object === "checkout.session") {
    return typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id ?? null;
  }
  if (object.object === "charge") {
    return typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id ?? null;
  }
  if (object.object === "dispute") {
    const intentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
    if (intentId) return intentId;
  }
  if (object.object === "refund") {
    const intentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
    if (intentId) return intentId;
  }
  if (object.object === "dispute" || object.object === "refund") {
    const chargeId = typeof object.charge === "string" ? object.charge : object.charge?.id;
    if (!chargeId) return null;
    const charge = await stripeClient().charges.retrieve(chargeId, {}, { stripeAccount: stripeAccountId });
    return typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
  }
  return null;
}

const PAYMENT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "payment_intent.processing",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "charge.dispute.funds_reinstated",
  "refund.created",
  "refund.updated",
]);

export async function applyStripeConnectEvent(event: Stripe.Event): Promise<ProcessResult> {
  if (event.livemode) throw new Error("Live-mode Stripe events are not accepted");
  const record = await claimEvent(event);
  if (!record) return { duplicate: true };
  try {
    const stripeAccountId = typeof event.account === "string" ? event.account : null;
    const connected = stripeAccountId
      ? await db.stripeConnectedAccount.findUnique({ where: { stripeAccountId } })
      : null;
    if (!stripeAccountId || !connected) {
      await db.stripeConnectEvent.update({
        where: { id: record.id },
        data: { status: "quarantined", processedAt: new Date(), processingError: "Unknown connected account; manual review required" },
      });
      return { ignored: true };
    }

    const object = event.data.object;
    if (event.type === "account.updated") {
      await syncConnectedAccount(connected.userId);
    } else if (event.type === "checkout.session.expired" && object.object === "checkout.session") {
      const attemptId = object.metadata?.checkoutAttemptId;
      if (attemptId) {
        await db.checkoutAttempt.updateMany({
          where: { id: attemptId, connectedAccountId: connected.id },
          data: { status: "expired", activeKey: null, completedAt: new Date() },
        });
      }
    } else if (PAYMENT_EVENTS.has(event.type)) {
      const paymentIntentId = await paymentIntentIdFromObject(object, stripeAccountId);
      if (paymentIntentId) {
        await reconcilePaymentIntent({
          stripeAccountId,
          paymentIntentId,
          eventId: event.id,
        });
      }
    }

    await db.stripeConnectEvent.update({
      where: { id: record.id },
      data: { status: "processed", processedAt: new Date(), processingError: null },
    });
    return {};
  } catch (error) {
    const permanent = error instanceof WebhookValidationError;
    await db.stripeConnectEvent.update({
      where: { id: record.id },
      data: {
        status: permanent ? "quarantined" : "failed",
        processingError: error instanceof Error ? error.message.slice(0, 500) : "Unknown processing error",
      },
    });
    if (permanent) {
      console.error("Stripe Connect event quarantined", event.id, error.message);
      return { ignored: true };
    }
    throw error;
  }
}
