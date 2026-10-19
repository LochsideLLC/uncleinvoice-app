import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loadHostedInvoice } from "@/lib/hosted-invoices";
import { StripeConfigurationError, stripeClient } from "@/lib/stripe";
import { assertStripeConnectEnabled } from "@/lib/stripe-connect";
import { cappedInteger, consumeDailyLimit } from "@/lib/usage-limits";
import { checkoutMatchesBalance } from "@/lib/payment-state";

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const { token } = await context.params;
  const hosted = await loadHostedInvoice(token);
  if (!hosted) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!hosted.eligibility.eligible) {
    return NextResponse.json({ error: hosted.eligibility.reason }, { status: 409 });
  }
  if (!hosted.account) return NextResponse.json({ error: "Connect Stripe first" }, { status: 409 });

  try {
    assertStripeConnectEnabled();
    const stripe = stripeClient();
    const activeKey = `invoice:${hosted.invoice.id}`;
    let attempt = await db.checkoutAttempt.findUnique({ where: { activeKey } });
    const matchesBalance = (item: NonNullable<typeof attempt>) => checkoutMatchesBalance(item, {
      balance: hosted.eligibility.balance,
      currency: hosted.invoice.currency,
      connectedAccountId: hosted.account!.id,
    });

    if (attempt?.stripeCheckoutSessionId) {
      const prior = await stripe.checkout.sessions.retrieve(
        attempt.stripeCheckoutSessionId,
        {},
        { stripeAccount: hosted.account.stripeAccountId },
      );
      if (prior.status === "open" && prior.url && matchesBalance(attempt)) {
        return NextResponse.redirect(prior.url, 303);
      }
      if (prior.status === "complete") {
        return NextResponse.json({ error: "A payment is being checked. Try again shortly." }, { status: 409 });
      }
      if (prior.status === "open") {
        await stripe.checkout.sessions.expire(
          prior.id,
          {},
          { stripeAccount: hosted.account.stripeAccountId },
        );
      }
      await db.checkoutAttempt.update({
        where: { id: attempt.id },
        data: { activeKey: null, status: prior.status ?? "closed" },
      });
      attempt = null;
    }
    if (attempt && !matchesBalance(attempt)) {
      return NextResponse.json({ error: "A payment link is being prepared. Try again shortly." }, { status: 409 });
    }

    if (!attempt) {
      const globalAllowed = await consumeDailyLimit({
        operation: "checkout_session",
        scope: "global",
        scopeKey: "all",
        limit: cappedInteger(process.env.CHECKOUT_GLOBAL_DAILY_LIMIT, 1000, 1000),
      });
      const userAllowed = globalAllowed && await consumeDailyLimit({
        operation: "checkout_session",
        scope: "user",
        scopeKey: hosted.invoice.contractor.userId!,
        limit: cappedInteger(process.env.CHECKOUT_PER_USER_DAILY_LIMIT, 20, 20),
      });
      if (!userAllowed) return NextResponse.json({ error: "Payment links are paused for today." }, { status: 429 });
      try {
        attempt = await db.checkoutAttempt.create({
          data: {
            invoiceId: hosted.invoice.id,
            connectedAccountId: hosted.account.id,
            idempotencyKey: `invoice-checkout:${hosted.invoice.id}:${randomUUID()}`,
            activeKey,
            amount: hosted.eligibility.balance,
            currency: hosted.invoice.currency,
          },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
        attempt = await db.checkoutAttempt.findUnique({ where: { activeKey } });
        if (!attempt) throw error;
      }
    }

    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        allowed_payment_method_types: ["card"],
        client_reference_id: hosted.invoice.id,
        customer_email: hosted.invoice.workspace.email ?? undefined,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: hosted.invoice.currency,
              unit_amount: attempt.amount,
              product_data: {
                name: `Invoice ${hosted.invoice.number}`,
                description: `From ${hosted.invoice.contractor.name}`,
              },
            },
          },
        ],
        metadata: {
          invoiceId: hosted.invoice.id,
          checkoutAttemptId: attempt.id,
          connectedAccountRecordId: hosted.account.id,
        },
        payment_intent_data: {
          metadata: {
            invoiceId: hosted.invoice.id,
            checkoutAttemptId: attempt.id,
            connectedAccountRecordId: hosted.account.id,
          },
        },
        success_url: `${origin}/i/${token}?payment=processing&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/i/${token}?payment=canceled`,
        submit_type: "pay",
      },
      {
        idempotencyKey: attempt.idempotencyKey,
        stripeAccount: hosted.account.stripeAccountId,
      },
    );
    if (session.livemode || !session.url) {
      throw new StripeConfigurationError("Stripe did not return a safe test Checkout URL");
    }
    await db.$transaction([
      db.checkoutAttempt.update({
        where: { id: attempt.id },
        data: {
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
          status: session.status ?? "open",
          expiresAt: new Date(session.expires_at * 1000),
        },
      }),
      db.invoiceEvent.upsert({
        where: { dedupeKey: `payment-initiated:${attempt.id}` },
        update: {},
        create: {
          invoiceId: hosted.invoice.id,
          type: "payment_initiated",
          source: "stripe",
          dedupeKey: `payment-initiated:${attempt.id}`,
          message: "Customer opened Stripe Checkout.",
        },
      }),
    ]);
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Unable to create connected Stripe Checkout session", error);
    return NextResponse.json({ error: "Unable to start payment" }, { status: 502 });
  }
}
