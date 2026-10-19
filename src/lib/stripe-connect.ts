import "server-only";

import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import {
  StripeConfigurationError,
  stripeClient,
  stripeTestSecretKey,
} from "@/lib/stripe";
import {
  isSafeConnectConfiguration,
  REQUIRED_CONNECT_CONFIGURATION,
  type ConnectConfigurationSnapshot,
} from "@/lib/payment-policy";

export { isSafeConnectConfiguration, REQUIRED_CONNECT_CONFIGURATION } from "@/lib/payment-policy";

export function stripeConnectEnabled() {
  return process.env.STRIPE_CONNECT_ENABLED?.trim().toLowerCase() === "true";
}

export function assertStripeConnectEnabled() {
  stripeTestSecretKey(process.env.STRIPE_SECRET_KEY);
  if (!stripeConnectEnabled()) {
    throw new StripeConfigurationError("Stripe Connect is paused");
  }
}

export function stripeConnectWebhookSecret() {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new StripeConfigurationError("STRIPE_CONNECT_WEBHOOK_SECRET is not configured");
  }
  if (!secret.startsWith("whsec_")) {
    throw new StripeConfigurationError(
      "STRIPE_CONNECT_WEBHOOK_SECRET is not a Stripe webhook signing secret",
    );
  }
  return secret;
}

function configurationSnapshot(account: Stripe.V2.Core.Account): ConnectConfigurationSnapshot {
  return {
    dashboardType: account.dashboard ?? null,
    feesCollector: account.defaults?.responsibilities.fees_collector ?? null,
    lossesCollector: account.defaults?.responsibilities.losses_collector ?? null,
    requirementsCollector: account.defaults?.responsibilities.requirements_collector ?? null,
    cardPaymentsStatus: account.configuration?.merchant?.capabilities?.card_payments?.status ?? null,
    requirements: account.requirements ?? null,
  };
}

function firstRequirementReason(snapshot: ConnectConfigurationSnapshot) {
  if (!snapshot.requirements || typeof snapshot.requirements !== "object") return null;
  const entries = (snapshot.requirements as { entries?: Array<{ description?: string }> }).entries;
  return entries?.find((entry) => entry.description)?.description ?? null;
}

function jsonValue(value: unknown) {
  return value == null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

export async function syncConnectedAccount(userId: string) {
  assertStripeConnectEnabled();
  const saved = await db.stripeConnectedAccount.findUnique({ where: { userId } });
  if (!saved) return null;

  const stripe = stripeClient();
  const [account, legacy] = await Promise.all([
    stripe.v2.core.accounts.retrieve(saved.stripeAccountId, {
      include: ["configuration.merchant", "defaults", "requirements"],
    }),
    stripe.accounts.retrieve(saved.stripeAccountId),
  ]);
  const snapshot = configurationSnapshot(account);
  const configurationSafe = isSafeConnectConfiguration(snapshot);

  return db.stripeConnectedAccount.update({
    where: { id: saved.id },
    data: {
      dashboardType: snapshot.dashboardType ?? "unknown",
      feesCollector: snapshot.feesCollector ?? "unknown",
      lossesCollector: snapshot.lossesCollector ?? "unknown",
      requirementsCollector: snapshot.requirementsCollector ?? "unknown",
      cardPaymentsStatus: snapshot.cardPaymentsStatus,
      chargesEnabled: configurationSafe && legacy.charges_enabled,
      payoutsEnabled: configurationSafe && legacy.payouts_enabled,
      detailsSubmitted: legacy.details_submitted,
      requirements: jsonValue(snapshot.requirements),
      disabledReason: configurationSafe
        ? firstRequirementReason(snapshot)
        : "Stripe account responsibility settings do not meet Uncle Invoice safety rules.",
      disconnectedAt: null,
      lastSyncedAt: new Date(),
    },
  });
}

export async function getOrCreateConnectedAccount(user: {
  id: string;
  email: string;
  name: string;
  businessName: string | null;
}) {
  assertStripeConnectEnabled();
  const existing = await db.stripeConnectedAccount.findUnique({ where: { userId: user.id } });
  if (existing) return (await syncConnectedAccount(user.id)) ?? existing;

  const stripe = stripeClient();
  const account = await stripe.v2.core.accounts.create(
    {
      contact_email: user.email,
      display_name: user.businessName?.trim() || user.name,
      identity: { country: "us" },
      dashboard: REQUIRED_CONNECT_CONFIGURATION.dashboardType,
      defaults: {
        currency: "usd",
        responsibilities: {
          fees_collector: REQUIRED_CONNECT_CONFIGURATION.feesCollector,
          losses_collector: REQUIRED_CONNECT_CONFIGURATION.lossesCollector,
        },
      },
      configuration: {
        merchant: {
          capabilities: { card_payments: { requested: true } },
        },
      },
      include: ["configuration.merchant", "defaults", "requirements"],
      metadata: { uncleInvoiceUserId: user.id },
    },
    { idempotencyKey: `uncleinvoice-connect-account:${user.id}` },
  );
  const snapshot = configurationSnapshot(account);
  if (!isSafeConnectConfiguration(snapshot)) {
    throw new StripeConfigurationError(
      "Stripe did not create the required fee and loss responsibility settings",
    );
  }

  await db.stripeConnectedAccount.create({
    data: {
      userId: user.id,
      stripeAccountId: account.id,
      dashboardType: snapshot.dashboardType!,
      feesCollector: snapshot.feesCollector!,
      lossesCollector: snapshot.lossesCollector!,
      requirementsCollector: snapshot.requirementsCollector!,
      cardPaymentsStatus: snapshot.cardPaymentsStatus,
      requirements: jsonValue(snapshot.requirements),
    },
  });
  return (await syncConnectedAccount(user.id))!;
}

export async function createConnectedAccountLink(args: {
  accountId: string;
  origin: string;
}) {
  assertStripeConnectEnabled();
  const stripe = stripeClient();
  const link = await stripe.v2.core.accountLinks.create({
    account: args.accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        collection_options: { fields: "eventually_due", future_requirements: "include" },
        refresh_url: `${args.origin}/api/stripe/connect/refresh`,
        return_url: `${args.origin}/api/stripe/connect/return`,
      },
    },
  });
  if (link.livemode) {
    throw new StripeConfigurationError("Live Stripe onboarding is not allowed");
  }
  return link.url;
}

export function stripeTestDashboardUrl() {
  return "https://dashboard.stripe.com/test";
}
